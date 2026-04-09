import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../../contexts/AuthContext'
import UsersPage from '../UsersPage'
import * as adminApi from '../../../api/admin'
import type { AdminUser } from '../../../types'

vi.mock('../../../api/admin')
const mockListUsers = vi.mocked(adminApi.listAdminUsers)
const mockSendInvite = vi.mocked(adminApi.sendInvite)
const mockUpdateUser = vi.mocked(adminApi.updateUser)

const users: AdminUser[] = [
  { id: 'u1', name: 'Alice', email: 'alice@co.com', role: 'USER', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', name: 'Bob', email: 'bob@co.com', role: 'USER', isActive: false, createdAt: '2026-01-02T00:00:00Z' },
]

function wrapper({ children }: { children: ReactNode }) {
  localStorage.setItem('authUser', JSON.stringify({ id: 'admin1', name: 'Admin', email: 'admin@co.com', role: 'ADMIN' }))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider><MemoryRouter>{children}</MemoryRouter></AuthProvider>
    </QueryClientProvider>
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListUsers.mockResolvedValue(users)
    mockSendInvite.mockResolvedValue(undefined)
    mockUpdateUser.mockResolvedValue({ ...users[1], isActive: true })
  })

  it('renders user list', async () => {
    render(<UsersPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows invite form', () => {
    render(<UsersPage />, { wrapper })
    expect(screen.getByPlaceholderText(/邮箱/i)).toBeInTheDocument()
  })

  it('calls sendInvite on form submit', async () => {
    render(<UsersPage />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText(/邮箱/i), 'new@co.com')
    await userEvent.click(screen.getByRole('button', { name: /发送邀请/i }))
    await waitFor(() => expect(mockSendInvite).toHaveBeenCalledWith('new@co.com'))
  })
})
