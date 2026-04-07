import { useQuery } from '@tanstack/react-query'
import { listAdminUsers, listAdminRooms, listAdminBlockedSlots, listAdminBookings } from '../api/admin'
import type { AdminUser, Room, AdminBlockedSlot, AdminBooking } from '../types'

export function useAdminUsers() {
  return useQuery<AdminUser[]>({ queryKey: ['admin-users'], queryFn: listAdminUsers })
}

export function useAdminRooms() {
  return useQuery<Room[]>({ queryKey: ['admin-rooms'], queryFn: listAdminRooms })
}

export function useAdminBlockedSlots() {
  return useQuery<AdminBlockedSlot[]>({
    queryKey: ['admin-blocked-slots'],
    queryFn: listAdminBlockedSlots,
  })
}

export function useAdminBookings(params?: { date?: string; roomId?: string; userId?: string }) {
  return useQuery<AdminBooking[]>({
    queryKey: ['admin-bookings', params],
    queryFn: () => listAdminBookings(params),
  })
}
