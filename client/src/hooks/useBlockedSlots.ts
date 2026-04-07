import { useQuery } from '@tanstack/react-query'
import { listBlockedSlots } from '../api/bookings'
import type { BlockedSlot } from '../types'

export function useBlockedSlots(date: string) {
  return useQuery<BlockedSlot[]>({
    queryKey: ['blocked-slots', date],
    queryFn: () => listBlockedSlots(date),
    enabled: !!date,
    staleTime: 60_000,
  })
}
