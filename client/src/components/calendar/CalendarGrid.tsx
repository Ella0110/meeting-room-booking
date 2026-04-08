import type { Room, Booking, BlockedSlot } from '../../types'
import { TIME_SLOTS, slotIndexOf, durationInSlots } from '../../utils/dateUtils'
import { getRoomColor } from '../../utils/roomColors'
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
    <div className="overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${roomCount}, minmax(120px, 1fr))`,
          gridTemplateRows: `48px repeat(18, 52px)`,
          minWidth: `${80 + roomCount * 120}px`,
        }}
      >
        <div className="border-r-4 border-b-4 border-black" />
        {Array.from({ length: roomCount }, (_, i) => (
          <div key={i} className="border-r-2 border-b-4 border-black p-2 flex items-center">
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
        {Array.from({ length: 18 }, (_, row) => (
          <>
            <div key={`label-${row}`} className="border-r-4 border-b-2 border-black px-2 flex items-center">
              <Skeleton className="h-3 w-10" />
            </div>
            {Array.from({ length: roomCount }, (_, col) => (
              <div key={`cell-${row}-${col}`} className="border-r-2 border-b-2 border-black" />
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
    <div className="overflow-auto border-4 border-black">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${colCount}, minmax(140px, 1fr))`,
          gridTemplateRows: `48px repeat(18, 52px)`,
          minWidth: `${80 + colCount * 140}px`,
        }}
      >
        {/* Corner */}
        <div style={{ gridRow: 1, gridColumn: 1 }}
          className="sticky top-0 left-0 z-20 bg-white border-r-4 border-b-4 border-black" />

        {/* Room headers */}
        {rooms.map((room, rIdx) => (
          <div
            key={room.id}
            style={{ gridRow: 1, gridColumn: rIdx + 2, borderBottom: '4px solid #000', borderRight: '2px solid #000' }}
            className="sticky top-0 z-20 bg-white flex items-center gap-2 px-3"
          >
            <div className="w-3 h-3 border-2 border-black flex-shrink-0"
              style={{ backgroundColor: getRoomColor(rIdx) }} />
            <span className="font-grotesk font-black text-sm uppercase truncate">{room.name}</span>
            <span className="font-mono text-xs text-gray-600 hidden lg:block">({room.capacity}人)</span>
          </div>
        ))}

        {/* Time labels */}
        {TIME_SLOTS.map((slot, sIdx) => (
          <div key={slot} style={{ gridRow: sIdx + 2, gridColumn: 1 }}
            className="sticky left-0 z-10 bg-white border-r-4 border-b-2 border-black px-2 flex items-center">
            <span className="font-mono text-xs text-gray-700">{slot}</span>
          </div>
        ))}

        {/* Room cells */}
        {rooms.map((room, rIdx) =>
          computeRoomCells(room.id, bookings, blockedSlots).map((cell) => {
            if (!cell) return null
            return (
              <CalendarCell
                key={`${room.id}-${cell.slotIdx}`}
                cell={cell} room={room} colorIndex={rIdx}
                selectedDate={selectedDate} onCellClick={onCellClick}
                style={{ gridRow: `${cell.slotIdx + 2} / span ${cell.span}`, gridColumn: rIdx + 2 }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
