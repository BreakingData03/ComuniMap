/**
 * Modo demonstração (VITE_DEMO_MODE=true): o app roda sem back-end, como vitrine estática.
 *
 * Este módulo imita as respostas da API e guarda tudo no localStorage do visitante, então cada
 * pessoa vê só os próprios registros, mais alguns exemplos fictícios. Não há senha de verdade
 * aqui: qualquer senha entra, e nenhuma é guardada.
 */
import type { Report, ReportCreate, ReportList, TokenResponse, User } from '../types'
import { ApiError } from './client'

const REPORTS_KEY = 'comunimap.demo.reports'
const VOTES_KEY = 'comunimap.demo.votes'
const ACCOUNTS_KEY = 'comunimap.demo.accounts'
const SESSION_KEY = 'comunimap.demo.session'

const DEDUP_RADIUS_METERS = 15
const SEED_AUTHOR = 'demo-exemplo'

export const DEMO_VISITOR_EMAIL = 'visitante@comunimap.demo'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento cheio ou bloqueado: a demonstração segue só em memória nesta visita
  }
}

/** Pequena espera para a interface mostrar os estados de carregamento como na API real. */
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), 200))
}

function base(partial: Partial<Report> & Pick<Report, 'category' | 'title' | 'description' | 'neighborhood' | 'lat' | 'lng'>): Report {
  return {
    id: crypto.randomUUID(),
    street: null,
    risk_level: null,
    contact_whatsapp: null,
    donation_intent: null,
    item_category: null,
    starts_at: null,
    ends_at: null,
    photo_url: null,
    photo_thumb_url: null,
    photo_status: 'none',
    upvotes: 0,
    status: 'pending',
    created_by: SEED_AUTHOR,
    created_at: new Date().toISOString(),
    merged: false,
    ...partial,
  }
}

/** Registros fictícios para a vitrine não abrir vazia. */
function seed(): Report[] {
  return [
    base({
      category: 'perigo',
      title: 'Buraco na pista (exemplo)',
      description: 'Registro de exemplo: buraco grande na faixa da direita, sentido centro.',
      neighborhood: 'Centro',
      street: 'Rua Paranaíba',
      risk_level: 'alto',
      upvotes: 4,
      lat: -20.7868,
      lng: -51.7018,
    }),
    base({
      category: 'perigo',
      title: 'Fios soltos no poste (exemplo)',
      description: 'Registro de exemplo: fio pendurado na altura da calçada.',
      neighborhood: 'Santos Dumont',
      street: 'Avenida Dr. Eloy Chaves',
      risk_level: 'medio',
      upvotes: 1,
      lat: -20.783,
      lng: -51.7055,
    }),
    base({
      category: 'caridade',
      title: 'Arrecadação de agasalhos (exemplo)',
      description: 'Registro de exemplo: recebemos roupas de frio em bom estado, das 8h às 17h.',
      neighborhood: 'Vila Nova',
      street: 'Avenida Filinto Müller',
      donation_intent: 'precisa',
      item_category: 'Roupas',
      contact_whatsapp: '67999990000',
      upvotes: 2,
      lat: -20.7876,
      lng: -51.6974,
    }),
    base({
      category: 'evento',
      title: 'Feira de artesanato (exemplo)',
      description: 'Registro de exemplo: artesanato local e comidas típicas na praça.',
      neighborhood: 'Centro',
      street: 'Avenida Capitão Olinto Mancini',
      starts_at: '18:00:00',
      ends_at: '22:00:00',
      lat: -20.7848,
      lng: -51.7001,
    }),
    base({
      category: 'comunidade',
      title: 'Horta comunitária (exemplo)',
      description: 'Registro de exemplo: horta cuidada pelos moradores, aberta a voluntários.',
      neighborhood: 'Interlagos',
      street: 'Avenida Circular',
      starts_at: '07:00:00',
      lat: -20.78,
      lng: -51.7125,
    }),
  ]
}

function loadReports(): Report[] {
  const stored = read<Report[] | null>(REPORTS_KEY, null)
  if (!stored) {
    const initial = seed()
    write(REPORTS_KEY, initial)
    return initial
  }
  // Fotos da demonstração são blob: URLs e não sobrevivem a recarregar a página.
  return stored.map((r) =>
    r.photo_url?.startsWith('blob:') ? { ...r, photo_url: null, photo_thumb_url: null, photo_status: 'none' as const } : r,
  )
}

function saveReports(reports: Report[]): void {
  write(REPORTS_KEY, reports)
}

function currentUser(): User {
  const user = read<User | null>(SESSION_KEY, null)
  if (!user) throw new ApiError(401, 'Faça login para continuar.')
  return user
}

function userFor(email: string, name?: string): User {
  const fallback = email === DEMO_VISITOR_EMAIL ? 'Visitante' : email.split('@')[0]
  return { id: `demo-${email}`, name: name || fallback, email, role: 'citizen' }
}

// --- auth -------------------------------------------------------------------------------

export function register(name: string, email: string): Promise<User> {
  const accounts = read<Record<string, string>>(ACCOUNTS_KEY, {})
  if (accounts[email]) return Promise.reject(new ApiError(409, 'E-mail já cadastrado! Faça login.'))
  accounts[email] = name
  write(ACCOUNTS_KEY, accounts)
  return delay(userFor(email, name))
}

export function login(email: string): Promise<TokenResponse> {
  const accounts = read<Record<string, string>>(ACCOUNTS_KEY, {})
  const user = userFor(email, accounts[email])
  write(SESSION_KEY, user)
  return delay({ access_token: 'demo', token_type: 'bearer', user })
}

export function me(): Promise<User> {
  try {
    return delay(currentUser())
  } catch (err) {
    return Promise.reject(err)
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // sem armazenamento, não há sessão para limpar
  }
}

// --- reports ----------------------------------------------------------------------------

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/** Uma confirmação por pessoa; o autor não confirma o próprio registro. Devolve o registro atualizado. */
function addVote(reports: Report[], report: Report, user: User): Report {
  const votes = read<string[]>(VOTES_KEY, [])
  const key = `${report.id}:${user.id}`
  if (report.created_by === user.id || votes.includes(key)) return report
  write(VOTES_KEY, [...votes, key])
  const updated = { ...report, upvotes: report.upvotes + 1 }
  saveReports(reports.map((r) => (r.id === report.id ? updated : r)))
  return updated
}

export function listReports(): Promise<ReportList> {
  const items = loadReports().filter((r) => r.status !== 'resolved')
  return delay({ items, total: items.length })
}

/** Mesma regra dos 15 m da API: registro aberto igual por perto recebe a confirmação. */
export function createReport(payload: ReportCreate): Promise<Report> {
  let user: User
  try {
    user = currentUser()
  } catch (err) {
    return Promise.reject(err)
  }
  const reports = loadReports()

  const nearby = reports
    .filter((r) => r.category === payload.category && r.status !== 'resolved')
    .map((r) => ({ report: r, distance: metersBetween(r, payload) }))
    .filter((c) => c.distance <= DEDUP_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance)[0]

  if (nearby) return delay({ ...addVote(reports, nearby.report, user), merged: true })

  const time = (value?: string | null) => (value ? (value.length === 5 ? `${value}:00` : value) : null)
  const report = base({
    category: payload.category,
    title: payload.title.trim(),
    description: payload.description.trim(),
    neighborhood: payload.neighborhood.trim(),
    street: payload.street?.trim() || null,
    lat: payload.lat,
    lng: payload.lng,
    risk_level: payload.category === 'perigo' ? (payload.risk_level ?? 'medio') : null,
    contact_whatsapp: payload.category === 'caridade' ? (payload.contact_whatsapp ?? null) : null,
    donation_intent: payload.category === 'caridade' ? (payload.donation_intent ?? null) : null,
    item_category: payload.category === 'caridade' ? (payload.item_category ?? null) : null,
    starts_at: time(payload.starts_at),
    ends_at: time(payload.ends_at),
    created_by: user.id,
  })
  saveReports([report, ...reports])
  return delay(report)
}

export function uploadReportPhoto(id: string, photo: File): Promise<Report> {
  const reports = loadReports()
  const report = reports.find((r) => r.id === id)
  if (!report) return Promise.reject(new ApiError(404, 'Registro não encontrado.'))
  const url = URL.createObjectURL(photo)
  const updated: Report = { ...report, photo_url: url, photo_thumb_url: url, photo_status: 'ready' }
  saveReports(reports.map((r) => (r.id === id ? updated : r)))
  return delay(updated)
}

export function upvoteReport(id: string): Promise<Report> {
  try {
    const user = currentUser()
    const reports = loadReports()
    const report = reports.find((r) => r.id === id)
    if (!report) throw new ApiError(404, 'Registro não encontrado.')
    return delay(addVote(reports, report, user))
  } catch (err) {
    return Promise.reject(err)
  }
}

export function deleteReport(id: string): Promise<void> {
  try {
    const user = currentUser()
    const reports = loadReports()
    const report = reports.find((r) => r.id === id)
    if (!report) throw new ApiError(404, 'Registro não encontrado.')
    if (report.created_by !== user.id) throw new ApiError(403, 'Você só pode excluir os registros que criou.')
    saveReports(reports.filter((r) => r.id !== id))
    return delay(undefined)
  } catch (err) {
    return Promise.reject(err)
  }
}
