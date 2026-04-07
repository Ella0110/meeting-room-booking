import { api } from './client'
import type { AuthUser } from '../types'

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<AuthUser>('/api/auth/login', { email, password })
  return res.data
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
}

export async function acceptInvite(token: string, name: string, password: string): Promise<AuthUser> {
  const res = await api.post<AuthUser>('/api/auth/accept-invite', { token, name, password })
  return res.data
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/api/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/reset-password', { token, newPassword })
}
