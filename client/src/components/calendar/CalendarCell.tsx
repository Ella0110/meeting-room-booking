import type { CSSProperties } from 'react'
import type { Booking, BlockedSlot, Room } from '../../types'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
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

const CELL_BORDER_HOUR = '1px solid #e5e7eb'
const CELL_BORDER_HALF = '1px dashed #f3f3f3'

export default function CalendarCell({
  cell, room, colorIndex, selectedDate, onCellClick, style,
}: CalendarCellProps) {
  const color = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)
  const isHour = cell.slotIdx % 2 === 0
  const cellBorderBottom = isHour ? CELL_BORDER_HOUR : CELL_BORDER_HALF

  if (cell.type === 'free') {
    const startTime = slotToDateTime(selectedDate, cell.slotIdx)
    const isPast = startTime < new Date()

    if (isPast) {
      return (
        <div
          style={{
            ...style,
            borderRight: CELL_BORDER_HOUR,
            borderBottom: cellBorderBottom,
            background: 'repeating-linear-gradient(-45deg, #f3f4f6, #f3f4f6 3px, #ebebeb 3px, #ebebeb 8px)',
            cursor: 'not-allowed',
          }}
          className="w-full h-full"
        />
      )
    }
    return (
      <button
        style={{ ...style, borderRight: CELL_BORDER_HOUR, borderBottom: cellBorderBottom, backgroundColor: '#fff' }}
        onClick={() => onCellClick(room, startTime)}
        className="empty-cell w-full h-full hover:bg-[#FFFBEB] transition-colors duration-100 cursor-pointer"
        aria-label={`预订 ${room.name} ${formatTime(startTime)}`}
      />
    )
  }

  if (cell.type === 'ownBooking' && cell.booking) {
    const start = new Date(cell.booking.startTime)
    const end = new Date(cell.booking.endTime)
    return (
      <div
        style={{
          ...style,
          backgroundColor: color,
          border: '3px solid #000',
          boxShadow: '4px 4px 0 0 #000',
          padding: '8px 10px',
          overflow: 'hidden',
          zIndex: 10,
          cursor: 'pointer',
        }}
        className="my-booking flex flex-col"
      >
        <div
          className="font-grotesk font-black text-xs uppercase truncate leading-tight"
          style={{ color: textColor, letterSpacing: '0.3px' }}
        >
          {cell.booking.title}
        </div>
        <div className="font-mono text-[10px] mt-0.5" style={{ color: textColor, opacity: 0.8 }}>
          {formatTime(start)} → {formatTime(end)}
        </div>
        <div
          className="absolute bottom-1 right-1.5 font-mono text-[9px] font-bold uppercase px-1 border"
          style={{
            background: 'rgba(0,0,0,0.2)',
            color: textColor,
            borderColor: 'rgba(0,0,0,0.3)',
          }}
        >
          我的
        </div>
      </div>
    )
  }

  if (cell.type === 'otherBooking' && cell.booking) {
    const start = new Date(cell.booking.startTime)
    const end = new Date(cell.booking.endTime)
    return (
      <div
        style={{
          ...style,
          backgroundColor: '#d1d5db',
          border: '3px solid #000',
          padding: '8px 10px',
          overflow: 'hidden',
          zIndex: 10,
        }}
        className="flex flex-col cursor-default"
      >
        <div className="font-grotesk font-black text-[11px] uppercase text-gray-600">已预订</div>
        <div className="font-mono text-[10px] text-gray-400 mt-0.5">
          {formatTime(start)} → {formatTime(end)}
        </div>
      </div>
    )
  }

  if (cell.type === 'blocked') {
    return (
      <div
        style={{
          ...style,
          background: 'repeating-linear-gradient(-45deg, #d1d5db, #d1d5db 3px, #f3f4f6 3px, #f3f4f6 10px)',
          border: '3px solid #9ca3af',
          zIndex: 10,
          cursor: 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cell.blockedSlot?.reason && (
          <span className="font-mono text-[10px] font-bold text-gray-600 uppercase px-1.5 py-0.5 border border-gray-400"
            style={{ background: 'rgba(255,255,255,0.75)' }}>
            🔒 {cell.blockedSlot.reason}
          </span>
        )}
      </div>
    )
  }

  return null
}
