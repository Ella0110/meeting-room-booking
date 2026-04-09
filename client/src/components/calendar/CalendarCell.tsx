import type { CSSProperties } from 'react'
import type { Booking, BlockedSlot, Room } from '../../types'
import { getRoomColor } from '../../utils/roomColors'
import { slotToDateTime, formatTime } from '../../utils/dateUtils'

export interface CellData {
  slotIdx: number
  span: number
  type: 'free' | 'ownBooking' | 'otherBooking' | 'blocked'
  booking?: Booking
  blockedSlot?: BlockedSlot
}

interface CalendarCellProps {
  cell: CellData
  room: Room
  colorIndex: number
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  style: CSSProperties
}

export default function CalendarCell({
  cell, room, colorIndex, selectedDate, onCellClick, style,
}: CalendarCellProps) {
  const color = getRoomColor(colorIndex)

  if (cell.type === 'free') {
    const startTime = slotToDateTime(selectedDate, cell.slotIdx)
    return (
      <button
        style={{ ...style, borderRight: '2px solid #000', borderBottom: '2px solid #000' }}
        onClick={() => onCellClick(room, startTime)}
        className="bg-white hover:bg-[#FFFBEB] transition-colors duration-100 cursor-pointer w-full h-full"
        aria-label={`预订 ${room.name} ${formatTime(startTime)}`}
      />
    )
  }

  if (cell.type === 'ownBooking' && cell.booking) {
    return (
      <div
        style={{
          ...style,
          backgroundColor: color,
          border: '3px solid #000',
          boxShadow: '3px 3px 0 0 #000',
          padding: '4px 6px',
          overflow: 'hidden',
          zIndex: 10,
        }}
        className="flex flex-col"
      >
        <span className="font-grotesk font-black text-xs uppercase truncate leading-tight">
          {cell.booking.title}
        </span>
        <span className="font-mono text-xs opacity-80">
          {formatTime(new Date(cell.booking.startTime))}–{formatTime(new Date(cell.booking.endTime))}
        </span>
      </div>
    )
  }

  if (cell.type === 'otherBooking') {
    return (
      <div
        style={{ ...style, backgroundColor: '#d1d5db', border: '2px solid #9ca3af', zIndex: 10 }}
        className="flex items-center justify-center"
      >
        <span className="font-mono text-xs text-gray-600">已预订</span>
      </div>
    )
  }

  if (cell.type === 'blocked') {
    return (
      <div
        style={{
          ...style,
          background: 'repeating-linear-gradient(-45deg, #d1d5db, #d1d5db 4px, #f3f4f6 4px, #f3f4f6 12px)',
          border: '2px solid #9ca3af',
          zIndex: 10,
          cursor: 'not-allowed',
        }}
        title={cell.blockedSlot?.reason}
      />
    )
  }

  return null
}
