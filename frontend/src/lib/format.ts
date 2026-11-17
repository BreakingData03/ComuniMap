import type { Report } from '../types'

const RISK_LABEL = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' } as const

export function reportEmoji(report: Report): string {
  switch (report.category) {
    case 'perigo':
      return '⚠️'
    case 'caridade':
      return report.donation_intent === 'doando' ? '🎁' : '🤲'
    case 'evento':
      return '🥳'
    default:
      return '🏘️'
  }
}

/** Texto da etiqueta colorida no canto do card. */
export function reportTag(report: Report): string {
  if (report.category === 'perigo') {
    return `⚠️ Risco ${report.risk_level ? RISK_LABEL[report.risk_level] : ''}`.trim()
  }
  if (report.category === 'caridade') {
    const item = report.item_category ?? 'Diversos'
    return report.donation_intent === 'doando' ? `🎁 Doando: ${item}` : `🤲 Aceita: ${item}`
  }
  return report.category === 'evento' ? 'FESTAS' : 'COMUNIDADE'
}

/** Cores do card/pino por categoria (classes literais para o Tailwind enxergar). */
export function reportColors(report: Report): { badge: string; marker: string } {
  if (report.category === 'perigo') {
    return { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', marker: 'marker-pulse-red bg-rose-500' }
  }
  if (report.category === 'caridade') {
    return { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', marker: 'marker-pulse-amber bg-amber-500' }
  }
  return { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', marker: 'marker-pulse-green bg-emerald-500' }
}

/** "19:30:00" → "19:30" */
function hhmm(time: string): string {
  return time.slice(0, 5)
}

/** Horário de eventos/pontos; null para categorias sem horário. */
export function reportSchedule(report: Report): string | null {
  if (report.category !== 'evento' && report.category !== 'comunidade') return null
  const { starts_at: inicio, ends_at: fim } = report
  if (inicio && fim) return `${hhmm(inicio)} às ${hhmm(fim)}`
  if (inicio) return `A partir das ${hhmm(inicio)}`
  if (fim) return `Até às ${hhmm(fim)}`
  return 'Horário livre'
}

/** 67999998888 → (67) 99999-8888 */
export function formatWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length !== 11) return digits
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const STATUS_LABEL = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
} as const
