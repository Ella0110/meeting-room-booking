import { useQuery } from '@tanstack/react-query'
import { myBookings } from '../api/bookings'
import type { MyBooking } from '../types'

export function useMyBookings(status?: 'CONFIRMED' | 'CANCELLED') {
  return useQuery<MyBooking[]>({
    queryKey: ['my-bookings', status],
    queryFn: () => myBookings(status),
  })
}
