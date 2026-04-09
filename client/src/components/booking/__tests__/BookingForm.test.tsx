import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import BookingForm from '../BookingForm'
import type { Room } from '../../../types'
import * as bookingsApi from '../../../api/bookings'

vi.mock('../../../api/bookings')
const mockCreate = vi.mocked(bookingsApi.createBooking)

const mockRoom: Room = {
  id: 'r1', name: '珊瑚厅', capacity: 8,
  location: null, description: null, zone: 'OFFICE', isActive: true,
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('BookingForm', () => {
  const startTime = new Date(2026, 3, 7, 10, 0, 0)

  beforeEach(() => vi.clearAllMocks())

  it('renders title input and submit button', () => {
    render(
      <BookingForm room={mockRoom} startTime={startTime} date="2026-04-07" onSuccess={vi.fn()} onCancel={vi.fn()} />,
      { wrapper }
    )
    expect(screen.getByLabelText(/会议主题/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /确认预订/i })).toBeInTheDocument()
  })

  it('disables submit when title is empty', () => {
    render(
      <BookingForm room={mockRoom} startTime={startTime} date="2026-04-07" onSuccess={vi.fn()} onCancel={vi.fn()} />,
      { wrapper }
    )
    expect(screen.getByRole('button', { name: /确认预订/i })).toBeDisabled()
  })

  it('calls createBooking with correct args on submit', async () => {
    mockCreate.mockResolvedValueOnce({} as never)
    render(
      <BookingForm room={mockRoom} startTime={startTime} date="2026-04-07" onSuccess={vi.fn()} onCancel={vi.fn()} />,
      { wrapper }
    )
    await userEvent.type(screen.getByLabelText(/会议主题/i), 'Sprint 评审')
    await userEvent.click(screen.getByRole('button', { name: /确认预订/i }))
    await waitFor(() => expect(mockCreate).toHaveBeenCalledOnce())
    const call = mockCreate.mock.calls[0][0]
    expect(call.roomId).toBe('r1')
    expect(call.title).toBe('Sprint 评审')
  })

  it('shows server error message on failure', async () => {
    mockCreate.mockRejectedValueOnce({
      response: { data: { error: '该时段已被预订，存在冲突' } },
    })
    render(
      <BookingForm room={mockRoom} startTime={startTime} date="2026-04-07" onSuccess={vi.fn()} onCancel={vi.fn()} />,
      { wrapper }
    )
    await userEvent.type(screen.getByLabelText(/会议主题/i), '测试')
    await userEvent.click(screen.getByRole('button', { name: /确认预订/i }))
    await waitFor(() => expect(screen.getByText(/该时段已被预订/)).toBeInTheDocument())
  })
})
