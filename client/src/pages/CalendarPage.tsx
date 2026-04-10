import { useState } from 'react'
import { useRooms } from '../hooks/useRooms'
import { useBookings } from '../hooks/useBookings'
import { useBlockedSlots } from '../hooks/useBlockedSlots'
import CalendarHeader from '../components/calendar/CalendarHeader'
import CalendarGrid from '../components/calendar/CalendarGrid'
import WeekCalendarGrid from '../components/calendar/WeekCalendarGrid'
import MobileCalendar from '../components/calendar/MobileCalendar'
import BookingPanel from '../components/booking/BookingPanel'
import type { Room } from '../types'
import { formatDate } from '../utils/dateUtils'
import { getRoomColor } from '../utils/roomColors'

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelRoom, setPanelRoom] = useState<Room | null>(null)
  const [panelColorIndex, setPanelColorIndex] = useState(0)
  const [panelStartTime, setPanelStartTime] = useState<Date | null>(null)

  const dateStr = formatDate(selectedDate)
  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(dateStr)
  const { data: blockedSlots = [] } = useBlockedSlots(dateStr)

  function handleCellClick(room: Room, startTime: Date) {
    setPanelRoom(room)
    setPanelColorIndex(room.colorIndex ?? 0)
    setPanelStartTime(startTime)
    setPanelOpen(true)
  }

  function handleDaySelect(date: Date) {
    setSelectedDate(date)
    setViewMode('day')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <CalendarHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Legend row — desktop only, day mode only */}
      {viewMode === 'day' && (
        <div className="hidden md:block bg-white overflow-x-auto" style={{ borderBottom: '2px solid #000', padding: '8px 24px' }}>
          <div className="flex items-center gap-2.5 max-w-[1600px] mx-auto flex-nowrap">
            <span className="font-mono text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">ROOMS:</span>
            <div className="flex gap-2 flex-nowrap">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-1.5">
                  <span style={{ width: 14, height: 14, background: getRoomColor(room.colorIndex ?? 0), border: '2px solid #000', display: 'inline-block', flexShrink: 0 }} />
                  <span className="font-grotesk font-black text-[11px] whitespace-nowrap">{room.name}</span>
                  <span className="font-mono text-[9px] text-gray-400">{room.capacity}人</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-2">
                <span style={{ width: 14, height: 14, background: '#d1d5db', border: '2px solid #000', display: 'inline-block', flexShrink: 0 }} />
                <span className="font-grotesk font-black text-[11px] whitespace-nowrap">他人预订</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ width: 14, height: 14, background: 'repeating-linear-gradient(-45deg,#d1d5db,#d1d5db 3px,#f3f4f6 3px,#f3f4f6 10px)', border: '2px solid #000', display: 'inline-block', flexShrink: 0 }} />
                <span className="font-grotesk font-black text-[11px] whitespace-nowrap">封锁时段</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop grid */}
      <div className="hidden md:block flex-1 min-h-0">
        {viewMode === 'week' ? (
          <WeekCalendarGrid
            rooms={rooms}
            selectedDate={selectedDate}
            onDaySelect={handleDaySelect}
          />
        ) : (
          <CalendarGrid
            rooms={rooms}
            bookings={bookings}
            blockedSlots={blockedSlots}
            selectedDate={selectedDate}
            onCellClick={handleCellClick}
            isLoading={roomsLoading || bookingsLoading}
          />
        )}
      </div>

      {/* Mobile (day view only) */}
      <div className="md:hidden flex-1 overflow-hidden">
        <MobileCalendar
          rooms={rooms}
          bookings={bookings}
          blockedSlots={blockedSlots}
          selectedDate={selectedDate}
          onCellClick={handleCellClick}
          isLoading={roomsLoading || bookingsLoading}
        />
      </div>

      <BookingPanel
        isOpen={panelOpen}
        room={panelRoom}
        colorIndex={panelColorIndex}
        startTime={panelStartTime}
        date={dateStr}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
