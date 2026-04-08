import type { Room, Booking, BlockedSlot } from '../../types'

interface MobileCalendarProps {
  rooms: Room[]
  bookings: Booking[]
  blockedSlots: BlockedSlot[]
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  isLoading: boolean
}

export default function MobileCalendar(_props: MobileCalendarProps) {
  return <div className="p-4 font-mono text-sm">移动端日历 — 将在 Task 12 实现</div>
}
