import { useQuery } from '@tanstack/react-query'
import { listRooms } from '../api/rooms'
import type { Room } from '../types'

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: listRooms,
    staleTime: 5 * 60_000,
  })
}
