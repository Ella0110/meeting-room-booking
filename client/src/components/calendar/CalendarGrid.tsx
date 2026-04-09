import type { Room, Booking, BlockedSlot } from '../../types'
import { TIME_SLOTS, slotIndexOf, durationInSlots } from '../../utils/dateUtils'
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

function computeRoomCells(
  roomId: string,
  bookings: Booking[],
  blockedSlots: BlockedSlot[]
): (CellData | null)[] {
  const cells: (CellData | null)[] = Array(18).fill(null)
  const covered = new Set<number>()

  for (const booking of bookings.filter((b) => b.roomId === roomId)) {
    const s = slotIndexOf(new Date(booking.startTime))
    const span = durationInSlots(booking.startTime, booking.endTime)
    if (s < 0 || s >= 18) continue
    cells[s] = { slotIdx: s, span, type: booking.isOwn ? 'ownBooking' : 'otherBooking', booking }
    for (let i = s + 1; i < s + span && i < 18; i++) covered.add(i)
  }

  for (const slot of blockedSlots.filter((b) => b.roomId === roomId)) {
    const s = slotIndexOf(new Date(slot.startTime))
    const span = durationInSlots(slot.startTime, slot.endTime)
    if (s < 0 || s >= 18) continue
    cells[s] = { slotIdx: s, span, type: 'blocked', blockedSlot: slot }
    for (let i = s + 1; i < s + span && i < 18; i++) covered.add(i)
  }

  for (let i = 0; i < 18; i++) {
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

  const colCount = rooms.length

  return (
    <div className="h-full overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `72px repeat(${colCount}, minmax(148px, 1fr))`,
          gridTemplateRows: `52px repeat(18, 58px)`,
          minWidth: `${72 + colCount * 148}px`,
        }}
      >
        {/* Corner: TIME label */}
        <div
          style={{ gridRow: 1, gridColumn: 1, borderRight: '4px solid #000', borderBottom: '4px solid #000' }}
          className="sticky top-0 left-0 z-20 bg-white flex items-end justify-end pb-2 pr-2"
        >
          <span className="font-mono text-[10px] font-bold text-gray-400 uppercase">TIME</span>
        </div>

        {/* Room headers — colored background */}
        {rooms.map((room, rIdx) => {
          const bg = getRoomColor(rIdx)
          const fg = getRoomTextColor(rIdx)
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

        {/* Time labels */}
        {TIME_SLOTS.map((slot, sIdx) => (
          <div
            key={slot}
            style={{
              gridRow: sIdx + 2,
              gridColumn: 1,
              borderRight: '4px solid #000',
              borderBottom: sIdx % 2 === 0 ? '1px solid #e5e7eb' : '1px dashed #f0f0f0',
            }}
            className="sticky left-0 z-10 bg-white px-2 flex items-start justify-end pt-1"
          >
            <span className={sIdx % 2 === 0
              ? 'font-mono text-[11px] font-bold text-gray-800'
              : 'font-mono text-[9px] text-gray-300'}
            >
              {slot}
            </span>
          </div>
        ))}

        {/* Room cells */}
        {rooms.map((room, rIdx) =>
          computeRoomCells(room.id, bookings, blockedSlots).map((cell) => {
            if (!cell) return null
            return (
              <CalendarCell
                key={`${room.id}-${cell.slotIdx}`}
                cell={cell}
                room={room}
                colorIndex={rIdx}
                selectedDate={selectedDate}
                onCellClick={onCellClick}
                style={{ gridRow: `${cell.slotIdx + 2} / span ${cell.span}`, gridColumn: rIdx + 2 }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
