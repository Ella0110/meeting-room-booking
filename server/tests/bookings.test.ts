import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { clearDatabase, createUser, createRoom } from './helpers'
import { prisma } from '../src/lib/prisma'
import { updateBooking } from '../src/services/booking.service'

async function loginUser(app: ReturnType<typeof createApp>, email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' })
  return res.headers['set-cookie'][0]
}

const app = createApp()

async function bookAs(cookie: string, body: object) {
  return request(app).post('/api/bookings').set('Cookie', cookie).send(body)
}

function nextWeekday(hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d
}

describe('POST /api/bookings — business rules', () => {
  let cookie: string
  let officeRoom: { id: string }
  let sharedRoom: { id: string }

  beforeEach(async () => {
    await clearDatabase()
    await createUser({ email: 'u@test.com' })
    officeRoom = await createRoom({ zone: 'OFFICE', name: 'Office 101' })
    sharedRoom = await createRoom({ zone: 'SHARED', name: 'Shared A' })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@test.com', password: 'Password123!' })
    cookie = loginRes.headers['set-cookie'][0]
  })

  it('creates a valid booking', async () => {
    const start = nextWeekday(10, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const res = await bookAs(cookie, {
      roomId: officeRoom.id,
      title: 'Team Meeting',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'Team Meeting', status: 'CONFIRMED' })
  })

  it('rejects duration < 30 minutes', async () => {
    const start = nextWeekday(10, 0)
    const end = new Date(start.getTime() + 20 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/30 分钟/)
  })

  it('rejects duration > 4 hours', async () => {
    const start = nextWeekday(9, 0)
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/4 小时/)
  })

  it('rejects non-:00/:30 start time', async () => {
    const start = nextWeekday(10, 15)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
  })

  it('rejects booking > 7 days ahead', async () => {
    const start = new Date()
    start.setDate(start.getDate() + 8)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
  })

  it('rejects OFFICE room on weekend', async () => {
    const start = new Date()
    while (start.getDay() !== 6) start.setDate(start.getDate() + 1)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/工作日/)
  })

  it('rejects SHARED room outside 09:00–18:00', async () => {
    const start = nextWeekday(8, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: sharedRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/09:00/)
  })

  it('rejects conflicting booking for same room', async () => {
    const start = nextWeekday(10, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    await bookAs(cookie, { roomId: officeRoom.id, title: 'First', startTime: start.toISOString(), endTime: end.toISOString() })

    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'Second', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/冲突/)
  })

  it('rejects double-booking same user different rooms', async () => {
    const start = nextWeekday(10, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    await bookAs(cookie, { roomId: officeRoom.id, title: 'First', startTime: start.toISOString(), endTime: end.toISOString() })

    const res = await bookAs(cookie, { roomId: sharedRoom.id, title: 'Overlap', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/已有其他预订/)
  })
})

describe('GET /api/bookings/blocked-slots', () => {
  let cookie: string
  let room: { id: string }

  beforeEach(async () => {
    await clearDatabase()
    const user = await createUser({ email: 'u2@test.com' })
    const adminUser = await createUser({ email: 'admin@test.com', role: 'ADMIN' })
    room = await createRoom({ name: 'Blocked Room' })

    await prisma.blockedSlot.create({
      data: {
        roomId: room.id,
        reason: 'Maintenance',
        startTime: new Date('2026-04-10T10:00:00.000Z'),
        endTime: new Date('2026-04-10T12:00:00.000Z'),
        createdBy: adminUser.id,
      },
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u2@test.com', password: 'Password123!' })
    cookie = loginRes.headers['set-cookie'][0]
  })

  it('returns blocked slots for a given date (authenticated user)', async () => {
    const res = await request(app)
      .get('/api/bookings/blocked-slots?date=2026-04-10')
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      roomId: room.id,
      reason: 'Maintenance',
    })
    expect(res.body[0]).not.toHaveProperty('createdBy')
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/bookings/blocked-slots?date=2026-04-10')
    expect(res.status).toBe(401)
  })
})

describe('updateBooking', () => {
  let userId: string
  let roomId: string
  let bookingId: string
  const futureStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
  futureStart.setHours(10, 0, 0, 0)
  const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000) // +1h

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `u-${Date.now()}@test.com`, name: 'Test', passwordHash: 'x', role: 'USER' },
    })
    userId = user.id
    const room = await prisma.room.create({
      data: { name: `R-${Date.now()}`, capacity: 4, zone: 'OFFICE', colorIndex: 0 },
    })
    roomId = room.id
    const booking = await prisma.booking.create({
      data: { userId, roomId, title: 'Original', startTime: futureStart, endTime: futureEnd, status: 'CONFIRMED' },
    })
    bookingId = booking.id
  })

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { roomId } })
    await prisma.blockedSlot.deleteMany({ where: { roomId } })
    await prisma.room.delete({ where: { id: roomId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it('updates title only', async () => {
    const result = await updateBooking(bookingId, userId, { title: 'New Title' })
    expect(result.title).toBe('New Title')
    expect(new Date(result.startTime).getTime()).toBe(futureStart.getTime())
  })

  it('updates start and end time', async () => {
    const newStart = new Date(futureStart.getTime() + 30 * 60 * 1000) // +30min
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000)
    const result = await updateBooking(bookingId, userId, { startTime: newStart, endTime: newEnd })
    expect(new Date(result.startTime).getTime()).toBe(newStart.getTime())
  })

  it('does not conflict with itself when time unchanged', async () => {
    const result = await updateBooking(bookingId, userId, { title: 'Same time, new title' })
    expect(result.title).toBe('Same time, new title')
  })

  it('rejects if booking not found', async () => {
    await expect(updateBooking('00000000-0000-0000-0000-000000000000', userId, { title: 'x' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects if not own booking', async () => {
    const other = await prisma.user.create({
      data: { email: `other-${Date.now()}@test.com`, name: 'Other', passwordHash: 'x', role: 'USER' },
    })
    await expect(updateBooking(bookingId, other.id, { title: 'x' }))
      .rejects.toMatchObject({ statusCode: 403 })
    await prisma.user.delete({ where: { id: other.id } })
  })

  it('rejects if already cancelled', async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } })
    await expect(updateBooking(bookingId, userId, { title: 'x' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects if new time conflicts with another booking in same room', async () => {
    const conflictStart = new Date(futureStart.getTime() + 90 * 60 * 1000)
    const conflictEnd = new Date(conflictStart.getTime() + 60 * 60 * 1000)
    await prisma.booking.create({
      data: { userId, roomId, title: 'Other', startTime: conflictStart, endTime: conflictEnd, status: 'CONFIRMED' },
    })
    await expect(updateBooking(bookingId, userId, { startTime: conflictStart, endTime: conflictEnd }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects if new time overlaps blocked slot', async () => {
    const blockedStart = new Date(futureStart.getTime() + 90 * 60 * 1000)
    const blockedEnd = new Date(blockedStart.getTime() + 60 * 60 * 1000)
    await prisma.blockedSlot.create({
      data: { roomId, reason: 'test', startTime: blockedStart, endTime: blockedEnd, createdBy: userId },
    })
    await expect(updateBooking(bookingId, userId, { startTime: blockedStart, endTime: blockedEnd }))
      .rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('PATCH /api/bookings/:id — HTTP integration', () => {
  let userEmail: string
  let bookingId: string

  beforeEach(async () => {
    await clearDatabase()
    userEmail = `http-patch-${Date.now()}@test.com`
    const user = await createUser({ email: userEmail })
    const room = await createRoom({ zone: 'OFFICE', name: `HTTP-Room-${Date.now()}` })
    const start = nextWeekday(10, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        roomId: room.id,
        title: 'Original',
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
      },
    })
    bookingId = booking.id
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .send({ title: 'New' })
    expect(res.status).toBe(401)
  })

  it('returns 422 on invalid body', async () => {
    const cookie = await loginUser(app, userEmail)
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Cookie', cookie)
      .send({ title: '' })
    expect(res.status).toBe(422)
  })

  it('returns 200 on valid PATCH', async () => {
    const cookie = await loginUser(app, userEmail)
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Cookie', cookie)
      .send({ title: 'Updated via HTTP' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated via HTTP')
  })
})
