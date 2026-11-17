const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const API_PREFIX = `${BASE}/api/v1`
const TOKEN_KEY = 'comunimap.token'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // armazenamento bloqueado (aba privada): a sessão dura só até recarregar
  }
}

let onUnauthorized: (() => void) | null = null

/** Registrado pelo AuthContext para derrubar a sessão quando o token expira. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/** Caminhos de mídia vêm relativos da API (/media/...). */
export function mediaUrl(path: string | null): string | null {
  if (!path) return null
  return /^(https?:|blob:|data:)/.test(path) ? path : `${BASE}${path}`
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  json?: unknown
  form?: FormData
  query?: Record<string, string | number | undefined | null>
  signal?: AbortSignal
}

function describeError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string; loc?: unknown[] }
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null
      const msg = (first.msg ?? 'Dados inválidos.').replace(/^Value error, /, '')
      return field && typeof field === 'string' && field !== 'body' ? `${field}: ${msg}` : msg
    }
  }
  if (status === 429) return 'Muitas tentativas. Aguarde um instante.'
  if (status >= 500) return 'O servidor está indisponível. Tente novamente em instantes.'
  return `Erro ${status}.`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, form, query, signal } = options

  let url = `${API_PREFIX}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  if (response.status === 204) return undefined as T

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // resposta sem JSON (ex.: erro de proxy)
  }

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.()
    throw new ApiError(response.status, describeError(body, response.status))
  }

  return body as T
}
