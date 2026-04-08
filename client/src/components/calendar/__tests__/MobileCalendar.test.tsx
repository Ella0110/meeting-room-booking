import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileCalendar from '../MobileCalendar'
import type { Room } from '../../../types'

const rooms: Room[] = [
  { id: 'r1', name: '珊瑚厅', capacity: 8, location: null, description: null, zone: 'OFFICE', isActive: true },
  { id: 'r2', name: '极光厅', capacity: 4, location: null, description: null, zone: 'SHARED', isActive: true },
]

describe('MobileCalendar', () => {
  it('renders room tabs', () => {
    render(
      <MobileCalendar
        rooms={rooms}
        bookings={[]}
        blockedSlots={[]}
        selectedDate={new Date(2026, 3, 6)}
        onCellClick={vi.fn()}
        isLoading={false}
      />
    )
    expect(screen.getByText('珊瑚厅')).toBeInTheDocument()
    expect(screen.getByText('极光厅')).toBeInTheDocument()
  })

  it('switches active room when tab is clicked', async () => {
    render(
      <MobileCalendar
        rooms={rooms}
        bookings={[]}
        blockedSlots={[]}
        selectedDate={new Date(2026, 3, 6)}
        onCellClick={vi.fn()}
        isLoading={false}
      />
    )
    await userEvent.click(screen.getByText('极光厅'))
    // After clicking, 极光厅 tab should have active styling (bg-black text-white)
    const tab = screen.getAllByRole('button').find((b) => b.textContent?.includes('极光厅'))
    expect(tab?.className).toContain('bg-black')
  })

  it('calls onCellClick when a free time slot is tapped', async () => {
    const onClick = vi.fn()
    render(
      <MobileCalendar
        rooms={rooms}
        bookings={[]}
        blockedSlots={[]}
        selectedDate={new Date(2026, 3, 7)}  // Monday (OFFICE room ok)
        onCellClick={onClick}
        isLoading={false}
      />
    )
    const freeCells = screen.getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.startsWith('预订')
    )
    await userEvent.click(freeCells[0])
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
