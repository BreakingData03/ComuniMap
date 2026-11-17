import { useEffect } from 'react'
import { mediaUrl } from '../api/client'
import { formatWhatsapp, reportColors, reportEmoji, reportSchedule, reportTag, STATUS_LABEL } from '../lib/format'
import type { FormMode, LatLng, Report } from '../types'

interface FeedProps {
  reports: Report[]
  loading: boolean
  error: string | null
  currentUserId: string | null
  /** Card a destacar ("Ver na Lista" no popup do mapa). */
  highlight: { id: string; seq: number } | null
  search: string
  onSearch: (value: string) => void
  onRetry: () => void
  onFocus: (point: LatLng) => void
  onUpvote: (id: string) => void
  onDelete: (id: string) => void
  onOpenModal: (mode: FormMode) => void
}

function EmptyState({ onOpenModal }: { onOpenModal: (mode: FormMode) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto py-12">
      <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center text-2xl text-slate-400 mb-3 border border-slate-800">
        <i className="fa-solid fa-map-location-dot"></i>
      </div>
      <h3 className="text-sm font-bold text-slate-300 mb-1">Nenhum local cadastrado</h3>
      <p className="text-xs text-slate-500 max-w-xs mb-4">
        Ainda não há registros nesta categoria. Seja o primeiro a mapear Três Lagoas!
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onOpenModal('risco')}
          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs px-3 py-2 rounded-xl transition"
        >
          <i className="fa-solid fa-triangle-exclamation mr-1"></i> Perigo
        </button>
        <button
          type="button"
          onClick={() => onOpenModal('evento')}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-2 rounded-xl transition"
        >
          <i className="fa-solid fa-plus mr-1"></i> Ponto
        </button>
      </div>
    </div>
  )
}

function StatusMessage({ icon, title, children }: { icon: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto py-12">
      <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center text-2xl text-slate-400 mb-3 border border-slate-800">
        <i className={icon}></i>
      </div>
      <h3 className="text-sm font-bold text-slate-300 mb-1">{title}</h3>
      {children}
    </div>
  )
}

interface CardProps {
  report: Report
  mine: boolean
  onFocus: (point: LatLng) => void
  onUpvote: (id: string) => void
  onDelete: (id: string) => void
}

function ReportCard({ report, mine, onFocus, onUpvote, onDelete }: CardProps) {
  const schedule = reportSchedule(report)
  const thumb = mediaUrl(report.photo_thumb_url)
  const photo = mediaUrl(report.photo_url)

  return (
    <div
      id={`report-${report.id}`}
      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all shadow-md group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{reportEmoji(report)}</span>
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors break-words min-w-0">
            {report.title}
          </h3>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${reportColors(report).badge}`}>
          {reportTag(report)}
        </span>
      </div>

      <div className="flex gap-3 mb-2">
        {thumb && photo && (
          <a href={photo} target="_blank" rel="noreferrer" className="shrink-0" title="Abrir foto">
            <img
              src={thumb}
              alt={`Foto de ${report.title}`}
              loading="lazy"
              className="w-16 h-16 rounded-xl object-cover border border-slate-800"
            />
          </a>
        )}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 break-words min-w-0">{report.description}</p>
      </div>

      {report.photo_status === 'processing' && (
        <p className="mb-2 text-[11px] text-slate-500">
          <i className="fa-solid fa-spinner fa-spin mr-1"></i> Processando foto...
        </p>
      )}

      {report.contact_whatsapp && (
        <div className="mb-2.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
          <span className="text-amber-300 font-medium flex items-center gap-1.5">
            <i className="fa-brands fa-whatsapp text-emerald-400 text-sm"></i>
            Contato: <strong className="text-white font-bold tracking-wide">{formatWhatsapp(report.contact_whatsapp)}</strong>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">
            <i className="fa-solid fa-location-dot text-slate-400"></i> {report.neighborhood}
          </span>
          {schedule && <span className="hidden sm:inline whitespace-nowrap">• 🕒 {schedule}</span>}
          {report.status !== 'pending' && (
            <span className="hidden sm:inline whitespace-nowrap">• {STATUS_LABEL[report.status]}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onUpvote(report.id)}
            disabled={mine}
            title={mine ? 'Confirmações de outras pessoas neste local' : 'Confirmar: também vi isso'}
            className="text-xs bg-slate-800 enabled:hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition enabled:active:scale-95 disabled:opacity-70"
          >
            <i className="fa-solid fa-thumbs-up text-emerald-400"></i> {report.upvotes}
          </button>
          <button
            type="button"
            onClick={() => onFocus(report)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition active:scale-95"
          >
            <i className="fa-solid fa-crosshairs text-emerald-400"></i> Ver
          </button>
          {mine && (
            <button
              type="button"
              onClick={() => onDelete(report.id)}
              title="Excluir ponto"
              aria-label="Excluir ponto"
              className="text-xs bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 px-2 py-1 rounded-lg transition active:scale-95"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Feed(props: FeedProps) {
  const { reports, loading, error, currentUserId, highlight, search, onSearch, onRetry, onOpenModal } = props

  useEffect(() => {
    if (!highlight) return
    const timer = window.setTimeout(() => {
      document.getElementById(`report-${highlight.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight?.seq])

  let body
  if (loading) {
    body = <StatusMessage icon="fa-solid fa-spinner fa-spin" title="Carregando locais..." />
  } else if (error) {
    body = (
      <StatusMessage icon="fa-solid fa-plug-circle-xmark" title="Não foi possível carregar os locais">
        <p className="text-xs text-slate-500 max-w-xs mb-4">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-2 rounded-xl transition"
        >
          <i className="fa-solid fa-rotate-right mr-1"></i> Tentar de novo
        </button>
      </StatusMessage>
    )
  } else if (reports.length === 0) {
    body = <EmptyState onOpenModal={onOpenModal} />
  } else {
    body = reports.map((report) => (
      <ReportCard
        key={report.id}
        report={report}
        mine={!!currentUserId && report.created_by === currentUserId}
        onFocus={props.onFocus}
        onUpvote={props.onUpvote}
        onDelete={props.onDelete}
      />
    ))
  }

  return (
    <>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-list-check text-emerald-400"></i>
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Locais Mapeados</h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-1 rounded-full font-medium">
          {reports.length} local(is)
        </span>
      </div>

      {/* CAMPO DE BUSCA RÁPIDA */}
      <div className="relative mb-3">
        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por bairro, título ou descrição..."
          aria-label="Buscar locais"
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/80 transition"
        />
      </div>

      {/* FEED DE LOCAIS */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">{body}</div>
    </>
  )
}
