import { useQuery } from '@tanstack/react-query'
import { listBookings } from '../api/bookings'
import type { Booking } from '../types'

export function useBookings(date: string) {
  return useQuery<Booking[]>({
    queryKey: ['bookings', date],
    queryFn: () => listBookings(date),
    enabled: !!date,
  })
}
