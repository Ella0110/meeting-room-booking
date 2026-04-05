import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { clearDatabase, createUser, createRoom } from './helpers'

const app = createApp()

describe('GET /api/rooms', () => {
  beforeEach(clearDatabase)

  it('returns active rooms for authenticated user', async () => {
    await createUser({ email: 'u@test.com' })
    await createRoom({ name: '101', zone: 'OFFICE' })
    await createRoom({ name: '102', zone: 'OFFICE' })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    const res = await request(app).get('/api/rooms').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ name: '101', zone: 'OFFICE' })
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/rooms')
    expect(res.status).toBe(401)
  })
})

describe('Admin room CRUD', () => {
  beforeEach(clearDatabase)

  it('admin can create a room', async () => {
    await createUser({ email: 'admin@test.com', role: 'ADMIN' })
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    const res = await request(app)
      .post('/api/admin/rooms')
      .set('Cookie', cookie)
      .send({ name: 'New Room', capacity: 6, zone: 'SHARED' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'New Room', zone: 'SHARED' })
  })

  it('non-admin cannot create a room', async () => {
    await createUser({ email: 'user@test.com' })
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    const res = await request(app)
      .post('/api/admin/rooms')
      .set('Cookie', cookie)
      .send({ name: 'X', capacity: 4, zone: 'OFFICE' })
    expect(res.status).toBe(403)
  })
})
