import { useQueries } from '@tanstack/react-query'
import type { Room, Booking, BlockedSlot } from '../../types'
import { TIME_SLOTS, getWeekDates, formatDate, slotIndexOf, durationInSlots, isSameDay } from '../../utils/dateUtils'
import { listBookings, listBlockedSlots } from '../../api/bookings'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
import Skeleton from '../Skeleton'

const ROW_H = 40
const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日']

interface WeekCalendarGridProps {
  rooms: Room[]
  selectedDate: Date
  onDaySelect: (date: Date) => void
}

interface LayoutItem {
  id: string
  slotStart: number
  slotDuration: number
  isOwn: boolean
  isBlocked: boolean
  roomId: string
  title: string
  lane: number
  totalLanes: number
}

function layoutDayItems(bookings: Booking[], blockedSlots: BlockedSlot[]): LayoutItem[] {
  const raw: Omit<LayoutItem, 'lane' | 'totalLanes'>[] = [
    ...bookings.map(b => ({
      id: b.id,
      slotStart: slotIndexOf(new Date(b.startTime)),
      slotDuration: Math.max(1, durationInSlots(b.startTime, b.endTime)),
      isOwn: b.isOwn,
      isBlocked: false,
      roomId: b.roomId,
      title: b.isOwn ? b.title : '已预订',
    })),
    ...blockedSlots.map(bs => ({
      id: `blocked-${bs.id}`,
      slotStart: slotIndexOf(new Date(bs.startTime)),
      slotDuration: Math.max(1, durationInSlots(bs.startTime, bs.endTime)),
      isOwn: false,
      isBlocked: true,
      roomId: bs.roomId,
      title: bs.reason || '封锁',
    })),
  ].filter(item => item.slotStart >= 0 && item.slotStart < 18)

  const sorted = [...raw].sort((a, b) =>
    a.slotStart !== b.slotStart ? a.slotStart - b.slotStart : (a.isOwn ? -1 : 1)
  )

  const result: LayoutItem[] = []
  const laneEnds: number[] = []

  for (const item of sorted) {
    let lane = laneEnds.findIndex(end => end <= item.slotStart)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.slotStart + item.slotDuration
    result.push({ ...item, lane, totalLanes: 0 })
  }

  for (const item of result) {
    const overlapping = result.filter(o =>
      o.slotStart < item.slotStart + item.slotDuration &&
      o.slotStart + o.slotDuration > item.slotStart
    )
    item.totalLanes = Math.max(...overlapping.map(o => o.lane)) + 1
  }

  return result
}

export default function WeekCalendarGrid({ rooms, selectedDate, onDaySelect }: WeekCalendarGridProps) {
  const today = new Date()
  const weekDates = getWeekDates(selectedDate)

  const bookingResults = useQueries({
    queries: weekDates.map(d => ({
      queryKey: ['bookings', formatDate(d)],
      queryFn: () => listBookings(formatDate(d)),
    })),
  })

  const blockedResults = useQueries({
    queries: weekDates.map(d => ({
      queryKey: ['blocked-slots', formatDate(d)],
      queryFn: () => listBlockedSlots(formatDate(d)),
    })),
  })

  const isLoading = bookingResults.some(q => q.isLoading) || blockedResults.some(q => q.isLoading)

  if (isLoading) {
    return (
      <div className="h-full overflow-auto border-4 border-black">
        <div
          className="grid"
          style={{ gridTemplateColumns: `56px repeat(7, minmax(80px, 1fr))`, gridTemplateRows: `52px repeat(4, ${ROW_H}px)`, minWidth: `${56 + 7 * 80}px` }}
        >
          <div style={{ gridRow: 1, gridColumn: 1, borderRight: '4px solid #000', borderBottom: '4px solid #000' }} />
          {weekDates.map((_, i) => (
            <div key={i} style={{ gridRow: 1, gridColumn: i + 2, borderRight: '4px solid #000', borderBottom: '4px solid #000' }}
              className="flex items-center justify-center p-2">
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
          {[0, 1, 2, 3].map(row => (
            [0, 1, 2, 3, 4, 5, 6, 7].map(col => (
              <div key={`${row}-${col}`}
                style={{ gridRow: row + 2, gridColumn: col + 1, borderRight: col < 7 ? '1px solid #e5e7eb' : 'none', borderBottom: '1px solid #e5e7eb' }} />
            ))
          ))}
        </div>
      </div>
    )
  }

  const bookingsByDay = bookingResults.map(r => r.data ?? [])
  const blockedByDay = blockedResults.map(r => r.data ?? [])

  return (
    <div className="h-full overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `56px repeat(7, minmax(80px, 1fr))`,
          gridTemplateRows: `52px ${18 * ROW_H}px`,
          minWidth: `${56 + 7 * 80}px`,
        }}
      >
        {/* Corner */}
        <div
          className="sticky top-0 left-0 z-30 bg-white flex items-end justify-end pb-2 pr-2"
          style={{ gridRow: 1, gridColumn: 1, borderRight: '4px solid #000', borderBottom: '4px solid #000' }}
        >
          <span className="font-mono text-[10px] font-bold text-gray-400 uppercase">TIME</span>
        </div>

        {/* Day headers */}
        {weekDates.map((date, dIdx) => {
          const isToday = isSameDay(date, today)
          return (
            <button
              key={dIdx}
              onClick={() => onDaySelect(date)}
              className="sticky top-0 z-20 flex flex-col items-center justify-center transition-opacity hover:opacity-75"
              style={{
                gridRow: 1, gridColumn: dIdx + 2,
                backgroundColor: isToday ? '#000' : '#fff',
                borderBottom: '4px solid #000',
                borderRight: '4px solid #000',
                padding: '6px 4px',
                cursor: 'pointer',
              }}
            >
              <span className="font-mono text-[9px] uppercase" style={{ color: isToday ? '#FFBE0B' : 'rgba(0,0,0,0.5)' }}>
                {DAY_NAMES[dIdx]}
              </span>
              <span className="font-grotesk font-black text-sm leading-tight" style={{ color: isToday ? '#FFBE0B' : '#000' }}>
                {date.getDate()}
              </span>
              {isToday && (
                <span className="font-mono text-[7px] uppercase tracking-wide" style={{ color: '#FFBE0B' }}>TODAY</span>
              )}
            </button>
          )
        })}

        {/* Time labels */}
        <div
          className="sticky left-0 z-10 bg-white"
          style={{ gridRow: 2, gridColumn: 1, borderRight: '4px solid #000' }}
        >
          {TIME_SLOTS.map((slot, i) => {
            const isHour = i % 2 === 0
            return (
              <div
                key={slot}
                style={{ height: ROW_H, borderBottom: isHour ? '1px solid #e5e7eb' : '1px dashed #f0f0f0' }}
                className="flex items-start justify-end px-2 pt-0.5"
              >
                {isHour && (
                  <span className="font-mono text-[10px] font-bold text-gray-700">{slot}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        {weekDates.map((date, dIdx) => {
          const isToday = isSameDay(date, today)
          const items = layoutDayItems(bookingsByDay[dIdx], blockedByDay[dIdx])

          return (
            <div
              key={dIdx}
              style={{
                gridRow: 2, gridColumn: dIdx + 2,
                position: 'relative',
                borderRight: '4px solid #000',
                backgroundColor: isToday ? 'rgba(255,190,11,0.05)' : '#fff',
                height: 18 * ROW_H,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => onDaySelect(date)}
            >
              {/* Background grid lines */}
              {TIME_SLOTS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: i * ROW_H, left: 0, right: 0, height: ROW_H,
                    borderBottom: i % 2 === 0 ? '1px solid #e5e7eb' : '1px dashed #f0f0f0',
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Booking / blocked blocks */}
              {items.map(item => {
                const room = rooms.find(r => r.id === item.roomId)
                const ci = room?.colorIndex ?? 0
                const bg = item.isBlocked
                  ? undefined
                  : item.isOwn ? getRoomColor(ci) : '#d1d5db'
                const tc = item.isOwn && !item.isBlocked ? getRoomTextColor(ci) : '#374151'
                const top = item.slotStart * ROW_H + 1
                const height = item.slotDuration * ROW_H - 2
                const leftPct = (item.lane / item.totalLanes) * 100
                const widthPct = (1 / item.totalLanes) * 100

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top,
                      height,
                      left: `calc(${leftPct}% + 1px)`,
                      width: `calc(${widthPct}% - 2px)`,
                      background: item.isBlocked
                        ? 'repeating-linear-gradient(-45deg,#d1d5db,#d1d5db 3px,#f3f4f6 3px,#f3f4f6 8px)'
                        : bg,
                      border: item.isOwn && !item.isBlocked ? '2px solid #000' : '1px solid rgba(0,0,0,0.15)',
                      boxShadow: item.isOwn && !item.isBlocked ? '2px 2px 0 0 rgba(0,0,0,0.5)' : 'none',
                      overflow: 'hidden',
                      zIndex: item.isOwn ? 2 : 1,
                      padding: '1px 3px',
                      pointerEvents: 'none',
                    }}
                  >
                    {height >= 22 && (
                      <span
                        className="font-grotesk font-black text-[9px] uppercase leading-tight truncate block"
                        style={{ color: tc }}
                      >
                        {item.title}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
