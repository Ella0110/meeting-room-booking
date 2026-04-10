import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Room, Booking } from '../../types'
import { createBooking } from '../../api/bookings'
import { formatTime } from '../../utils/dateUtils'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'

const QUICK_DURATIONS = [
  { label: '30分', value: 30 },
  { label: '1小时', value: 60 },
  { label: '1.5时', value: 90 },
  { label: '2小时', value: 120 },
]

const MORE_DURATIONS = [
  { label: '2.5时', value: 150 },
  { label: '3小时', value: 180 },
  { label: '3.5时', value: 210 },
  { label: '4小时', value: 240 },
]

interface BookingFormProps {
  room: Room
  colorIndex?: number
  startTime: Date
  maxDuration?: number
  date: string
  onSuccess: () => void
  onCancel: () => void
}

function getDefaultDuration(maxDuration: number): number {
  const all = [...QUICK_DURATIONS, ...MORE_DURATIONS].filter(d => d.value <= maxDuration)
  if (all.some(d => d.value === 60)) return 60
  return all[0]?.value ?? 30
}

export default function BookingForm({
  room, colorIndex = 0, startTime, maxDuration = 240, date, onSuccess, onCancel,
}: BookingFormProps) {
  const roomColor = getRoomColor(colorIndex)
  const availableQuick = QUICK_DURATIONS.filter(d => d.value <= maxDuration)
  const availableMore = MORE_DURATIONS.filter(d => d.value <= maxDuration)
  const [title, setTitle] = useState('')
  const [durationMin, setDurationMin] = useState(() => getDefaultDuration(maxDuration))
  const [serverError, setServerError] = useState('')

  // Reset duration and title when a new slot is selected
  useEffect(() => {
    setTitle('')
    setServerError('')
    setDurationMin(getDefaultDuration(maxDuration))
  }, [startTime, maxDuration])

  const queryClient = useQueryClient()
  const endTime = new Date(startTime.getTime() + durationMin * 60_000)

  const mutation = useMutation({
    mutationFn: createBooking,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['bookings', date] })
      const previous = queryClient.getQueryData<Booking[]>(['bookings', date])
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="font-grotesk font-black text-xs uppercase">
          会议主题 *
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-none border-4 border-black font-mono text-sm px-3 py-2.5 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
          placeholder="输入会议主题..."
        />
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label className="font-grotesk font-black text-xs uppercase">
          时长
          {maxDuration < 240 && (
            <span className="ml-2 font-mono text-[9px] text-gray-400 normal-case">
              (最长 {maxDuration >= 60 ? `${maxDuration / 60}小时` : `${maxDuration}分钟`})
            </span>
          )}
        </label>
        {availableQuick.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {availableQuick.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDurationMin(d.value)}
                className="rounded-none border-4 border-black font-grotesk font-black text-xs uppercase py-1.5 transition-all"
                style={durationMin === d.value
                  ? { background: roomColor, color: getRoomTextColor(colorIndex), boxShadow: '4px 4px 0 0 #000' }
                  : { background: '#fff', color: '#000' }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        {/* More durations */}
        {availableMore.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {availableMore.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDurationMin(d.value)}
                className="rounded-none border-2 border-black font-mono text-[10px] py-1 transition-all"
                style={durationMin === d.value
                  ? { background: roomColor, color: getRoomTextColor(colorIndex) }
                  : { background: '#f9fafb', color: '#000' }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        {/* End time preview */}
        <p className="font-mono text-[10px] text-gray-500">
          结束时间：{formatTime(endTime)}
        </p>
      </div>

      {serverError && (
        <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">
          {serverError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2.5 pt-4 border-t-4 border-black mt-auto">
        <button
          type="submit"
          disabled={!title.trim() || mutation.isPending}
          className="w-full rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-3 text-sm transition-all disabled:opacity-50 disabled:pointer-events-none hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          style={{ boxShadow: `6px 6px 0 0 ${roomColor}` }}
        >
          {mutation.isPending ? '提交中...' : '✓ 确认预订'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-none border-4 border-black bg-white font-grotesk font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          取消
        </button>
      </div>

      <p className="font-mono text-[11px] text-gray-400 text-center">
        ⚠ 开始前1小时内不可取消
      </p>
    </form>
  )
}
