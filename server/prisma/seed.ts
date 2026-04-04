import { PrismaClient, Zone } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin1234!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@company.com', passwordHash, role: 'ADMIN' },
  })

  await prisma.room.createMany({
    skipDuplicates: true,
    data: [
      { name: '101 会议室', capacity: 8, location: '3楼', zone: Zone.OFFICE },
      { name: '102 会议室', capacity: 4, location: '3楼', zone: Zone.OFFICE },
      { name: '共享区 A',   capacity: 6, location: '1楼', zone: Zone.SHARED },
    ],
  })

  console.log(`Seeded admin: ${admin.email}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
