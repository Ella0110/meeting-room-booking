export interface Room {
  id: string
  name: string
  capacity: number
  location: string | null
  description: string | null
  zone: 'OFFICE' | 'SHARED'
  isActive: boolean
}

/** Returned by GET /api/bookings — title masked for others' bookings */
export interface Booking {
  id: string
  userId: string
  roomId: string
  title: string | null
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  isOwn: boolean
  room: { name: string }
}

/** Returned by GET /api/bookings/mine — full data */
export interface MyBooking {
  id: string
  userId: string
  roomId: string
  title: string
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  room: { name: string; capacity: number }
}

/** Returned by GET /api/bookings/blocked-slots */
export interface BlockedSlot {
  id: string
  roomId: string
  reason: string
  startTime: string
  endTime: string
}

/** Stored in localStorage after login */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
}

/** Returned by GET /api/admin/users */
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: string
}

/** Returned by GET /api/admin/bookings */
export interface AdminBooking {
  id: string
  userId: string
  roomId: string
  title: string
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  user: { name: string; email: string }
  room: { name: string }
}

/** Returned by GET /api/admin/blocked-slots (full, with room name) */
export interface AdminBlockedSlot {
  id: string
  roomId: string
  reason: string
  startTime: string
  endTime: string
  createdBy: string
  room: { name: string }
}
