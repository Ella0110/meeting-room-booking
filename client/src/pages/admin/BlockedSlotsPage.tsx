import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminBlockedSlots, useAdminRooms } from '../../hooks/useAdminData'
import { createBlockedSlot, deleteBlockedSlot } from '../../api/admin'
import Skeleton from '../../components/Skeleton'
import { formatDate, formatTime } from '../../utils/dateUtils'

export default function BlockedSlotsPage() {
  const qc = useQueryClient()
  const { data: slots = [], isLoading } = useAdminBlockedSlots()
  const { data: rooms = [] } = useAdminRooms()

  const [roomId, setRoomId] = useState('')
  const [reason, setReason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTimeStr, setStartTimeStr] = useState('09:00')
  const [endTimeStr, setEndTimeStr] = useState('10:00')
  const [formError, setFormError] = useState('')

  const createMutation = useMutation({
    mutationFn: () => {
      const start = new Date(`${startDate}T${startTimeStr}:00`)
      const end = new Date(`${startDate}T${endTimeStr}:00`)
      return createBlockedSlot({ roomId, reason, startTime: start.toISOString(), endTime: end.toISOString() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blocked-slots'] })
      qc.invalidateQueries({ queryKey: ['blocked-slots'] })
      setRoomId(''); setReason(''); setStartDate(''); setFormError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setFormError(msg ?? '创建失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlockedSlot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blocked-slots'] })
      qc.invalidateQueries({ queryKey: ['blocked-slots'] })
    },
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="font-grotesk font-black text-3xl uppercase mb-6">封锁时段</h1>

      {/* Add form */}
      <div className="border-4 border-black bg-[#FFFBEB] p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-grotesk font-black text-xl uppercase mb-4">添加封锁时段</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-grotesk font-black text-sm uppercase">会议室</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none">
              <option value="">选择会议室</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-grotesk font-black text-sm uppercase">原因</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：设备维护"
              className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-grotesk font-black text-sm uppercase">日期</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-grotesk font-black text-sm uppercase">开始</label>
              <input type="time" value={startTimeStr} onChange={(e) => setStartTimeStr(e.target.value)}
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-grotesk font-black text-sm uppercase">结束</label>
              <input type="time" value={endTimeStr} onChange={(e) => setEndTimeStr(e.target.value)}
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
            </div>
          </div>
        </div>
        {formError && <p className="font-mono text-sm text-[#FF006E] mt-2">{formError}</p>}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!roomId || !reason || !startDate || createMutation.isPending}
          className="mt-4 rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(255,190,11,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {createMutation.isPending ? '创建中...' : '添加封锁'}
        </button>
      </div>

      {/* Slot list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : slots.length === 0 ? (
        <div className="border-4 border-dashed border-black p-8 text-center">
          <p className="font-mono text-sm text-gray-500">暂无封锁时段</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <div key={slot.id} className="border-4 border-black bg-white p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-grotesk font-black">{slot.room.name}</span>
                  <span className="font-mono text-sm text-gray-600">{slot.reason}</span>
                </div>
                <p className="font-mono text-sm text-gray-500">
                  {formatDate(new Date(slot.startTime))} {formatTime(new Date(slot.startTime))}–{formatTime(new Date(slot.endTime))}
                </p>
              </div>
              <button
                onClick={() => { if (confirm('确认删除该封锁时段？')) deleteMutation.mutate(slot.id) }}
                disabled={deleteMutation.isPending}
                className="rounded-none border-4 border-black bg-[#FF006E] text-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
