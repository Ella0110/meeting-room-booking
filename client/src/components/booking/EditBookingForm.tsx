import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MyBooking, Booking, BlockedSlot } from '../../types'
import { updateBooking } from '../../api/bookings'
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

// 09:00, 09:30, ..., 17:00, 17:30
const TIME_OPTIONS: string[] = []
for (let h = 9; h <= 17; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 18) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

function calcMaxDuration(
  startDate: Date,
  bookingId: string,
  roomId: string,
  dayBookings: Booking[],
  dayBlockedSlots: BlockedSlot[],
): number {
  const allItems = [
    ...dayBookings
      .filter((b) => b.roomId === roomId && b.id !== bookingId)
      .map((b) => new Date(b.startTime).getTime()),
    ...dayBlockedSlots
      .filter((s) => s.roomId === roomId)
      .map((s) => new Date(s.startTime).getTime()),
  ].filter((t) => t > startDate.getTime())
  const nextConflict = allItems.length > 0 ? Math.min(...allItems) : Infinity
  const minutesUntilNext =
    nextConflict === Infinity ? 240 : Math.floor((nextConflict - startDate.getTime()) / 60_000)
  const closeTime = new Date(startDate)
  closeTime.setHours(18, 0, 0, 0)
  const minutesToClose = Math.floor((closeTime.getTime() - startDate.getTime()) / 60_000)
  return Math.min(240, minutesUntilNext, minutesToClose)
}

function getDefaultDuration(maxDuration: number): number {
  const all = [...QUICK_DURATIONS, ...MORE_DURATIONS].filter((d) => d.value <= maxDuration)
  if (all.some((d) => d.value === 60)) return 60
  return all[0]?.value ?? 30
}

interface EditBookingFormProps {
  booking: MyBooking
  colorIndex: number
  dayBookings: Booking[]
  dayBlockedSlots: BlockedSlot[]
  dateStr: string
  onSuccess: () => void
  onCancel: () => void
}

export default function EditBookingForm({
  booking, colorIndex, dayBookings, dayBlockedSlots, dateStr, onSuccess, onCancel,
}: EditBookingFormProps) {
  const roomColor = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)

  const initStart = new Date(booking.startTime)
  const initStartStr = `${String(initStart.getHours()).padStart(2, '0')}:${String(initStart.getMinutes()).padStart(2, '0')}`
  const initDuration = Math.floor(
    (new Date(booking.endTime).getTime() - initStart.getTime()) / 60_000
  )

  const [title, setTitle] = useState(booking.title)
  const [startTimeStr, setStartTimeStr] = useState(initStartStr)
  const [durationMin, setDurationMin] = useState(initDuration)
  const [serverError, setServerError] = useState('')

  // Derive startDate from booking date + selected HH:MM
  const baseDate = new Date(booking.startTime)
  const [startHour, startMinute] = startTimeStr.split(':').map(Number)
  const startDate = new Date(
    baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(),
    startHour, startMinute!, 0, 0
  )
  const maxDuration = calcMaxDuration(startDate, booking.id, booking.roomId, dayBookings, dayBlockedSlots)
  const endDate = new Date(startDate.getTime() + durationMin * 60_000)
  const availableQuick = QUICK_DURATIONS.filter((d) => d.value <= maxDuration)
  const availableMore = MORE_DURATIONS.filter((d) => d.value <= maxDuration)
  const canBook = maxDuration >= 30

  // Clamp duration when start time changes
  useEffect(() => {
    if (durationMin > maxDuration) setDurationMin(getDefaultDuration(maxDuration))
  }, [startTimeStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      updateBooking(booking.id, {
        title,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      }),
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setServerError(msg ?? '修改失败，请重试')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', dateStr] })
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setServerError(''); mutation.mutate() }}
      className="flex flex-col gap-5"
    >
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-title" className="font-grotesk font-black text-xs uppercase">
          会议主题 *
        </label>
        <input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-none border-4 border-black font-mono text-sm px-3 py-2.5 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
          placeholder="输入会议主题..."
        />
      </div>

      {/* Start time */}
      <div className="flex flex-col gap-1.5">
        <label className="font-grotesk font-black text-xs uppercase">开始时间</label>
        <select
          value={startTimeStr}
          onChange={(e) => setStartTimeStr(e.target.value)}
          className="rounded-none border-4 border-black font-mono text-sm px-3 py-2.5 focus:outline-none"
        >
          {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label className="font-grotesk font-black text-xs uppercase">
          时长
          {maxDuration < 240 && canBook && (
            <span className="ml-2 font-mono text-[9px] text-gray-400 normal-case">
              (最长 {maxDuration >= 60 ? `${maxDuration / 60}小时` : `${maxDuration}分钟`})
            </span>
          )}
        </label>
        {!canBook ? (
          <p className="font-mono text-[11px] text-[#FF006E] font-bold">
            该时段剩余时间不足 30 分钟，请选择其他时间
          </p>
        ) : (
          <>
            {availableQuick.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {availableQuick.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMin(d.value)}
                    className="rounded-none border-4 border-black font-grotesk font-black text-xs uppercase py-1.5 transition-all"
                    style={durationMin === d.value
                      ? { background: roomColor, color: textColor, boxShadow: '4px 4px 0 0 #000' }
                      : { background: '#fff', color: '#000' }
                    }
                  >{d.label}</button>
                ))}
              </div>
            )}
            {availableMore.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {availableMore.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMin(d.value)}
                    className="rounded-none border-2 border-black font-mono text-[10px] py-1 transition-all"
                    style={durationMin === d.value
                      ? { background: roomColor, color: textColor }
                      : { background: '#f9fafb', color: '#000' }
                    }
                  >{d.label}</button>
                ))}
              </div>
            )}
            <p className="font-mono text-[10px] text-gray-500">
              结束时间：{formatTime(endDate)}
            </p>
          </>
        )}
      </div>

      {serverError && (
        <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-4 border-t-4 border-black mt-auto">
        <button
          type="submit"
          disabled={!title.trim() || !canBook || mutation.isPending}
          className="w-full rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-3 text-sm transition-all disabled:opacity-50 disabled:pointer-events-none hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          style={{ boxShadow: `6px 6px 0 0 ${roomColor}` }}
        >
          {mutation.isPending ? '保存中...' : '✓ 保存修改'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-none border-4 border-black bg-white font-grotesk font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          取消
        </button>
      </div>
    </form>
  )
}
