import { useState } from 'react'
import { useMyBookings } from '../hooks/useMyBookings'
import BookingCard from '../components/booking/BookingCard'
import Skeleton from '../components/Skeleton'
import type { MyBooking } from '../types'

function isUpcoming(b: MyBooking): boolean {
  return b.status === 'CONFIRMED' && new Date(b.startTime) > new Date()
}

function canCancel(b: MyBooking): boolean {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
  return b.status === 'CONFIRMED' && new Date(b.startTime) > oneHourFromNow
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')
  const { data: bookings = [], isLoading } = useMyBookings()

  const upcoming = bookings.filter(isUpcoming)
  const history = bookings.filter((b) => !isUpcoming(b))
  const displayed = tab === 'upcoming' ? upcoming : history

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Page header */}
      <div className="border-b-4 border-black px-6 py-3" style={{ background: '#FFBE0B' }}>
        <h1 className="font-grotesk font-black text-xl uppercase" style={{ letterSpacing: '-0.3px' }}>我的预订</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 md:p-8">
        {/* Tabs */}
        <div className="flex border-4 border-black mb-6 w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setTab('upcoming')}
            className={`px-6 py-2 font-grotesk font-black text-sm uppercase transition-all ${
              tab === 'upcoming' ? 'bg-black text-white' : 'bg-white hover:bg-[#FFFBEB]'
            }`}
          >
            即将到来 {upcoming.length > 0 && `(${upcoming.length})`}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-6 py-2 font-grotesk font-black text-sm uppercase border-l-4 border-black transition-all ${
              tab === 'history' ? 'bg-black text-white' : 'bg-white hover:bg-[#FFFBEB]'
            }`}
          >
            历史记录
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="border-4 border-black border-dashed p-10 text-center">
            <p className="font-mono text-sm text-gray-400">
              {tab === 'upcoming' ? '暂无即将到来的预订' : '暂无历史记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((b) => (
              <BookingCard key={b.id} booking={b} canCancel={canCancel(b)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
