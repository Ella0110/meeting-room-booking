import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { clearDatabase, createUser, createRoom } from './helpers'
import { prisma } from '../src/lib/prisma'

const app = createApp()

async function adminCookie() {
  await createUser({ email: 'admin@test.com', role: 'ADMIN' })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Password123!' })
  return res.headers['set-cookie'][0]
}

describe('Admin: users', () => {
  beforeEach(clearDatabase)

  it('lists users', async () => {
    const cookie = await adminCookie()
    await createUser({ email: 'u@test.com' })
    const res = await request(app).get('/api/admin/users').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
  })

  it('deactivates a user', async () => {
    const cookie = await adminCookie()
    const user = await createUser({ email: 'u@test.com' })
    const res = await request(app).patch(`/api/admin/users/${user.id}`).set('Cookie', cookie).send({ isActive: false })
    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)
  })
})

describe('Admin: blocked slots', () => {
  beforeEach(clearDatabase)

  it('creates and deletes a blocked slot', async () => {
    const cookie = await adminCookie()
    const room = await createRoom()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const end = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)

    const createRes = await request(app)
      .post('/api/admin/blocked-slots')
      .set('Cookie', cookie)
      .send({ roomId: room.id, reason: '维护', startTime: tomorrow.toISOString(), endTime: end.toISOString() })
    expect(createRes.status).toBe(201)

    const slotId = createRes.body.id
    const delRes = await request(app).delete(`/api/admin/blocked-slots/${slotId}`).set('Cookie', cookie)
    expect(delRes.status).toBe(200)
  })
})

describe('Admin: all bookings', () => {
  beforeEach(clearDatabase)

  it('lists all bookings and admin can cancel any', async () => {
    const cookie = await adminCookie()
    const user = await createUser({ email: 'u@test.com' })
    const room = await createRoom()
    const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const booking = await prisma.booking.create({
      data: { userId: user.id, roomId: room.id, title: 'Test', startTime: start, endTime: end, status: 'CONFIRMED' },
    })

    const listRes = await request(app).get('/api/admin/bookings').set('Cookie', cookie)
    expect(listRes.status).toBe(200)
    expect(listRes.body.length).toBeGreaterThanOrEqual(1)

    const cancelRes = await request(app).delete(`/api/admin/bookings/${booking.id}`).set('Cookie', cookie)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.status).toBe('CANCELLED')
  })
})
