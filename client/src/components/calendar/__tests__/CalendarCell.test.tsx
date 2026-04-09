import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarCell from '../CalendarCell'
import type { Booking, BlockedSlot, Room } from '../../../types'

const mockRoom: Room = {
  id: 'room-1', name: '珊瑚厅', capacity: 8,
  location: null, description: null, zone: 'OFFICE', isActive: true,
}

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1', userId: 'u1', roomId: 'room-1',
  title: '周会', startTime: '2026-04-06T10:00:00Z', endTime: '2026-04-06T11:00:00Z',
  status: 'CONFIRMED', createdAt: '2026-04-01T00:00:00Z',
  isOwn: false, room: { name: '珊瑚厅' }, ...overrides,
})

const freeCell = { slotIdx: 2, span: 1, type: 'free' as const }
const cellStyle = { gridRow: '4 / span 1', gridColumn: 2 }

describe('CalendarCell', () => {
  it('renders free cell as clickable with hover styles', () => {
    const onClick = vi.fn()
    render(
      <CalendarCell cell={freeCell} room={mockRoom} colorIndex={0}
        selectedDate={new Date(2026, 3, 6)} onCellClick={onClick} style={cellStyle} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onCellClick when free cell is clicked', async () => {
    const onClick = vi.fn()
    render(
      <CalendarCell cell={freeCell} room={mockRoom} colorIndex={0}
        selectedDate={new Date(2026, 3, 6)} onCellClick={onClick} style={cellStyle} />
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders own booking with title visible', () => {
    const cell = { slotIdx: 2, span: 2, type: 'ownBooking' as const, booking: makeBooking({ isOwn: true }) }
    render(
      <CalendarCell cell={cell} room={mockRoom} colorIndex={0}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} style={cellStyle} />
    )
    expect(screen.getByText('周会')).toBeInTheDocument()
  })

  it('renders other booking without title (privacy)', () => {
    const cell = { slotIdx: 2, span: 2, type: 'otherBooking' as const, booking: makeBooking({ isOwn: false }) }
    render(
      <CalendarCell cell={cell} room={mockRoom} colorIndex={0}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} style={cellStyle} />
    )
    expect(screen.queryByText('周会')).toBeNull()
  })

  it('renders blocked cell as non-interactive', () => {
    const slot: BlockedSlot = {
      id: 'bs1', roomId: 'room-1', reason: '维修',
      startTime: '2026-04-06T10:00:00Z', endTime: '2026-04-06T12:00:00Z',
    }
    const cell = { slotIdx: 2, span: 4, type: 'blocked' as const, blockedSlot: slot }
    render(
      <CalendarCell cell={cell} room={mockRoom} colorIndex={0}
        selectedDate={new Date(2026, 3, 6)} onCellClick={vi.fn()} style={cellStyle} />
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
