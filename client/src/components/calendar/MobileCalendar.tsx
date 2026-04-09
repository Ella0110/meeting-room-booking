import { useState } from 'react'
import type { Room, Booking, BlockedSlot } from '../../types'
import { TIME_SLOTS, slotIndexOf, durationInSlots, slotToDateTime, formatTime, isSameDay } from '../../utils/dateUtils'
import { getRoomColor } from '../../utils/roomColors'
import Skeleton from '../Skeleton'

interface MobileCalendarProps {
  rooms: Room[]
  bookings: Booking[]
  blockedSlots: BlockedSlot[]
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  isLoading: boolean
}

interface SlotState {
  type: 'free' | 'ownBooking' | 'otherBooking' | 'blocked'
  booking?: Booking
  blockedSlot?: BlockedSlot
}

function computeSlotStates(
  roomId: string,
  bookings: Booking[],
  blockedSlots: BlockedSlot[]
): SlotState[] {
  const states: SlotState[] = Array.from({ length: 18 }, () => ({ type: 'free' }))

  for (const b of bookings.filter((x) => x.roomId === roomId)) {
    const s = slotIndexOf(new Date(b.startTime))
    const span = durationInSlots(b.startTime, b.endTime)
    for (let i = s; i < s + span && i < 18; i++) {
      states[i] = { type: b.isOwn ? 'ownBooking' : 'otherBooking', booking: b }
    }
  }

  for (const slot of blockedSlots.filter((x) => x.roomId === roomId)) {
    const s = slotIndexOf(new Date(slot.startTime))
    const span = durationInSlots(slot.startTime, slot.endTime)
    for (let i = s; i < s + span && i < 18; i++) {
      states[i] = { type: 'blocked', blockedSlot: slot }
    }
  }

  return states
}

export default function MobileCalendar({
  rooms, bookings, blockedSlots, selectedDate, onCellClick, isLoading,
}: MobileCalendarProps) {
  const [activeRoomIdx, setActiveRoomIdx] = useState(0)

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex border-b-4 border-black overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-r-2 border-black flex-shrink-0">
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return <div className="p-4 font-mono text-sm text-gray-600">暂无会议室</div>
  }

  const activeRoom = rooms[activeRoomIdx]
  const color = getRoomColor(activeRoom.colorIndex)
  const slotStates = computeSlotStates(activeRoom.id, bookings, blockedSlots)

  // For today: hide past slots, start from next whole hour
  const firstSlotIdx = (() => {
    if (!isSameDay(selectedDate, new Date())) return 0
    const now = new Date()
    const h = now.getHours(); const m = now.getMinutes()
    const nextHour = m === 0 ? h : h + 1
    return Math.max(0, Math.min(18, (nextHour - 9) * 2))
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Room tabs */}
      <div className="flex border-b-4 border-black overflow-x-auto flex-shrink-0">
        {rooms.map((room, i) => (
          <button
            key={room.id}
            onClick={() => setActiveRoomIdx(i)}
            className={`px-4 py-3 font-grotesk font-black text-sm uppercase border-r-2 border-black flex-shrink-0 transition-all ${
              i === activeRoomIdx
                ? 'bg-black text-white'
                : 'bg-white hover:bg-[#FFFBEB]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 border border-black flex-shrink-0"
                style={{ backgroundColor: getRoomColor(room.colorIndex) }}
              />
              {room.name}
            </div>
          </button>
        ))}
      </div>

      {/* Room info bar */}
      <div
        className="px-4 py-2 border-b-4 border-black flex items-center gap-4 flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <span className="font-grotesk font-black text-sm">{activeRoom.capacity} 人</span>
        <span className="font-mono text-xs">{activeRoom.zone}</span>
        {activeRoom.location && <span className="font-mono text-xs">{activeRoom.location}</span>}
      </div>

      {/* Vertical timeline */}
      <div className="flex-1 overflow-y-auto">
        {firstSlotIdx >= 18 && (
          <div className="p-6 text-center">
            <p className="font-grotesk font-black text-lg uppercase">今日预订已结束</p>
            <p className="font-mono text-xs text-gray-400 mt-1">营业时间 09:00–18:00</p>
          </div>
        )}
        {TIME_SLOTS.slice(firstSlotIdx).map((slot, vIdx) => {
          const i = firstSlotIdx + vIdx
          const state = slotStates[i]
          const startTime = slotToDateTime(selectedDate, i)

          if (state.type === 'free') {
            return (
              <button
                key={slot}
                onClick={() => onCellClick(activeRoom, startTime)}
                aria-label={`预订 ${activeRoom.name} ${slot}`}
                className="w-full flex items-center border-b-2 border-black hover:bg-[#FFFBEB] transition-colors px-4 py-3 text-left"
              >
                <span className="font-mono text-xs text-gray-500 w-12 flex-shrink-0">{slot}</span>
                <span className="font-mono text-xs text-gray-400 ml-2">空闲 — 点击预订</span>
              </button>
            )
          }

          if (state.type === 'ownBooking' && state.booking) {
            const isStart = slotIndexOf(new Date(state.booking.startTime)) === i
            if (!isStart) return <div key={slot} className="h-12 border-b border-gray-200" />
            const durationSlots = durationInSlots(state.booking.startTime, state.booking.endTime)
            return (
              <div
                key={slot}
                className="flex items-start border-b-2 border-black px-4 py-3"
                style={{
                  backgroundColor: color,
                  borderLeft: '4px solid #000',
                  minHeight: `${durationSlots * 52}px`,
                }}
              >
                <span className="font-mono text-xs text-gray-600 w-12 flex-shrink-0">{slot}</span>
                <div className="ml-2">
                  <p className="font-grotesk font-black text-sm">{state.booking.title}</p>
                  <p className="font-mono text-xs opacity-80">
                    {formatTime(new Date(state.booking.startTime))}–{formatTime(new Date(state.booking.endTime))}
                  </p>
                </div>
              </div>
            )
          }

          if (state.type === 'otherBooking') {
            const isStart = state.booking && slotIndexOf(new Date(state.booking.startTime)) === i
            if (!isStart) return <div key={slot} className="h-12 border-b border-gray-200" />
            return (
              <div
                key={slot}
                className="flex items-center border-b-2 border-black px-4 py-3 bg-[#d1d5db]"
              >
                <span className="font-mono text-xs text-gray-500 w-12 flex-shrink-0">{slot}</span>
                <span className="font-mono text-xs text-gray-600 ml-2">已预订</span>
              </div>
            )
          }

          if (state.type === 'blocked') {
            const isStart = state.blockedSlot && slotIndexOf(new Date(state.blockedSlot.startTime)) === i
            if (!isStart) return <div key={slot} className="h-12 border-b border-gray-200" />
            return (
              <div
                key={slot}
                className="flex items-center border-b-2 border-black px-4 py-3"
                style={{
                  background: 'repeating-linear-gradient(-45deg, #d1d5db, #d1d5db 4px, #f3f4f6 4px, #f3f4f6 12px)',
                  cursor: 'not-allowed',
                }}
              >
                <span className="font-mono text-xs text-gray-500 w-12 flex-shrink-0">{slot}</span>
                <span className="font-mono text-xs text-gray-600 ml-2">
                  封锁中{state.blockedSlot?.reason ? `：${state.blockedSlot.reason}` : ''}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
