export const ROOM_COLORS = ['#FFBE0B', '#FF006E', '#8338EC', '#06D6A0', '#FB5607'] as const
export const ROOM_EMOJIS = ['🪸', '🌌', '🌠', '💎', '🔥'] as const
export const ROOM_TEXT_COLORS = ['#000', '#fff', '#fff', '#000', '#fff'] as const

export function getRoomColor(index: number): string {
  return ROOM_COLORS[index % ROOM_COLORS.length]
}

export function getRoomEmoji(index: number): string {
  return ROOM_EMOJIS[index % ROOM_EMOJIS.length]
}

export function getRoomTextColor(index: number): string {
  return ROOM_TEXT_COLORS[index % ROOM_TEXT_COLORS.length]
}
