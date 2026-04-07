import { api } from './client'
import type { Booking, BlockedSlot, MyBooking } from '../types'

export async function listBookings(date: string, roomId?: string): Promise<Booking[]> {
  const res = await api.get<Booking[]>('/api/bookings', { params: { date, roomId } })
  return res.data
}

export async function listBlockedSlots(date: string): Promise<BlockedSlot[]> {
  const res = await api.get<BlockedSlot[]>('/api/bookings/blocked-slots', { params: { date } })
  return res.data
}

export async function myBookings(status?: 'CONFIRMED' | 'CANCELLED'): Promise<MyBooking[]> {
  const res = await api.get<MyBooking[]>('/api/bookings/mine', { params: { status } })
  return res.data
}

export interface CreateBookingInput {
  roomId: string
  title: string
  startTime: string
  endTime: string
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await api.post<Booking>('/api/bookings', input)
  return res.data
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/api/bookings/${id}`)
}
