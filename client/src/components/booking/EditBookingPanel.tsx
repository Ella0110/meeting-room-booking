import { useEffect } from 'react'
import type { MyBooking } from '../../types'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
import { formatTime, formatDisplayDate, formatDate } from '../../utils/dateUtils'
import { useBookings } from '../../hooks/useBookings'
import { useBlockedSlots } from '../../hooks/useBlockedSlots'
import EditBookingForm from './EditBookingForm'

interface EditBookingPanelProps {
  isOpen: boolean
  booking: MyBooking | null
  colorIndex: number
  onClose: () => void
}

export default function EditBookingPanel({ isOpen, booking, colorIndex, onClose }: EditBookingPanelProps) {
  const dateStr = booking ? formatDate(new Date(booking.startTime)) : ''
  const { data: dayBookings = [] } = useBookings(dateStr)
  const { data: dayBlockedSlots = [] } = useBlockedSlots(dateStr)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!booking) return null

  const color = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)

  const header = (
    <>
      <div
        style={{ backgroundColor: '#fff', borderBottom: '4px solid #000', padding: '10px 16px' }}
        className="flex items-center justify-between"
      >
        <div style={{ display: 'inline-block', transform: 'rotate(-1deg)' }}>
          <span
            className="font-grotesk font-black text-[11px] uppercase px-2.5 py-1 border-[3px] border-black"
            style={{ background: color, color: textColor, letterSpacing: '0.5px' }}
          >
            ✎ 编辑预订
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-none border-4 border-black bg-white px-2 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-3 p-5" style={{ borderBottom: '4px solid #000' }}>
        <div>
          <h2 className="font-grotesk font-black text-2xl uppercase" style={{ letterSpacing: '-0.5px' }}>
            {booking.room.name}
          </h2>
          <p className="font-mono text-[11px] text-gray-500 mt-0.5 uppercase">
            {formatDisplayDate(start)}
          </p>
        </div>
        <div className="border-4 border-black px-4 py-3" style={{ backgroundColor: color }}>
          <div className="flex items-center gap-2.5">
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(start)}
            </div>
            <span className="font-black text-xl" style={{ color: textColor }}>→</span>
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(end)}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: slide-out right panel */}
      <div
        className={`hidden md:flex fixed top-0 right-0 h-full bg-white border-l-4 border-black z-50 flex-col transition-transform duration-[250ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 360 }}
      >
        {header}
        <div className="flex-1 overflow-y-auto p-6">
          <EditBookingForm
            key={booking.id}
            booking={booking}
            colorIndex={colorIndex}
            dayBookings={dayBookings}
            dayBlockedSlots={dayBlockedSlots}
            dateStr={dateStr}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 bg-white border-t-4 border-black z-50 flex flex-col transition-transform duration-[280ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex justify-center py-2.5">
          <div className="w-10 h-1 bg-black" />
        </div>
        {header}
        <div className="overflow-y-auto p-4">
          <EditBookingForm
            key={booking.id}
            booking={booking}
            colorIndex={colorIndex}
            dayBookings={dayBookings}
            dayBlockedSlots={dayBlockedSlots}
            dateStr={dateStr}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />}
    </>
  )
}
