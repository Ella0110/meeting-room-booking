import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

export async function clearDatabase() {
  await prisma.booking.deleteMany()
  await prisma.blockedSlot.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.$executeRaw`UPDATE "User" SET "resetToken" = NULL, "resetTokenExpiresAt" = NULL`
  await prisma.user.deleteMany()
  await prisma.room.deleteMany()
}

export async function createUser(overrides: Partial<{
  email: string; name: string; role: Role; isActive: boolean; password: string
}> = {}) {
  const password = overrides.password ?? 'Password123!'
  return prisma.user.create({
    data: {
      email: overrides.email ?? 'user@test.com',
      name: overrides.name ?? 'Test User',
      passwordHash: await bcrypt.hash(password, 10),
      role: overrides.role ?? 'USER',
      isActive: overrides.isActive ?? true,
    },
  })
}

export async function createRoom(overrides: Partial<{
  name: string; zone: 'OFFICE' | 'SHARED'; capacity: number
}> = {}) {
  return prisma.room.create({
    data: {
      name: overrides.name ?? 'Test Room',
      capacity: overrides.capacity ?? 8,
      zone: overrides.zone ?? 'OFFICE',
    },
  })
}
