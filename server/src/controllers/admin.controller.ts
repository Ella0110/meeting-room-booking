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
export const listRooms = (_r: Request, res: Response) => res.status(501).end()
export const createRoom = (_r: Request, res: Response) => res.status(501).end()
export const updateRoom = (_r: Request, res: Response) => res.status(501).end()
export const deleteRoom = (_r: Request, res: Response) => res.status(501).end()
export const listBlockedSlots = (_r: Request, res: Response) => res.status(501).end()
export const createBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const deleteBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const listAllBookings = (_r: Request, res: Response) => res.status(501).end()
export const cancelAnyBooking = (_r: Request, res: Response) => res.status(501).end()
