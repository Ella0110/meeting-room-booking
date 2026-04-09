import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminBookings } from '../../hooks/useAdminData'
import { cancelAnyBooking } from '../../api/admin'
import Skeleton from '../../components/Skeleton'
import { formatDate, formatTime } from '../../utils/dateUtils'

export default function BookingsPage() {
  const qc = useQueryClient()
  const [filterDate, setFilterDate] = useState(formatDate(new Date()))
  const { data: bookings = [], isLoading } = useAdminBookings({ date: filterDate })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelAnyBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="font-grotesk font-black text-3xl uppercase mb-6">全部预订</h1>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="font-grotesk font-black text-sm uppercase">日期：</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="border-4 border-dashed border-black p-8 text-center">
          <p className="font-mono text-sm text-gray-500">该日期暂无预订</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className={`border-4 border-black p-4 flex items-start justify-between gap-4 ${
                b.status === 'CANCELLED' ? 'bg-[#f3f4f6]' : 'bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-grotesk font-black">{b.title}</span>
                  {b.status === 'CANCELLED' && (
                    <span className="font-mono text-xs border-2 border-gray-400 px-2 py-0.5 text-gray-500">已取消</span>
                  )}
                </div>
                <p className="font-mono text-sm text-gray-700">
                  {b.room.name} · {formatTime(new Date(b.startTime))}–{formatTime(new Date(b.endTime))}
                </p>
                <p className="font-mono text-xs text-gray-500">
                  {b.user.name} ({b.user.email})
                </p>
              </div>
              {b.status === 'CONFIRMED' && (
                <button
                  onClick={() => { if (confirm(`确认取消 "${b.title}"？`)) cancelMutation.mutate(b.id) }}
                  disabled={cancelMutation.isPending}
                  className="rounded-none border-4 border-black bg-[#FF006E] text-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                >
                  取消
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
