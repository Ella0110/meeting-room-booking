import { describe, it, expect } from 'vitest'
import {
  TIME_SLOTS, formatDate, formatTime, addDays, isSameDay,
  slotIndexOf, durationInSlots, slotToDateTime, getWeekDates,
} from '../dateUtils'

describe('TIME_SLOTS', () => {
  it('has 18 slots from 09:00 to 17:30', () => {
    expect(TIME_SLOTS).toHaveLength(18)
    expect(TIME_SLOTS[0]).toBe('09:00')
    expect(TIME_SLOTS[17]).toBe('17:30')
  })
})

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 3, 6))).toBe('2026-04-06')
  })
})

describe('formatTime', () => {
  it('formats time as HH:MM', () => {
    const d = new Date(2026, 3, 6, 9, 30)
    expect(formatTime(d)).toBe('09:30')
  })
})

describe('addDays', () => {
  it('adds days without mutating original', () => {
    const d = new Date(2026, 3, 6)
    const result = addDays(d, 3)
    expect(result.getDate()).toBe(9)
    expect(d.getDate()).toBe(6)
  })
})

describe('isSameDay', () => {
  it('returns true for same day', () => {
    expect(isSameDay(new Date(2026, 3, 6, 9), new Date(2026, 3, 6, 17))).toBe(true)
  })
  it('returns false for different days', () => {
    expect(isSameDay(new Date(2026, 3, 6), new Date(2026, 3, 7))).toBe(false)
  })
})

describe('slotIndexOf', () => {
  it('returns 0 for 09:00', () => {
    const d = new Date(2026, 3, 6, 9, 0)
    expect(slotIndexOf(d)).toBe(0)
  })
  it('returns 3 for 10:30', () => {
    const d = new Date(2026, 3, 6, 10, 30)
    expect(slotIndexOf(d)).toBe(3)
  })
})

describe('durationInSlots', () => {
  it('returns 2 for 1-hour booking', () => {
    expect(durationInSlots('2026-04-06T10:00:00Z', '2026-04-06T11:00:00Z')).toBe(2)
  })
  it('returns 1 for 30-min booking', () => {
    expect(durationInSlots('2026-04-06T10:00:00Z', '2026-04-06T10:30:00Z')).toBe(1)
  })
})

describe('slotToDateTime', () => {
  it('converts slot index 0 to 09:00', () => {
    const base = new Date(2026, 3, 6)
    const result = slotToDateTime(base, 0)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })
  it('converts slot index 3 to 10:30', () => {
    const base = new Date(2026, 3, 6)
    const result = slotToDateTime(base, 3)
    expect(result.getHours()).toBe(10)
    expect(result.getMinutes()).toBe(30)
  })
})

describe('getWeekDates', () => {
  it('returns 7 dates starting from Monday', () => {
    const wednesday = new Date(2026, 3, 8) // Wed Apr 8
    const week = getWeekDates(wednesday)
    expect(week).toHaveLength(7)
    expect(week[0].getDay()).toBe(1) // Monday
    expect(week[6].getDay()).toBe(0) // Sunday
  })
})
