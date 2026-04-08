import { useState } from 'react'
import { useRooms } from '../hooks/useRooms'
import { useBookings } from '../hooks/useBookings'
import { useBlockedSlots } from '../hooks/useBlockedSlots'
import CalendarHeader from '../components/calendar/CalendarHeader'
import CalendarGrid from '../components/calendar/CalendarGrid'
import MobileCalendar from '../components/calendar/MobileCalendar'
import BookingPanel from '../components/booking/BookingPanel'
import type { Room } from '../types'
import { formatDate, getWeekDates, isSameDay } from '../utils/dateUtils'

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function WeekOverview({ selectedDate, onDayClick }: { selectedDate: Date; onDayClick: (d: Date) => void }) {
  const week = getWeekDates(selectedDate)
  const today = new Date()
  return (
    <div className="flex-1 p-4 overflow-auto">
      <p className="font-mono text-sm mb-4 text-gray-600">点击某天切换到日视图</p>
      <div className="grid grid-cols-7 gap-2 max-w-3xl">
        {week.map((day, i) => {
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDate)
          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`rounded-none border-4 border-black p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                isSelected ? 'bg-black text-white' : isToday ? 'bg-[#FFBE0B]' : 'bg-white'
              }`}
            >
              <div className="font-grotesk font-black text-xs uppercase">周{DAY_LABELS[i]}</div>
              <div className="font-mono text-lg font-bold mt-1">{day.getDate()}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelRoom, setPanelRoom] = useState<Room | null>(null)
  const [panelColorIndex, setPanelColorIndex] = useState(0)
  const [panelStartTime, setPanelStartTime] = useState<Date | null>(null)

  const dateStr = formatDate(selectedDate)
  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(dateStr)
  const { data: blockedSlots = [] } = useBlockedSlots(dateStr)

  function handleCellClick(room: Room, startTime: Date) {
    const idx = rooms.findIndex((r) => r.id === room.id)
    setPanelRoom(room)
    setPanelColorIndex(idx >= 0 ? idx : 0)
    setPanelStartTime(startTime)
    setPanelOpen(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <CalendarHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        view={view}
        onViewChange={setView}
      />

      {view === 'week' ? (
        <WeekOverview selectedDate={selectedDate} onDayClick={(d) => { setSelectedDate(d); setView('day') }} />
      ) : (
        <>
          <div className="hidden md:block flex-1 overflow-auto">
            <CalendarGrid
              rooms={rooms}
              bookings={bookings}
              blockedSlots={blockedSlots}
              selectedDate={selectedDate}
              onCellClick={handleCellClick}
              isLoading={roomsLoading || bookingsLoading}
            />
          </div>
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
        </>
      )}

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
