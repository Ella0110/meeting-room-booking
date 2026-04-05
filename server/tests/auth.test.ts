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

describe('POST /api/admin/invitations + POST /api/auth/accept-invite', () => {
  beforeEach(clearDatabase)

  it('admin can send invite and user can accept it', async () => {
    await createUser({ role: 'ADMIN', email: 'admin@test.com' })
    const { prisma: db } = await import('../src/lib/prisma')

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    const inviteRes = await request(app)
      .post('/api/admin/invitations')
      .set('Cookie', cookie)
      .send({ email: 'newuser@test.com' })
    expect(inviteRes.status).toBe(201)

    const inv = await db.invitation.findFirst({ where: { email: 'newuser@test.com' } })
    expect(inv).not.toBeNull()

    const acceptRes = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token: inv!.token, name: 'New User', password: 'NewPass123!' })
    expect(acceptRes.status).toBe(201)
    expect(acceptRes.headers['set-cookie'][0]).toContain('token=')

    const used = await db.invitation.findUnique({ where: { id: inv!.id } })
    expect(used!.usedAt).not.toBeNull()
  })

  it('returns 400 if invite token is expired', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    const { prisma: db } = await import('../src/lib/prisma')
    await db.invitation.create({
      data: {
        email: 'x@test.com',
        invitedBy: admin.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    })
    const inv = await db.invitation.findFirst({ where: { email: 'x@test.com' } })
    const res = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token: inv!.token, name: 'X', password: 'Pass123!' })
    expect(res.status).toBe(400)
  })

  it('returns 403 if non-admin tries to send invite', async () => {
    await createUser({ email: 'regular@test.com', role: 'USER' })
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    const res = await request(app)
      .post('/api/admin/invitations')
      .set('Cookie', cookie)
      .send({ email: 'target@test.com' })
    expect(res.status).toBe(403)
  })
})

describe('Password reset flow', () => {
  beforeEach(clearDatabase)

  it('forgot-password accepts any email silently (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'notexist@test.com' })
    expect(res.status).toBe(200)
  })

  it('reset-password updates password with valid token', async () => {
    const { prisma: db } = await import('../src/lib/prisma')
    const user = await createUser({ email: 'reset@test.com' })

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@test.com' })

    const refreshed = await db.user.findUnique({ where: { id: user.id } })
    expect(refreshed!.resetToken).not.toBeNull()

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: refreshed!.resetToken, newPassword: 'NewSecure999!' })
    expect(res.status).toBe(200)

    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@test.com', password: 'Password123!' })
    expect(loginOld.status).toBe(401)

    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@test.com', password: 'NewSecure999!' })
    expect(loginNew.status).toBe(200)
  })

  it('reset-password returns 400 for expired token', async () => {
    const { prisma: db } = await import('../src/lib/prisma')
    const user = await createUser()
    await db.user.update({
      where: { id: user.id },
      data: { resetToken: 'expired-token', resetTokenExpiresAt: new Date(Date.now() - 1000) },
    })
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'expired-token', newPassword: 'NewPass999!' })
    expect(res.status).toBe(400)
  })
})
