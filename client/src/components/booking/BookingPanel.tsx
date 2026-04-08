import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Room } from '../../types'
import BookingForm from './BookingForm'

interface BookingPanelProps {
  isOpen: boolean
  room: Room | null
  colorIndex: number
  startTime: Date | null
  date: string
  onClose: () => void
}

export default function BookingPanel({
  isOpen, room, colorIndex, startTime, date, onClose,
}: BookingPanelProps) {
  // Close on Escape key
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
      {/* Desktop: slide-out right panel */}
      <div
        className={`hidden md:flex fixed top-0 right-0 h-full w-96 bg-white border-l-4 border-black z-50 flex-col shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] transition-transform duration-[250ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b-4 border-black">
          <h2 className="font-grotesk font-black text-xl uppercase">新建预订</h2>
          <button
            onClick={onClose}
            className="rounded-none border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
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
        className={`md:hidden fixed inset-x-0 bottom-0 bg-white border-t-4 border-black z-50 transition-transform duration-[280ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between p-4 border-b-4 border-black sticky top-0 bg-white">
          <h2 className="font-grotesk font-black text-xl uppercase">新建预订</h2>
          <button
            onClick={onClose}
            className="rounded-none border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
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
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
    </>
  )
}
