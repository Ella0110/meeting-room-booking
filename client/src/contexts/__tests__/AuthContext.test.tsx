import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../AuthContext'

function withQueryClient(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

vi.mock('../../api/auth', () => ({ logout: vi.fn().mockResolvedValue(undefined) }))

function TestConsumer() {
  const { user, setUser, logout } = useAuth()
  return (
    <div>
      <span data-testid="name">{user?.name ?? 'none'}</span>
      <button onClick={() => setUser({ id: '1', name: 'Alice', email: 'a@test.com', role: 'USER' })}>
        set
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear())

  it('starts with null user', () => {
    render(withQueryClient(<AuthProvider><TestConsumer /></AuthProvider>))
    expect(screen.getByTestId('name').textContent).toBe('none')
  })

  it('setUser updates state and persists to localStorage', () => {
    render(withQueryClient(<AuthProvider><TestConsumer /></AuthProvider>))
    act(() => { screen.getByText('set').click() })
    expect(screen.getByTestId('name').textContent).toBe('Alice')
    expect(JSON.parse(localStorage.getItem('authUser')!).name).toBe('Alice')
  })

  it('logout clears user and localStorage', async () => {
    render(withQueryClient(<AuthProvider><TestConsumer /></AuthProvider>))
    act(() => { screen.getByText('set').click() })
    await act(async () => { screen.getByText('logout').click() })
    expect(screen.getByTestId('name').textContent).toBe('none')
    expect(localStorage.getItem('authUser')).toBeNull()
  })

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('authUser', JSON.stringify({ id: '2', name: 'Bob', email: 'b@test.com', role: 'ADMIN' }))
    render(withQueryClient(<AuthProvider><TestConsumer /></AuthProvider>))
    expect(screen.getByTestId('name').textContent).toBe('Bob')
  })
})
