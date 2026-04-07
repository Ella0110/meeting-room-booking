export const ROOM_COLORS = ['#FFBE0B', '#FF006E', '#8338EC', '#06D6A0', '#FB5607'] as const

export function getRoomColor(index: number): string {
  return ROOM_COLORS[index % ROOM_COLORS.length]
}
