import { addDays, formatDisplayDate, isSameDay } from '../../utils/dateUtils'

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function CalendarHeader({ selectedDate, onDateChange }: CalendarHeaderProps) {
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)

  return (
    <div className="border-b-4 border-black" style={{ background: '#FFBE0B' }}>
      <div className="flex items-center px-4 py-2.5 max-w-[1600px] mx-auto gap-2">
        {/* Prev */}
        <button
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          aria-label="上一天"
        >
          ←
        </button>

        {/* Date display */}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-grotesk font-black text-[15px] uppercase" style={{ letterSpacing: '0.3px' }}>
            {formatDisplayDate(selectedDate)}
          </span>
          {isToday && (
            <span
              className="inline-block font-grotesk font-black text-[9px] uppercase px-1.5 py-0.5"
              style={{
                background: '#000',
                color: '#FFBE0B',
                border: '2px solid #000',
                transform: 'rotate(1deg)',
                letterSpacing: '0.5px',
              }}
            >
              TODAY
            </span>
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          aria-label="下一天"
        >
          →
        </button>

        {/* Today button */}
        <button
          onClick={() => onDateChange(today)}
          className="hidden md:flex rounded-none border-4 border-black bg-black text-white px-3 py-1 font-grotesk font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ★ 今天
        </button>
      </div>
    </div>
  )
}
