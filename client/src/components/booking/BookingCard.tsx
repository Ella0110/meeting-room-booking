import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MyBooking } from '../../types'
import { getRoomColor } from '../../utils/roomColors'
import { formatTime, formatDisplayDate } from '../../utils/dateUtils'
import { cancelBooking } from '../../api/bookings'

interface BookingCardProps {
  booking: MyBooking
  roomColorIndex?: number
  canCancel: boolean
}

export default function BookingCard({ booking, roomColorIndex = 0, canCancel }: BookingCardProps) {
  const qc = useQueryClient()
  const color = getRoomColor(roomColorIndex)
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  return (
    <div
      className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 mt-1 border-2 border-black flex-shrink-0" style={{ backgroundColor: color }} />
        <div>
          <p className="font-grotesk font-black text-base">{booking.title}</p>
          <p className="font-mono text-sm">{booking.room.name} · {booking.room.capacity} 人</p>
          <p className="font-mono text-sm text-gray-700">
            {formatDisplayDate(start)} {formatTime(start)}–{formatTime(end)}
          </p>
        </div>
      </div>

      {canCancel && booking.status === 'CONFIRMED' && (
        <button
          onClick={() => {
            if (confirm('确认取消该预订？')) mutation.mutate()
          }}
          disabled={mutation.isPending}
          className="rounded-none border-4 border-black bg-[#FF006E] text-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
        >
          取消
        </button>
      )}
      {booking.status === 'CANCELLED' && (
        <span className="font-mono text-xs border-2 border-gray-400 px-2 py-1 text-gray-500 flex-shrink-0">
          已取消
        </span>
      )}
    </div>
  )
}
