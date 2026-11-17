import type { TokenResponse, User } from '../types'
import { request } from './client'

export function register(name: string, email: string, password: string): Promise<User> {
  return request<User>('/auth/register', { method: 'POST', json: { name, email, password } })
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', { method: 'POST', json: { email, password } })
}

export function me(): Promise<User> {
  return request<User>('/auth/me')
}
