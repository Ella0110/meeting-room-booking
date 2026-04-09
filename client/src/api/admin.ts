import { api } from './client'
import type { AdminUser, Room, AdminBlockedSlot, AdminBooking } from '../types'

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await api.get<AdminUser[]>('/api/admin/users')
  return res.data
}

export async function sendInvite(email: string): Promise<void> {
  await api.post('/api/admin/invitations', { email })
}

export async function updateUser(id: string, isActive: boolean): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/api/admin/users/${id}`, { isActive })
  return res.data
}

export async function listAdminRooms(): Promise<Room[]> {
  const res = await api.get<Room[]>('/api/admin/rooms')
  return res.data
}

export interface RoomInput {
  name: string
  capacity: number
  zone: 'OFFICE' | 'SHARED'
  location?: string
  description?: string
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const res = await api.post<Room>('/api/admin/rooms', input)
  return res.data
}

export async function updateRoom(id: string, input: Partial<RoomInput>): Promise<Room> {
  const res = await api.patch<Room>(`/api/admin/rooms/${id}`, input)
  return res.data
}

export async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/api/admin/rooms/${id}`)
}

export async function enableRoom(id: string): Promise<Room> {
  const res = await api.patch<Room>(`/api/admin/rooms/${id}`, { isActive: true })
  return res.data
}

export async function listAdminBlockedSlots(): Promise<AdminBlockedSlot[]> {
  const res = await api.get<AdminBlockedSlot[]>('/api/admin/blocked-slots')
  return res.data
}

export interface BlockedSlotInput {
  roomId: string
  reason: string
  startTime: string
  endTime: string
}

export async function createBlockedSlot(input: BlockedSlotInput): Promise<AdminBlockedSlot> {
  const res = await api.post<AdminBlockedSlot>('/api/admin/blocked-slots', input)
  return res.data
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  await api.delete(`/api/admin/blocked-slots/${id}`)
}

export async function listAdminBookings(params?: {
  date?: string
  roomId?: string
  userId?: string
}): Promise<AdminBooking[]> {
  const res = await api.get<AdminBooking[]>('/api/admin/bookings', { params })
  return res.data
}

export async function cancelAnyBooking(id: string): Promise<void> {
  await api.delete(`/api/admin/bookings/${id}`)
}
