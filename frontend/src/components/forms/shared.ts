import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import type { ReportLocation } from '../../hooks/useReportLocation'
import type { LatLng, MapPick, ReportCreate } from '../../types'

export interface ReportFormProps {
  open: boolean
  /** Ponto escolhido no mapa principal para este formulário. */
  externalPick: MapPick | null
  onClose: () => void
  onRequestMapPick: () => void
  /** Envia para a API; devolve true se deu certo. */
  onSubmit: (payload: ReportCreate, photo: File | null) => Promise<boolean>
}

export const LABEL = 'block text-xs text-slate-400 font-medium mb-1'

/*
 * Linhas com <select>. As quebras vêm da largura medida da maior opção de cada campo
 * (texto + padding + seta) contra a largura da coluna do modal:
 *  - "Nível de Risco" (~135 px) cabe em duas colunas a partir de 400 px de tela;
 *  - "Tipo de Registro" (~170 px) só a partir de 440 px;
 *  - "Tipo de Ação" das doações (~225 px) não cabe em meia coluna nem no desktop
 *    (coluna de 198 px), então a linha fica sempre empilhada.
 */
export const SELECT_ROW = 'grid grid-cols-1 min-[400px]:grid-cols-2 gap-3'
export const SELECT_ROW_WIDE = 'grid grid-cols-1 min-[440px]:grid-cols-2 gap-3'
export const SELECT_ROW_STACKED = 'grid grid-cols-1 gap-3'

// Classes completas por cor (o Tailwind só gera o que aparece literal no código).
const BASE = 'w-full bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none'
export const FIELD = {
  rose: {
    input: `${BASE} px-3.5 py-2.5 focus:border-rose-500`,
    select: `${BASE} px-3 py-2.5 focus:border-rose-500`,
    time: `${BASE} px-3 py-2 focus:border-rose-500`,
  },
  emerald: {
    input: `${BASE} px-3.5 py-2.5 focus:border-emerald-500`,
    select: `${BASE} px-3 py-2.5 focus:border-emerald-500`,
    time: `${BASE} px-3 py-2 focus:border-emerald-500`,
  },
  amber: {
    input: `${BASE} px-3.5 py-2.5 focus:border-amber-500`,
    select: `${BASE} px-3 py-2.5 focus:border-amber-500`,
    time: `${BASE} px-3 py-2 focus:border-amber-500`,
  },
} as const

/** Resolve a posição (GPS/pino ou endereço digitado) e envia o registro. */
export function useReportSubmit(location: ReportLocation, onSubmit: ReportFormProps['onSubmit']) {
  const showToast = useToast()
  const [saving, setSaving] = useState(false)

  async function submit(build: (pos: LatLng) => ReportCreate, photo: File | null, onDone: () => void) {
    if (saving) return
    setSaving(true)
    try {
      const pos = await location.resolve()
      if (!pos) {
        showToast('Não encontramos esse endereço. Arraste o pino até o local no mapa.', 'error')
        return
      }
      if (await onSubmit(build(pos), photo)) onDone()
    } finally {
      setSaving(false)
    }
  }

  return { saving, submit }
}
