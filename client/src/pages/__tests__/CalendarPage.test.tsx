import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../contexts/AuthContext'
import CalendarPage from '../CalendarPage'
import * as roomsApi from '../../api/rooms'
import * as bookingsApi from '../../api/bookings'

vi.mock('../../api/rooms')
vi.mock('../../api/bookings')

const mockListRooms = vi.mocked(roomsApi.listRooms)
const mockListBookings = vi.mocked(bookingsApi.listBookings)
const mockListBlockedSlots = vi.mocked(bookingsApi.listBlockedSlots)

const rooms = [
  { id: 'r1', name: '珊瑚厅', capacity: 8, location: null, description: null, zone: 'OFFICE', isActive: true, colorIndex: 0 },
]

function wrapper({ children }: { children: ReactNode }) {
  localStorage.setItem('authUser', JSON.stringify({ id: 'u1', name: 'Alice', email: 'a@test.com', role: 'USER' }))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListRooms.mockResolvedValue(rooms as never)
    mockListBookings.mockResolvedValue([])
    mockListBlockedSlots.mockResolvedValue([])
  })

  it('renders room name after loading', async () => {
    render(<CalendarPage />, { wrapper })
    await waitFor(() => expect(screen.getAllByText('珊瑚厅').length).toBeGreaterThan(0))
  })

  it('shows booking panel when a cell is clicked', async () => {
    render(<CalendarPage />, { wrapper })
    await waitFor(() => screen.getAllByText('珊瑚厅'))
    // The free cells render as buttons; click the first one
    const freeCells = screen.getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.startsWith('预订')
    )
    await userEvent.click(freeCells[0])
    await waitFor(() => expect(screen.getAllByText(/新建预订/).length).toBeGreaterThan(0))
  })
})
