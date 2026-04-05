import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { sendInviteEmail } from '../services/email.service'
import { AuthRequest } from '../middleware/authenticate'

const inviteSchema = z.object({ email: z.string().email() })

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

// Stubs — implemented in Task 10
export const listUsers = (_r: Request, res: Response) => res.status(501).end()
export const updateUser = (_r: Request, res: Response) => res.status(501).end()
export const listBlockedSlots = (_r: Request, res: Response) => res.status(501).end()
export const createBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const deleteBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const listAllBookings = (_r: Request, res: Response) => res.status(501).end()
export const cancelAnyBooking = (_r: Request, res: Response) => res.status(501).end()

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
