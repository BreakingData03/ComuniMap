import { useCallback, useMemo, useState } from 'react'
import { ApiError } from './api/client'
import * as reportsApi from './api/reports'
import { AuthScreen } from './components/AuthScreen'
import { Feed } from './components/Feed'
import { CharityForm } from './components/forms/CharityForm'
import { EventForm } from './components/forms/EventForm'
import { RiskForm } from './components/forms/RiskForm'
import { Header } from './components/Header'
import { MapView } from './components/MapView'
import { useAuth } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import { useDeleteReport, useReportCache, useReports, useUpvoteReport } from './hooks/useReports'
import { removerAcentos } from './lib/streets'
import type { Filter, FormMode, LatLng, MapPick, Report, ReportCreate } from './types'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'perigo', label: '⚠️ Perigos' },
  { key: 'caridade', label: '🤝 Caridades' },
  { key: 'evento', label: '🥳 Eventos' },
  { key: 'comunidade', label: '🏘️ Comunidade' },
]

const FILTER_ACTIVE =
  'bg-emerald-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shadow-md'
const FILTER_IDLE =
  'bg-slate-800 text-slate-300 hover:bg-slate-700 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all border border-slate-700/50'

const TAB_ACTIVE =
  'flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all'
const TAB_IDLE =
  'flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800/60 text-slate-400 border border-transparent flex items-center justify-center gap-2 transition-all'

const SUCCESS_MESSAGE: Record<Report['category'], string> = {
  perigo: 'Perigo cadastrado com sucesso!',
  caridade: 'Doação/Caridade publicada com sucesso!',
  evento: 'Ponto publicado com sucesso!',
  comunidade: 'Ponto publicado com sucesso!',
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente.'
}

export default function App() {
  const { status, user, logout } = useAuth()
  const showToast = useToast()
  const reportsQuery = useReports()
  const cache = useReportCache()
  const deleteReport = useDeleteReport()
  const upvoteReport = useUpvoteReport()

  /** A pessoa já clicou em "Ver ComuniMap" nesta sessão. */
  const [entered, setEntered] = useState(false)
  const [mobileTab, setMobileTab] = useState<'mapa' | 'lista'>('mapa')
  const [filter, setFilter] = useState<Filter>('todos')
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState<FormMode | null>(null)
  const [picking, setPicking] = useState<FormMode | null>(null)
  const [picked, setPicked] = useState<MapPick | null>(null)
  const [focus, setFocus] = useState<(LatLng & { seq: number }) | null>(null)
  const [highlight, setHighlight] = useState<{ id: string; seq: number } | null>(null)

  const authVisible = !entered || status !== 'authenticated'

  const allReports = reportsQuery.data?.items
  const reports = useMemo(() => {
    const termo = removerAcentos(search.trim())
    return (allReports ?? []).filter((item) => {
      const atendeFiltro = filter === 'todos' || item.category === filter
      const atendeBusca =
        !termo ||
        removerAcentos(item.title).includes(termo) ||
        removerAcentos(item.neighborhood).includes(termo) ||
        removerAcentos(item.street ?? '').includes(termo) ||
        removerAcentos(item.description).includes(termo)
      return atendeFiltro && atendeBusca
    })
  }, [allReports, filter, search])

  const focarPontoNoMapa = useCallback((point: LatLng) => {
    setMobileTab('mapa')
    setFocus({ lat: point.lat, lng: point.lng, seq: Date.now() })
  }, [])

  const verNaLista = useCallback((id: string) => {
    setMobileTab('lista')
    setHighlight({ id, seq: Date.now() })
  }, [])

  function irParaComuniMap() {
    setEntered(true)
    showToast('Bem-vindo ao ComuniMap!', 'info')
  }

  function fazerLogout() {
    logout()
    setEntered(false)
    setOpenModal(null)
    setPicking(null)
    showToast('Sessão encerrada.', 'info')
  }

  function startMapPicker(mode: FormMode) {
    setOpenModal(null)
    setPicking(mode)
    setMobileTab('mapa')
  }

  function onMapPick(point: LatLng) {
    if (!picking) return
    setPicked({ mode: picking, ...point, seq: Date.now() })
    setOpenModal(picking)
    setPicking(null)
  }

  /** Envia o registro (e a foto, se houver). Devolve true para o formulário se limpar. */
  async function submitReport(payload: ReportCreate, photo: File | null): Promise<boolean> {
    let report: Report
    try {
      report = await reportsApi.createReport(payload)
    } catch (err) {
      showToast(errorMessage(err), 'error')
      return false
    }

    if (report.merged) {
      // Regra dos 15 m: já havia um registro aberto igual aqui; a API somou uma confirmação.
      showToast('Já existe um registro igual neste local. Sua confirmação foi somada a ele.', 'info')
    } else {
      let photoFailed = false
      if (photo) {
        try {
          report = await reportsApi.uploadReportPhoto(report.id, photo)
          // A foto é processada em segundo plano; busca de novo para trazer a miniatura.
          window.setTimeout(() => void cache.refresh(), 4000)
        } catch (err) {
          photoFailed = true
          showToast(`Registro salvo, mas a foto não foi enviada: ${errorMessage(err)}`, 'error')
        }
      }
      if (!photoFailed) showToast(SUCCESS_MESSAGE[report.category], 'success')
    }

    cache.upsert(report)
    setOpenModal(null)
    focarPontoNoMapa(report)
    return true
  }

  function excluirLocal(id: string) {
    deleteReport.mutate(id, {
      onSuccess: () => showToast('Registro removido.', 'info'),
      onError: (err) => showToast(errorMessage(err), 'error'),
    })
  }

  function confirmarLocal(id: string) {
    upvoteReport.mutate(id, {
      onSuccess: () => showToast('Confirmação registrada. Obrigado!', 'success'),
      onError: (err) => showToast(errorMessage(err), 'error'),
    })
  }

  const formProps = (mode: FormMode) => ({
    open: openModal === mode,
    externalPick: picked?.mode === mode ? picked : null,
    onClose: () => setOpenModal(null),
    onRequestMapPick: () => startMapPicker(mode),
    onSubmit: submitReport,
  })

  return (
    <>
      {authVisible && <AuthScreen onEnter={irParaComuniMap} />}

      {/* BANNER DE AVISO DURANTE A SELEÇÃO NO MAPA */}
      {picking && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/80 flex items-center gap-3 max-w-[90vw]">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          <span className="text-xs sm:text-sm font-semibold text-emerald-300">Toque no local do mapa para marcar a posição!</span>
          <button
            type="button"
            onClick={() => {
              setOpenModal(picking)
              setPicking(null)
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            Cancelar
          </button>
        </div>
      )}

      <Header user={user} onOpenModal={setOpenModal} onLogout={fazerLogout} />

      {/* ALTERNADOR PARA DISPOSITIVOS MÓVEIS (MOBILE TABS) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-1.5 flex gap-1 px-4">
        <button type="button" onClick={() => setMobileTab('mapa')} className={mobileTab === 'mapa' ? TAB_ACTIVE : TAB_IDLE}>
          <i className="fa-solid fa-map"></i> Mapa
        </button>
        <button type="button" onClick={() => setMobileTab('lista')} className={mobileTab === 'lista' ? TAB_ACTIVE : TAB_IDLE}>
          <i className="fa-solid fa-list"></i> Lista de Locais (<span>{reports.length}</span>)
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL (MAPA + LISTA) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-0 overflow-hidden">
        {/* COLUNA DO MAPA (7 colunas no desktop) */}
        <section
          className={`${mobileTab === 'mapa' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 flex-col h-[calc(100vh-170px)] lg:h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-2.5 sm:p-3 relative shadow-2xl`}
        >
          {/* PAINEL DE FILTROS DO MAPA */}
          <div className="flex items-center gap-1.5 p-1 overflow-x-auto custom-scrollbar z-20 mb-2">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={filter === key ? FILTER_ACTIVE : FILTER_IDLE}
              >
                {label}
              </button>
            ))}
          </div>

          <MapView
            reports={reports}
            picking={picking !== null}
            onPick={onMapPick}
            focus={focus}
            layoutKey={`${mobileTab}-${authVisible}`}
            onShowInList={verNaLista}
          />
        </section>

        {/* COLUNA DE FEED E DETALHES (5 colunas no desktop) */}
        <section
          className={`${mobileTab === 'lista' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 flex-col h-[calc(100vh-170px)] lg:h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-4 sm:p-5 shadow-2xl overflow-hidden`}
        >
          <Feed
            reports={reports}
            loading={reportsQuery.isPending}
            error={reportsQuery.isError ? errorMessage(reportsQuery.error) : null}
            currentUserId={user?.id ?? null}
            highlight={highlight}
            search={search}
            onSearch={setSearch}
            onRetry={() => void reportsQuery.refetch()}
            onFocus={focarPontoNoMapa}
            onUpvote={confirmarLocal}
            onDelete={excluirLocal}
            onOpenModal={setOpenModal}
          />
        </section>
      </main>

      <RiskForm {...formProps('risco')} />
      <EventForm {...formProps('evento')} />
      <CharityForm {...formProps('caridade')} />
    </>
  )
}
