import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../contexts/AuthContext'
import MyBookingsPage from '../MyBookingsPage'
import * as bookingsApi from '../../api/bookings'
import type { MyBooking } from '../../types'

vi.mock('../../api/bookings')
const mockMyBookings = vi.mocked(bookingsApi.myBookings)
const mockCancel = vi.mocked(bookingsApi.cancelBooking)

const futureBooking: MyBooking = {
  id: 'b1', userId: 'u1', roomId: 'r1',
  title: '产品评审',
  startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h from now
  endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  status: 'CONFIRMED', createdAt: new Date().toISOString(),
  room: { name: '珊瑚厅', capacity: 8 },
}

const pastBooking: MyBooking = {
  id: 'b2', userId: 'u1', roomId: 'r1',
  title: '周会',
  startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'CONFIRMED', createdAt: new Date().toISOString(),
  room: { name: '极光厅', capacity: 4 },
}

function wrapper({ children }: { children: ReactNode }) {
  localStorage.setItem('authUser', JSON.stringify({ id: 'u1', name: 'Alice', email: 'a@test.com', role: 'USER' }))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider><MemoryRouter>{children}</MemoryRouter></AuthProvider>
    </QueryClientProvider>
  )
}

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMyBookings.mockResolvedValue([futureBooking, pastBooking])
    mockCancel.mockResolvedValue(undefined)
  })

  it('shows upcoming booking title', async () => {
    render(<MyBookingsPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('产品评审')).toBeInTheDocument())
  })

  it('switches to history tab and shows past booking', async () => {
    render(<MyBookingsPage />, { wrapper })
    await waitFor(() => screen.getByText('产品评审'))
    await userEvent.click(screen.getByText('历史记录'))
    expect(screen.getByText('周会')).toBeInTheDocument()
  })
})
