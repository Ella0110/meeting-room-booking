import { api } from './client'
import type { Room } from '../types'

export async function listRooms(): Promise<Room[]> {
  const res = await api.get<Room[]>('/api/rooms')
  return res.data
}
