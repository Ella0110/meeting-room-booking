import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/authenticate'
import * as bookingService from '../services/booking.service'

const createSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
})

export async function listBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, roomId } = req.query as { date?: string; roomId?: string }
    const where: Record<string, unknown> = { status: 'CONFIRMED' }

    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.startTime = { gte: dayStart, lte: dayEnd }
    }
    if (roomId) where.roomId = roomId

    const bookings = await prisma.booking.findMany({
      where,
      include: { room: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    })

    const userId = req.user!.userId
    const masked = bookings.map((b) => ({
      ...b,
      title: b.userId === userId ? b.title : null,
      isOwn: b.userId === userId,
    }))
    res.json(masked)
  } catch (err) { next(err) }
}

export async function myBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as { status?: string }
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId, ...(status ? { status: status as 'CONFIRMED' | 'CANCELLED' } : {}) },
      include: { room: { select: { name: true, capacity: true } } },
      orderBy: { startTime: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
}

export async function createBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, title, startTime, endTime } = createSchema.parse(req.body)
    const booking = await bookingService.createBooking({
      userId: req.user!.userId,
      roomId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    })
    res.status(201).json(booking)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role === 'ADMIN'
    )
    res.json(booking)
  } catch (err) { next(err) }
}

export async function listBlockedSlots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string }
    const where: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.startTime = { gte: dayStart, lte: dayEnd }
    }
    const slots = await prisma.blockedSlot.findMany({
      where,
      select: { id: true, roomId: true, reason: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    })
    res.json(slots)
  } catch (err) { next(err) }
}
