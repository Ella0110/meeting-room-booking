import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'

export interface JwtPayload {
  userId: string
  role: Role
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production')
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET)
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).userId !== 'string' ||
    typeof (decoded as Record<string, unknown>).role !== 'string'
  ) {
    throw new Error('Invalid token payload')
  }
  return decoded as JwtPayload
}
