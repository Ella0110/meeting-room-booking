import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { Zone } from '@prisma/client'

export interface CreateBookingInput {
  userId: string
  roomId: string
  title: string
  startTime: Date
  endTime: Date
}

export async function createBooking(input: CreateBookingInput) {
  const { userId, roomId, title, startTime, endTime } = input

  const now = new Date()
  if (startTime <= now) throw new AppError(422, '开始时间必须在当前时间之后')

  const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (startTime > maxDate) throw new AppError(422, '不能预订 7 天以后的时段')

  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMin = durationMs / 60_000
  if (durationMin < 30) throw new AppError(422, '最短预订时长为 30 分钟')
  if (durationMin > 240) throw new AppError(422, '最长预订时长为 4 小时')

  const startMin = startTime.getMinutes()
  const endMin = endTime.getMinutes()
  if (startMin !== 0 && startMin !== 30) throw new AppError(422, '开始时间必须为整点或半点')
  if (endMin !== 0 && endMin !== 30) throw new AppError(422, '结束时间必须为整点或半点')

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } })
    if (!room || !room.isActive) throw new AppError(404, '会议室不存在')

    if (room.zone === Zone.OFFICE) {
      const day = startTime.getDay()
      if (day === 0 || day === 6) throw new AppError(422, '办公区会议室仅工作日可预订')
    }
    if (room.zone === Zone.SHARED) {
      const startTotalMin = startTime.getHours() * 60 + startTime.getMinutes()
      const endTotalMin = endTime.getHours() * 60 + endTime.getMinutes()
      if (startTotalMin < 9 * 60 || endTotalMin > 18 * 60) {
        throw new AppError(422, '共享区会议室仅可预订 09:00–18:00 内的时段')
      }
    }

    // Lock conflicting rows to prevent race conditions, then check via Prisma
    await tx.$queryRaw`
      SELECT id FROM "Booking"
      WHERE "roomId" = ${roomId}
        AND status = 'CONFIRMED'::"BookingStatus"
        AND "startTime" < ${endTime}
        AND "endTime" > ${startTime}
      FOR UPDATE
    `
    const roomConflict = await tx.booking.findFirst({
      where: {
        roomId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    })
    if (roomConflict) throw new AppError(409, '该时段已被预订，存在冲突')

    const blockedConflict = await tx.blockedSlot.findFirst({
      where: { roomId, startTime: { lt: endTime }, endTime: { gt: startTime } },
    })
    if (blockedConflict) throw new AppError(409, '该时段已被管理员封锁')

    const userConflict = await tx.booking.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    })
    if (userConflict) throw new AppError(409, '您在该时段已有其他预订')

    return tx.booking.create({
      data: { userId, roomId, title, startTime, endTime, status: 'CONFIRMED' },
      include: { room: { select: { name: true, zone: true } } },
    })
  })
}

export async function cancelBooking(bookingId: string, requestingUserId: string, isAdmin: boolean) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AppError(404, '预订不存在')
  if (booking.status === 'CANCELLED') throw new AppError(400, '预订已取消')
  if (!isAdmin && booking.userId !== requestingUserId) throw new AppError(403, '无权取消该预订')

  if (!isAdmin) {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    if (booking.startTime <= oneHourFromNow) {
      throw new AppError(422, '距开始时间不足 1 小时，无法取消')
    }
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  })
}
