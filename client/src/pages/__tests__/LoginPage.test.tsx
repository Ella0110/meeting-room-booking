import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import LoginPage from '../LoginPage'
import * as authApi from '../../api/auth'

vi.mock('../../api/auth')
const mockLogin = vi.mocked(authApi.login)

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
  })

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce({ response: { data: { error: 'Invalid credentials' } } })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/邮箱/i), 'wrong@test.com')
    await userEvent.type(screen.getByLabelText(/密码/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /登录/i }))
    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument())
  })

  it('calls login API with entered credentials', async () => {
    mockLogin.mockResolvedValueOnce({ id: '1', name: 'Alice', email: 'a@test.com', role: 'USER' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/邮箱/i), 'a@test.com')
    await userEvent.type(screen.getByLabelText(/密码/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /登录/i }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@test.com', 'password'))
  })
})
