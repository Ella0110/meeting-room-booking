import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRooms } from '../hooks/useRooms'
import { useBookings } from '../hooks/useBookings'
import { useBlockedSlots } from '../hooks/useBlockedSlots'
import CalendarHeader from '../components/calendar/CalendarHeader'
import CalendarGrid from '../components/calendar/CalendarGrid'
import WeekCalendarGrid from '../components/calendar/WeekCalendarGrid'
import MobileCalendar from '../components/calendar/MobileCalendar'
import BookingPanel from '../components/booking/BookingPanel'
import type { Room, Booking, BlockedSlot } from '../types'
import { formatDate } from '../utils/dateUtils'
import { getRoomColor } from '../utils/roomColors'
import { listBookings, listBlockedSlots } from '../api/bookings'

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelRoom, setPanelRoom] = useState<Room | null>(null)
  const [panelColorIndex, setPanelColorIndex] = useState(0)
  const [panelStartTime, setPanelStartTime] = useState<Date | null>(null)
  const [panelMaxDuration, setPanelMaxDuration] = useState(240)
  const [conflictMsg, setConflictMsg] = useState('')
  const [warnMsg, setWarnMsg] = useState('')
  const conflictTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const qc = useQueryClient()
  const dateStr = formatDate(selectedDate)
  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(dateStr)
  const { data: blockedSlots = [] } = useBlockedSlots(dateStr)

  useEffect(() => () => {
    if (conflictTimer.current) clearTimeout(conflictTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
  }, [])

  async function handleCellClick(room: Room, startTime: Date) {
    // Always fetch fresh data to catch bookings made by other users since last load
    const [freshBookings, freshBlocked] = await Promise.all([
      qc.fetchQuery<Booking[]>({ queryKey: ['bookings', dateStr], queryFn: () => listBookings(dateStr), staleTime: 0 }),
      qc.fetchQuery<BlockedSlot[]>({ queryKey: ['blocked-slots', dateStr], queryFn: () => listBlockedSlots(dateStr), staleTime: 0 }),
    ])

    const slotEnd = new Date(startTime.getTime() + 30 * 60 * 1000)
    const occupied =
      freshBookings.some(b => b.roomId === room.id && new Date(b.startTime) < slotEnd && new Date(b.endTime) > startTime) ||
      freshBlocked.some(s => s.roomId === room.id && new Date(s.startTime) < slotEnd && new Date(s.endTime) > startTime)

    if (occupied) {
      setConflictMsg('该时段已被预订，请选择其他时间')
      if (conflictTimer.current) clearTimeout(conflictTimer.current)
      conflictTimer.current = setTimeout(() => setConflictMsg(''), 3000)
      return
    }

    // Soft warning: user already has a booking in another room at this time
    const selfConflict = freshBookings
      .filter(b => b.isOwn && b.roomId !== room.id)
      .some(b => new Date(b.startTime) < slotEnd && new Date(b.endTime) > startTime)

    if (selfConflict) {
      setWarnMsg('⚠ 你在该时段已有其他预订')
      if (warnTimer.current) clearTimeout(warnTimer.current)
      warnTimer.current = setTimeout(() => setWarnMsg(''), 4000)
    }

    // Calculate max bookable duration: limited by next booking/blocked slot AND 18:00 business close
    const allItems = [
      ...freshBookings.filter(b => b.roomId === room.id).map(b => new Date(b.startTime).getTime()),
      ...freshBlocked.filter(s => s.roomId === room.id).map(s => new Date(s.startTime).getTime()),
    ].filter(t => t > startTime.getTime())
    const nextConflict = allItems.length > 0 ? Math.min(...allItems) : Infinity
    const minutesUntilNext = nextConflict === Infinity ? 240 : Math.floor((nextConflict - startTime.getTime()) / 60_000)
    const closeTime = new Date(startTime)
    closeTime.setHours(18, 0, 0, 0)
    const minutesToClose = Math.floor((closeTime.getTime() - startTime.getTime()) / 60_000)
    const maxDuration = Math.min(240, minutesUntilNext, minutesToClose)

    setPanelRoom(room)
    setPanelColorIndex(room.colorIndex ?? 0)
    setPanelStartTime(startTime)
    setPanelMaxDuration(maxDuration)
    setPanelOpen(true)
  }

  function handleDaySelect(date: Date) {
    setSelectedDate(date)
    setViewMode('day')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Conflict toast (hard block) */}
      {conflictMsg && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white font-mono text-sm font-bold px-5 py-3 border-4 border-black"
          style={{ boxShadow: '4px 4px 0 0 #FF006E' }}
        >
          ✕ {conflictMsg}
        </div>
      )}
      {/* Warning toast (soft warning, panel still opens) */}
      {warnMsg && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white font-mono text-sm font-bold px-5 py-3 border-4 border-black"
          style={{ boxShadow: '4px 4px 0 0 #FB5607' }}
        >
          {warnMsg}
        </div>
      )}

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
        maxDuration={panelMaxDuration}
        date={dateStr}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
