export const TIME_SLOTS: string[] = Array.from({ length: 18 }, (_, i) => {
  const totalMin = 9 * 60 + i * 30
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const m = (totalMin % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})
// ['09:00', '09:30', ..., '17:30']

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function formatDisplayDate(date: Date): string {
  return `${MONTHS[date.getMonth()]}月${date.getDate()}日 周${DAYS[date.getDay()]}`
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Returns 0-indexed slot index for a given time (0 = 09:00, 1 = 09:30, ..., 17 = 17:30) */
export function slotIndexOf(date: Date): number {
  return (date.getHours() * 60 + date.getMinutes() - 9 * 60) / 30
}

/** Number of 30-min slots from startTime to endTime */
export function durationInSlots(startTime: string, endTime: string): number {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / (30 * 60 * 1000)
}

/** Convert a date + slot index to a datetime (local time) */
export function slotToDateTime(date: Date, slotIndex: number): Date {
  const result = new Date(date)
  const totalMin = 9 * 60 + slotIndex * 30
  result.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0)
  return result
}

/** Returns Mon–Sun dates for the week containing `date` */
export function getWeekDates(date: Date): Date[] {
  const day = date.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  const monday = addDays(date, diff)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
