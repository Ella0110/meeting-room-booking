import { addDays, formatDisplayDate, isSameDay, getWeekDates } from '../../utils/dateUtils'

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

const DAY_SHORT = ['一', '二', '三', '四', '五', '六', '日']

export default function CalendarHeader({ selectedDate, onDateChange }: CalendarHeaderProps) {
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)
  const weekDates = getWeekDates(selectedDate)

  return (
    <div className="border-b-4 border-black" style={{ background: '#FFBE0B' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Top row: prev / date display / next / today */}
        <div className="flex items-center px-4 py-2.5 gap-2">
          <button
            onClick={() => onDateChange(addDays(selectedDate, -1))}
            className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            aria-label="上一天"
          >
            ←
          </button>

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

          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            aria-label="下一天"
          >
            →
          </button>

          <button
            onClick={() => onDateChange(today)}
            className="hidden md:flex rounded-none border-4 border-black bg-black text-white px-3 py-1 font-grotesk font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            ★ 今天
          </button>
        </div>

        {/* Week strip */}
        <div className="flex border-t-2 border-black/20 overflow-x-auto">
          {weekDates.map((d, i) => {
            const isSelected = isSameDay(d, selectedDate)
            const isWeekToday = isSameDay(d, today)
            return (
              <button
                key={i}
                onClick={() => onDateChange(d)}
                className="flex-1 min-w-[44px] flex flex-col items-center py-1.5 transition-all active:scale-95"
                style={{
                  background: isSelected ? '#000' : 'transparent',
                  borderRight: i < 6 ? '1px solid rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <span
                  className="font-mono text-[9px] uppercase"
                  style={{ color: isSelected ? '#FFBE0B' : 'rgba(0,0,0,0.55)' }}
                >
                  {DAY_SHORT[i]}
                </span>
                <span
                  className="font-grotesk font-black text-sm"
                  style={{ color: isSelected ? '#FFBE0B' : isWeekToday ? '#000' : 'rgba(0,0,0,0.7)' }}
                >
                  {d.getDate()}
                </span>
                {isWeekToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-black mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
