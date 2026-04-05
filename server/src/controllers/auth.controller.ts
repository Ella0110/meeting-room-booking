import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { AppError } from '../middleware/errorHandler'
import { sendInviteEmail, sendPasswordResetEmail } from '../services/email.service'

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

// Stubs — implemented in Tasks 5 and 6
export async function forgotPassword(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
export async function resetPassword(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
export async function acceptInvite(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
