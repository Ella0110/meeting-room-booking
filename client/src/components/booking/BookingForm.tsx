import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Room, Booking } from '../../types'
import { createBooking } from '../../api/bookings'
import { formatTime, formatDate } from '../../utils/dateUtils'
import { getRoomColor } from '../../utils/roomColors'

const DURATIONS = [
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '1.5小时', value: 90 },
  { label: '2小时', value: 120 },
  { label: '2.5小时', value: 150 },
  { label: '3小时', value: 180 },
  { label: '3.5小时', value: 210 },
  { label: '4小时', value: 240 },
]

interface BookingFormProps {
  room: Room
  colorIndex?: number
  startTime: Date
  date: string
  onSuccess: () => void
  onCancel: () => void
}

export default function BookingForm({
  room, colorIndex = 0, startTime, date, onSuccess, onCancel,
}: BookingFormProps) {
  const [title, setTitle] = useState('')
  const [durationMin, setDurationMin] = useState(60)
  const [serverError, setServerError] = useState('')

  const queryClient = useQueryClient()
  const color = getRoomColor(colorIndex)

  const endTime = new Date(startTime.getTime() + durationMin * 60_000)

  const mutation = useMutation({
    mutationFn: createBooking,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['bookings', date] })
      const previous = queryClient.getQueryData<Booking[]>(['bookings', date])
      // Optimistic update
      queryClient.setQueryData<Booking[]>(['bookings', date], (old = []) => [
        ...old,
        {
          id: `optimistic-${Date.now()}`,
          userId: 'me',
          roomId: input.roomId,
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          status: 'CONFIRMED',
          createdAt: new Date().toISOString(),
          isOwn: true,
          room: { name: room.name },
        },
      ])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['bookings', date], context.previous)
      }
      const msg = (_err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setServerError(msg ?? '预订失败，请重试')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', date] })
      onSuccess()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    mutation.mutate({
      roomId: room.id,
      title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Room info */}
      <div
        className="border-4 border-black px-4 py-3"
        style={{ backgroundColor: color }}
      >
        <p className="font-grotesk font-black text-lg uppercase">{room.name}</p>
        <p className="font-mono text-sm">
          {formatTime(startTime)} – {formatTime(endTime)}
        </p>
        <p className="font-mono text-xs opacity-80">{room.capacity} 人容量 · {room.zone}</p>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="font-grotesk font-black text-sm uppercase">
          会议主题
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
          placeholder="例：产品评审、团队周会..."
        />
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1">
        <label className="font-grotesk font-black text-sm uppercase">时长</label>
        <div className="grid grid-cols-4 gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDurationMin(d.value)}
              className={`rounded-none border-2 border-black font-mono text-xs py-1.5 transition-all ${
                durationMin === d.value
                  ? 'bg-black text-white'
                  : 'bg-white hover:bg-[#FFFBEB]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {serverError && (
        <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-none border-4 border-black bg-white font-grotesk font-black uppercase py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!title.trim() || mutation.isPending}
          className="flex-1 rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-2 shadow-[4px_4px_0px_0px_rgba(255,190,11,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {mutation.isPending ? '提交中...' : '确认预订'}
        </button>
      </div>
    </form>
  )
}
