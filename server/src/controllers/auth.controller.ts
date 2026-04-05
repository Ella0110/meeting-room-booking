import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { AppError } from '../middleware/errorHandler'
import { sendPasswordResetEmail } from '../services/email.service'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000,
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const forgotSchema = z.object({ email: z.string().email() })
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) })

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1),
  password: z.string().min(8),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'Invalid credentials')

    const token = signToken({ userId: user.id, role: user.role })
    res.cookie('token', token, COOKIE_OPTS)
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(422).json({ error: 'Validation failed', details: err.errors })
      return
    }
    next(err)
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('token')
  res.json({ ok: true })
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, name, password } = acceptInviteSchema.parse(req.body)

    const inv = await prisma.invitation.findUnique({ where: { token } })
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired invitation')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: inv.email, name, passwordHash },
      })
      await tx.invitation.update({ where: { id: inv.id }, data: { usedAt: new Date() } })
      return u
    })

    const jwtToken = signToken({ userId: user.id, role: user.role })
    res.cookie('token', jwtToken, COOKIE_OPTS)
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex')
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      })
      await sendPasswordResetEmail(email, token)
    }
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = resetSchema.parse(req.body)
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
    })
    if (!user) throw new AppError(400, 'Invalid or expired reset token')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    })
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}
