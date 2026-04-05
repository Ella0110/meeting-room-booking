import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { sendInviteEmail } from '../services/email.service'
import { AuthRequest } from '../middleware/authenticate'
import * as bookingService from '../services/booking.service'

const inviteSchema = z.object({ email: z.string().email() })

const blockedSlotSchema = z.object({
  roomId: z.string().uuid(),
  reason: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
})

export async function sendInvite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = inviteSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new AppError(409, 'User with this email already exists')

    const inviter = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } })
    const invitation = await prisma.invitation.create({
      data: {
        email,
        invitedBy: req.user!.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    await sendInviteEmail(email, invitation.token, inviter.name)
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) { next(err) }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params['id'] as string },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    res.json(user)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function listBlockedSlots(_req: Request, res: Response, next: NextFunction) {
  try {
    const slots = await prisma.blockedSlot.findMany({
      include: { room: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    })
    res.json(slots)
  } catch (err) { next(err) }
}

export async function createBlockedSlot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, reason, startTime, endTime } = blockedSlotSchema.parse(req.body)
    const slot = await prisma.blockedSlot.create({
      data: {
        roomId,
        reason,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        createdBy: req.user!.userId,
      },
    })
    res.status(201).json(slot)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function deleteBlockedSlot(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.blockedSlot.delete({ where: { id: req.params['id'] as string } })
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function listAllBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, roomId, userId } = req.query as Record<string, string | undefined>
    const where: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.startTime = { gte: dayStart, lte: dayEnd }
    }
    if (roomId) where.roomId = roomId
    if (userId) where.userId = userId

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
}

export async function cancelAnyBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(req.params['id'] as string, '', true)
    res.json(booking)
  } catch (err) { next(err) }
}

const roomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  zone: z.enum(['OFFICE', 'SHARED']),
  location: z.string().optional(),
  description: z.string().optional(),
})

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })
    res.json(rooms)
  } catch (err) { next(err) }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = roomSchema.parse(req.body)
    const room = await prisma.room.create({ data })
    res.status(201).json(room)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = roomSchema.partial().parse(req.body)
    const room = await prisma.room.update({ where: { id: req.params['id'] as string }, data })
    res.json(room)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.room.update({ where: { id: req.params['id'] as string }, data: { isActive: false } })
    res.json({ ok: true })
  } catch (err) { next(err) }
}
