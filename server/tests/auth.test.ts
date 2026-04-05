import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { clearDatabase, createUser } from './helpers'

const app = createApp()

describe('POST /api/auth/login', () => {
  beforeEach(clearDatabase)

  it('returns 200 and sets cookie with valid credentials', async () => {
    await createUser({ email: 'ella@test.com', password: 'Secret123!' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ella@test.com', password: 'Secret123!' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ email: 'ella@test.com' })
    expect(res.headers['set-cookie']).toBeDefined()
    expect(res.headers['set-cookie'][0]).toContain('token=')
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly')
  })

  it('returns 401 with wrong password', async () => {
    await createUser({ email: 'ella@test.com', password: 'Secret123!' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ella@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for inactive user', async () => {
    await createUser({ email: 'ella@test.com', isActive: false })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ella@test.com', password: 'Password123!' })
    expect(res.status).toBe(401)
  })

  it('returns 422 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ella@test.com' })
    expect(res.status).toBe(422)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie'][0]).toContain('token=;')
  })
})
