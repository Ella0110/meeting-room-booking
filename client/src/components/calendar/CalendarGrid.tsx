import type { Room, Booking, BlockedSlot } from '../../types'
import { TIME_SLOTS, slotIndexOf, durationInSlots, isSameDay } from '../../utils/dateUtils'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
import CalendarCell, { type CellData } from './CalendarCell'
import Skeleton from '../Skeleton'

interface CalendarGridProps {
  rooms: Room[]
  bookings: Booking[]
  blockedSlots: BlockedSlot[]
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  isLoading: boolean
}

/** For today, returns the slot index of the next whole hour (e.g. 14:23 → slot for 15:00).
 *  Returns 0 for other dates, 18 if business hours are over. */
function getFirstSlotIdx(selectedDate: Date): number {
  if (!isSameDay(selectedDate, new Date())) return 0
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const nextWholeHour = m === 0 ? h : h + 1
  const idx = (nextWholeHour - 9) * 2 // each hour = 2 half-hour slots
  // Cap at 10 so at least 8 slots (10→17) are always visible when near end of day
  return Math.max(0, Math.min(10, idx))
}

/** Build cells for one room, clipping any bookings/blocks that overlap firstSlotIdx. */
function computeRoomCells(
  roomId: string,
  bookings: Booking[],
  blockedSlots: BlockedSlot[],
  firstSlotIdx: number,
): (CellData | null)[] {
  const cells: (CellData | null)[] = Array(18).fill(null)
  const covered = new Set<number>()

  for (const booking of bookings.filter((b) => b.roomId === roomId)) {
    const s = slotIndexOf(new Date(booking.startTime))
    const span = durationInSlots(booking.startTime, booking.endTime)
    if (s + span <= firstSlotIdx || s >= 18) continue // entirely before window or out of range
    const visStart = Math.max(s, firstSlotIdx)
    const visSpan = span - (visStart - s)
    cells[visStart] = { slotIdx: visStart, span: visSpan, type: booking.isOwn ? 'ownBooking' : 'otherBooking', booking }
    for (let i = visStart + 1; i < visStart + visSpan && i < 18; i++) covered.add(i)
  }

  for (const slot of blockedSlots.filter((b) => b.roomId === roomId)) {
    const s = slotIndexOf(new Date(slot.startTime))
    const span = durationInSlots(slot.startTime, slot.endTime)
    if (s + span <= firstSlotIdx || s >= 18) continue
    const visStart = Math.max(s, firstSlotIdx)
    const visSpan = span - (visStart - s)
    cells[visStart] = { slotIdx: visStart, span: visSpan, type: 'blocked', blockedSlot: slot }
    for (let i = visStart + 1; i < visStart + visSpan && i < 18; i++) covered.add(i)
  }

  for (let i = firstSlotIdx; i < 18; i++) {
    if (!cells[i] && !covered.has(i)) {
      cells[i] = { slotIdx: i, span: 1, type: 'free' }
    }
  }

  return cells
}

function CalendarGridSkeleton({ roomCount }: { roomCount: number }) {
  return (
    <div className="h-full overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `72px repeat(${roomCount}, minmax(148px, 1fr))`,
          gridTemplateRows: `52px repeat(18, 58px)`,
          minWidth: `${72 + roomCount * 148}px`,
        }}
      >
        <div className="border-r-4 border-b-4 border-black" />
        {Array.from({ length: roomCount }, (_, i) => (
          <div key={i} className="border-r-4 border-b-4 border-black p-3 flex items-center">
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
        {Array.from({ length: 18 }, (_, row) => (
          <>
            <div key={`label-${row}`} className="border-r-4 border-black px-2 flex items-start justify-end pt-1"
              style={{ borderBottom: row % 2 === 0 ? '1px solid #e5e7eb' : '1px dashed #f0f0f0' }}>
              {row % 2 === 0 && <Skeleton className="h-3 w-10" />}
            </div>
            {Array.from({ length: roomCount }, (_, col) => (
              <div key={`cell-${row}-${col}`}
                style={{ borderRight: '1px solid #e5e7eb', borderBottom: row % 2 === 0 ? '1px solid #e5e7eb' : '1px dashed #f0f0f0' }} />
            ))}
          </>
        ))}
      </div>
    </div>
  )
}

export default function CalendarGrid({
  rooms, bookings, blockedSlots, selectedDate, onCellClick, isLoading,
}: CalendarGridProps) {
  if (isLoading) return <CalendarGridSkeleton roomCount={rooms.length || 4} />

  const firstSlotIdx = getFirstSlotIdx(selectedDate)
  const visibleSlots = TIME_SLOTS.slice(firstSlotIdx) // e.g. ['15:00', '15:30', ...]
  const colCount = rooms.length

  // After 18:00 today — nothing to show
  if (visibleSlots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center border-4 border-black bg-white">
        <div className="text-center">
          <p className="font-grotesk font-black text-2xl uppercase">今日预订已结束</p>
          <p className="font-mono text-sm text-gray-400 mt-2">营业时间 09:00–18:00</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `72px repeat(${colCount}, minmax(148px, 1fr))`,
          gridTemplateRows: `52px repeat(${visibleSlots.length}, 58px)`,
          minWidth: `${72 + colCount * 148}px`,
        }}
      >
        {/* Corner */}
        <div
          style={{ gridRow: 1, gridColumn: 1, borderRight: '4px solid #000', borderBottom: '4px solid #000' }}
          className="sticky top-0 left-0 z-20 bg-white flex items-end justify-end pb-2 pr-2"
        >
          <span className="font-mono text-[10px] font-bold text-gray-400 uppercase">TIME</span>
        </div>

        {/* Room headers */}
        {rooms.map((room, rIdx) => {
          const ci = room.colorIndex ?? rIdx  // fallback to array index if server hasn't restarted
          const bg = getRoomColor(ci)
          const fg = getRoomTextColor(ci)
          return (
            <div
              key={room.id}
              style={{
                gridRow: 1,
                gridColumn: rIdx + 2,
                backgroundColor: bg,
                borderBottom: '4px solid #000',
                borderRight: '4px solid #000',
                padding: '10px 12px',
              }}
              className="sticky top-0 z-20 flex flex-col justify-center"
            >
              <div className="font-grotesk font-black text-sm uppercase" style={{ color: fg }}>
                {room.name}
              </div>
              <div className="font-mono text-[10px] mt-0.5 uppercase" style={{ color: fg, opacity: 0.85 }}>
                {room.capacity}人 · {room.zone}
              </div>
            </div>
          )
        })}

        {/* Time labels — only visible slots */}
        {visibleSlots.map((slot, vIdx) => {
          const absIdx = firstSlotIdx + vIdx
          const isHour = absIdx % 2 === 0
          return (
            <div
              key={slot}
              style={{
                gridRow: vIdx + 2,
                gridColumn: 1,
                borderRight: '4px solid #000',
                borderBottom: isHour ? '1px solid #e5e7eb' : '1px dashed #f0f0f0',
              }}
              className="sticky left-0 z-10 bg-white px-2 flex items-start justify-end pt-1"
            >
              <span className={isHour
                ? 'font-mono text-[11px] font-bold text-gray-800'
                : 'font-mono text-[9px] text-gray-300'}
              >
                {slot}
              </span>
            </div>
          )
        })}

        {/* Room cells — skip slots before firstSlotIdx, offset gridRow */}
        {rooms.map((room, rIdx) =>
          computeRoomCells(room.id, bookings, blockedSlots, firstSlotIdx).map((cell) => {
            if (!cell) return null
            const gridRowStart = cell.slotIdx - firstSlotIdx + 2
            return (
              <CalendarCell
                key={`${room.id}-${cell.slotIdx}`}
                cell={cell}
                room={room}
                colorIndex={room.colorIndex ?? rIdx}
                selectedDate={selectedDate}
                onCellClick={onCellClick}
                style={{ gridRow: `${gridRowStart} / span ${cell.span}`, gridColumn: rIdx + 2 }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
