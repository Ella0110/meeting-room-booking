import { useEffect } from 'react'
import type { Room } from '../../types'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
import { formatTime, formatDisplayDate } from '../../utils/dateUtils'
import BookingForm from './BookingForm'

interface BookingPanelProps {
  isOpen: boolean
  room: Room | null
  colorIndex: number
  startTime: Date | null
  date: string
  onClose: () => void
}

function PanelHeader({ room, colorIndex, startTime, onClose }: {
  room: Room; colorIndex: number; startTime: Date; onClose: () => void
}) {
  const color = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)
  const endTime = new Date(startTime.getTime() + 60 * 60_000)

  return (
    <>
      {/* Top bar: white bg, colored tag */}
      <div style={{ backgroundColor: '#fff', borderBottom: '4px solid #000', padding: '10px 16px' }}
        className="flex items-center justify-between">
        <div style={{ display: 'inline-block', transform: 'rotate(-1deg)' }}>
          <span
            className="font-grotesk font-black text-[11px] uppercase px-2.5 py-1 border-[3px] border-black"
            style={{ background: color, color: textColor, letterSpacing: '0.5px' }}
          >
            ✦ 新建预订
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-none border-4 border-black bg-white px-2 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ✕
        </button>
      </div>

      {/* Room info */}
      <div className="flex flex-col gap-3 p-5" style={{ borderBottom: '4px solid #000' }}>
        <div>
          <h2 className="font-grotesk font-black text-2xl uppercase" style={{ letterSpacing: '-0.5px' }}>
            {room.name}
          </h2>
          <p className="font-mono text-[11px] text-gray-500 mt-0.5 uppercase">
            {room.capacity}人 · {room.zone} · {room.zone === 'SHARED' ? '任意日期 09:00–18:00' : '仅工作日 09:00–18:00'}
          </p>
        </div>

        {/* Time display */}
        <div className="border-4 border-black px-4 py-3" style={{ backgroundColor: color }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(startTime)}
            </div>
            <span className="font-black text-xl" style={{ color: textColor }}>→</span>
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(endTime)}
            </div>
          </div>
          <div className="font-mono text-[11px] font-bold uppercase" style={{ color: textColor, opacity: 0.75 }}>
            {formatDisplayDate(startTime)}
          </div>
        </div>
      </div>
    </>
  )
}

function MobileHeader({ room, colorIndex, startTime, onClose }: {
  room: Room; colorIndex: number; startTime: Date; onClose: () => void
}) {
  const color = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)
  const endTime = new Date(startTime.getTime() + 60 * 60_000)

  return (
    <>
      {/* Top bar: white bg, colored tag */}
      <div style={{ backgroundColor: '#fff', borderBottom: '4px solid #000', padding: '8px 14px' }}
        className="flex items-center justify-between">
        <span className="font-grotesk font-black text-[10px] uppercase px-2 py-0.5 border-[3px] border-black"
          style={{ background: color, color: textColor }}>
          ✦ 新建预订
        </span>
        <button
          onClick={onClose}
          className="rounded-none border-4 border-black bg-white px-2 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ✕
        </button>
      </div>

      {/* Room + time */}
      <div className="flex flex-col gap-2.5 p-4" style={{ borderBottom: '4px solid #000' }}>
        <div>
          <h2 className="font-grotesk font-black text-lg uppercase" style={{ letterSpacing: '-0.3px' }}>{room.name}</h2>
          <p className="font-mono text-[10px] text-gray-500">{room.capacity}人 · {room.zone}</p>
        </div>
        <div className="border-4 border-black p-2.5" style={{ backgroundColor: color }}>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm bg-black px-2 py-0.5" style={{ color }}>
              {formatTime(startTime)}
            </span>
            <span className="font-black text-base" style={{ color: textColor }}>→</span>
            <span className="font-mono font-bold text-sm bg-black px-2 py-0.5" style={{ color }}>
              {formatTime(endTime)}
            </span>
          </div>
          <div className="font-mono text-[9px] font-bold uppercase mt-1" style={{ color: textColor, opacity: 0.75 }}>
            {formatDisplayDate(startTime)}
          </div>
        </div>
      </div>
    </>
  )
}

export default function BookingPanel({
  isOpen, room, colorIndex, startTime, date, onClose,
}: BookingPanelProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!room || !startTime) return null

  return (
    <>
      {/* Desktop: slide-out right panel — width 360px */}
      <div
        className={`hidden md:flex fixed top-0 right-0 h-full bg-white border-l-4 border-black z-50 flex-col transition-transform duration-[250ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 360 }}
      >
        <PanelHeader room={room} colorIndex={colorIndex} startTime={startTime} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-6">
          <BookingForm
            room={room}
            colorIndex={colorIndex}
            startTime={startTime}
            date={date}
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
        <MobileHeader room={room} colorIndex={colorIndex} startTime={startTime} onClose={onClose} />
        <div className="overflow-y-auto p-4">
          <BookingForm
            room={room}
            colorIndex={colorIndex}
            startTime={startTime}
            date={date}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />
      )}
    </>
  )
}
