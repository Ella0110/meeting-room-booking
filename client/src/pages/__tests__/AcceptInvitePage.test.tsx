import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import AcceptInvitePage from '../AcceptInvitePage'
import * as authApi from '../../api/auth'

vi.mock('../../api/auth')
const mockAcceptInvite = vi.mocked(authApi.acceptInvite)

function renderPage(token = 'test-token') {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('AcceptInvitePage', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it('renders name and password inputs', () => {
    renderPage()
    expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
  })

  it('calls acceptInvite with token from URL and form values', async () => {
    mockAcceptInvite.mockResolvedValueOnce({ id: '1', name: 'Alice', email: 'a@test.com', role: 'USER' })
    renderPage('my-invite-token')
    await userEvent.type(screen.getByLabelText(/姓名/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/密码/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /设置密码/i }))
    await waitFor(() =>
      expect(mockAcceptInvite).toHaveBeenCalledWith('my-invite-token', 'Alice', 'password123')
    )
  })
})
