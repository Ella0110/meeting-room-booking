import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalendarGrid from '../CalendarGrid'
import type { Room, Booking } from '../../../types'

const rooms: Room[] = [
  { id: 'r1', name: '珊瑚厅', capacity: 8, location: null, description: null, zone: 'OFFICE', isActive: true },
  { id: 'r2', name: '极光厅', capacity: 4, location: null, description: null, zone: 'SHARED', isActive: true },
]

describe('CalendarGrid', () => {
  it('renders room names as column headers', () => {
    render(
      <CalendarGrid rooms={rooms} bookings={[]} blockedSlots={[]}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} isLoading={false} />
    )
    expect(screen.getByText('珊瑚厅')).toBeInTheDocument()
    expect(screen.getByText('极光厅')).toBeInTheDocument()
  })

  it('renders skeleton when loading', () => {
    const { container } = render(
      <CalendarGrid rooms={[]} bookings={[]} blockedSlots={[]}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} isLoading={true} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders own booking with title', () => {
    const booking: Booking = {
      id: 'b1', userId: 'u1', roomId: 'r1',
      title: '产品评审', isOwn: true,
      startTime: '2026-04-06T10:00:00',
      endTime: '2026-04-06T11:00:00',
      status: 'CONFIRMED', createdAt: '2026-04-01T00:00:00Z',
      room: { name: '珊瑚厅' },
    }
    render(
      <CalendarGrid rooms={rooms} bookings={[booking]} blockedSlots={[]}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} isLoading={false} />
    )
    expect(screen.getByText('产品评审')).toBeInTheDocument()
  })
})
