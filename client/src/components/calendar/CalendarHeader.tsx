import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDisplayDate, isSameDay } from '../../utils/dateUtils'

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  view: 'day' | 'week'
  onViewChange: (view: 'day' | 'week') => void
}

export default function CalendarHeader({
  selectedDate, onDateChange, view, onViewChange,
}: CalendarHeaderProps) {
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-white">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="rounded-none border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          aria-label="上一天"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => onDateChange(today)}
          className={`rounded-none border-4 border-black px-3 py-1 font-grotesk font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${isToday ? 'bg-[#FFBE0B]' : 'bg-white'}`}
        >
          今天
        </button>

        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="rounded-none border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          aria-label="下一天"
        >
          <ChevronRight size={16} />
        </button>

        <span className="font-grotesk font-black text-lg ml-2 hidden md:block">
          {formatDisplayDate(selectedDate)}
        </span>
      </div>

      <div className="flex border-4 border-black">
        <button
          onClick={() => onViewChange('day')}
          className={`px-3 py-1 font-grotesk font-black text-sm uppercase transition-all ${view === 'day' ? 'bg-black text-white' : 'bg-white hover:bg-[#FFFBEB]'}`}
        >
          日
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-3 py-1 font-grotesk font-black text-sm uppercase border-l-4 border-black transition-all ${view === 'week' ? 'bg-black text-white' : 'bg-white hover:bg-[#FFFBEB]'}`}
        >
          周
        </button>
      </div>
    </div>
  )
}
