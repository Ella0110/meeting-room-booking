import { describe, it, expect } from 'vitest'
import { getRoomColor, ROOM_COLORS } from '../roomColors'

describe('getRoomColor', () => {
  it('returns first color for index 0', () => {
    expect(getRoomColor(0)).toBe('#FFBE0B')
  })
  it('cycles back to first color at index 8', () => {
    expect(getRoomColor(8)).toBe(getRoomColor(0))
  })
  it('returns correct color for each defined index', () => {
    ROOM_COLORS.forEach((color, i) => {
      expect(getRoomColor(i)).toBe(color)
    })
  })
})
