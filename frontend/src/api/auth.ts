import { DEMO_MODE } from '../config'
import type { TokenResponse, User } from '../types'
import { request } from './client'
import * as demo from './demo'

export function register(name: string, email: string, password: string): Promise<User> {
  if (DEMO_MODE) return demo.register(name, email)
  return request<User>('/auth/register', { method: 'POST', json: { name, email, password } })
}

export function login(email: string, password: string): Promise<TokenResponse> {
  if (DEMO_MODE) return demo.login(email)
  return request<TokenResponse>('/auth/login', { method: 'POST', json: { email, password } })
}

export function me(): Promise<User> {
  if (DEMO_MODE) return demo.me()
  return request<User>('/auth/me')
}

/** Só o modo demonstração guarda sessão própria; na API real basta descartar o token. */
export function logout(): void {
  if (DEMO_MODE) demo.logout()
}
