# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Express + PostgreSQL backend API for the enterprise meeting room booking system, including auth, rooms, bookings, and admin endpoints.

**Architecture:** Monorepo with `server/` workspace. Express app exported as a factory function (`createApp`) for testability. All business rules validated in `booking.service.ts` inside a Prisma transaction with row-level locking.

**Tech Stack:** Node.js 20, Express 4, TypeScript 5, Prisma 5, PostgreSQL 15, JWT (jsonwebtoken), bcryptjs, Zod, Nodemailer, express-rate-limit, Vitest, Supertest

---

## File Map

```
booking-app/
├── package.json                         # workspaces: ["server", "client"]
├── .gitignore
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── app.ts                       # Express app factory (no listen)
    │   ├── index.ts                     # starts server
    │   ├── lib/
    │   │   ├── prisma.ts                # Prisma client singleton
    │   │   └── jwt.ts                   # sign / verify helpers
    │   ├── middleware/
    │   │   ├── authenticate.ts          # JWT cookie → req.user
    │   │   ├── requireAdmin.ts          # role === ADMIN guard
    │   │   ├── rateLimiter.ts           # booking endpoint limiter
    │   │   └── errorHandler.ts          # global error handler
    │   ├── services/
    │   │   ├── email.service.ts         # nodemailer send helpers
    │   │   └── booking.service.ts       # business rules + transaction
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── rooms.ts
    │   │   ├── bookings.ts
    │   │   └── admin.ts
    │   └── controllers/
    │       ├── auth.controller.ts
    │       ├── rooms.controller.ts
    │       ├── bookings.controller.ts
    │       └── admin.controller.ts
    └── tests/
        ├── helpers.ts                   # DB cleanup + test user factories
        ├── auth.test.ts
        ├── bookings.test.ts
        └── admin.test.ts
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`

- [x] **Step 1: Create root workspace package.json**

```json
// package.json
{
  "name": "booking-app",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "dev:server": "npm run dev --workspace=server",
    "test:server": "npm run test --workspace=server"
  }
}
```

- [x] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
*.env.local
```

- [x] **Step 3: Create server/package.json**

```json
{
  "name": "booking-app-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.16",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.8",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/nodemailer": "^6.4.17",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.9"
  }
}
```

- [x] **Step 4: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [x] **Step 5: Create server/.env.example**

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/booking_app
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/booking_app_test
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=8h
APP_URL=http://localhost:5173
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@booking.app
NODE_ENV=development
```

- [x] **Step 6: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors.

- [x] **Step 7: Commit**

```bash
git add package.json .gitignore server/package.json server/tsconfig.json server/.env.example
git commit -m "feat: monorepo scaffold with server workspace"
```

---

## Task 2: Prisma Schema & Database

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`
- Create: `server/src/lib/prisma.ts`

- [x] **Step 1: Write schema.prisma**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String       @id @default(uuid())
  name                 String
  email                String       @unique
  passwordHash         String
  role                 Role         @default(USER)
  isActive             Boolean      @default(true)
  resetToken           String?      @unique
  resetTokenExpiresAt  DateTime?
  createdAt            DateTime     @default(now())
  bookings             Booking[]
  blockedSlots         BlockedSlot[]
  invitations          Invitation[]
}

enum Role {
  USER
  ADMIN
}

model Room {
  id           String        @id @default(uuid())
  name         String
  capacity     Int
  location     String?
  description  String?
  zone         Zone
  isActive     Boolean       @default(true)
  bookings     Booking[]
  blockedSlots BlockedSlot[]
}

enum Zone {
  OFFICE
  SHARED
}

model Booking {
  id        String        @id @default(uuid())
  userId    String
  roomId    String
  title     String
  startTime DateTime
  endTime   DateTime
  status    BookingStatus @default(CONFIRMED)
  createdAt DateTime      @default(now())
  user      User          @relation(fields: [userId], references: [id])
  room      Room          @relation(fields: [roomId], references: [id])
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
}

model BlockedSlot {
  id        String   @id @default(uuid())
  roomId    String
  reason    String
  startTime DateTime
  endTime   DateTime
  createdBy String
  room      Room     @relation(fields: [roomId], references: [id])
  creator   User     @relation(fields: [createdBy], references: [id])
}

model Invitation {
  id        String    @id @default(uuid())
  email     String
  token     String    @unique @default(uuid())
  invitedBy String
  expiresAt DateTime
  usedAt    DateTime?
  inviter   User      @relation(fields: [invitedBy], references: [id])
}
```

- [x] **Step 2: Create the databases and run migration**

```bash
# Create both databases first (run in psql or pgAdmin)
createdb booking_app
createdb booking_app_test

# Copy .env.example to .env and fill in your DATABASE_URL
cp server/.env.example server/.env

cd server && npx prisma migrate dev --name init
```

Expected: `server/prisma/migrations/` created, Prisma client generated.

- [x] **Step 3: Create Prisma singleton**

```typescript
// server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [x] **Step 4: Write seed.ts with one admin + two rooms**

```typescript
// server/prisma/seed.ts
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
```

- [x] **Step 5: Run seed**

```bash
cd server && npm run db:seed
```

Expected: `Seeded admin: admin@company.com`

- [x] **Step 6: Commit**

```bash
git add server/prisma/ server/src/lib/prisma.ts
git commit -m "feat: prisma schema, migration, and seed data"
```

---

## Task 3: Core App Setup

**Files:**
- Create: `server/src/lib/jwt.ts`
- Create: `server/src/middleware/authenticate.ts`
- Create: `server/src/middleware/requireAdmin.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/middleware/rateLimiter.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [x] **Step 1: Create JWT helpers**

```typescript
// server/src/lib/jwt.ts
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'

export interface JwtPayload {
  userId: string
  role: Role
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}
```

- [x] **Step 2: Create authenticate middleware**

```typescript
// server/src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../lib/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

- [x] **Step 3: Create requireAdmin + errorHandler**

```typescript
// server/src/middleware/requireAdmin.ts
import { Response, NextFunction } from 'express'
import { AuthRequest } from './authenticate'

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
```

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
```

- [x] **Step 4: Create rateLimiter**

```typescript
// server/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const bookingLimiter = rateLimit({
  windowMs: 5_000,       // 5 seconds
  max: 3,                // max 3 requests per window per IP
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})
```

- [x] **Step 5: Create app factory**

```typescript
// server/src/app.ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import roomRoutes from './routes/rooms'
import bookingRoutes from './routes/bookings'
import adminRoutes from './routes/admin'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/auth', authRoutes)
  app.use('/api/rooms', roomRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/admin', adminRoutes)

  app.use(errorHandler)
  return app
}
```

```typescript
// server/src/index.ts
import { createApp } from './app'

const PORT = process.env.PORT ?? 3000
createApp().listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

- [x] **Step 6: Verify app starts**

```bash
cd server && npm run dev
```

Expected: `Server running on http://localhost:3000` (routes will return 404 until controllers are added — that's fine).

- [x] **Step 7: Commit**

```bash
git add server/src/
git commit -m "feat: express app scaffold with middleware and JWT helpers"
```

---

## Task 4: Auth — Login & Logout

**Files:**
- Create: `server/tests/helpers.ts`
- Create: `server/tests/auth.test.ts`
- Create: `server/src/controllers/auth.controller.ts` (login + logout portions)
- Create: `server/src/routes/auth.ts` (login + logout portions)

- [x] **Step 1: Create test helpers**

```typescript
// server/tests/helpers.ts
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
```

Create `server/vitest.config.ts`:

```typescript
// server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/booking_app_test',
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
    },
    sequence: { concurrent: false }, // run test files serially to avoid DB conflicts
  },
})
```

Run test DB migration once:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/booking_app_test \
  npx prisma migrate deploy --schema server/prisma/schema.prisma
```

- [x] **Step 2: Write failing login tests**

```typescript
// server/tests/auth.test.ts
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
```

- [x] **Step 3: Run tests — verify they fail**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: FAIL — routes not yet defined.

- [x] **Step 4: Implement login & logout routes**

```typescript
// server/src/routes/auth.ts
import { Router } from 'express'
import * as auth from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.post('/login', auth.login)
router.post('/logout', auth.logout)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password', auth.resetPassword)
router.post('/accept-invite', auth.acceptInvite)
export default router
```

```typescript
// server/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { AppError } from '../middleware/errorHandler'
import { sendInviteEmail, sendPasswordResetEmail } from '../services/email.service'
import crypto from 'crypto'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
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

// Stubs — implemented in Task 6
export async function forgotPassword(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
export async function resetPassword(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
export async function acceptInvite(_req: Request, res: Response, _next: NextFunction) {
  res.status(501).json({ error: 'Not implemented' })
}
```

- [x] **Step 5: Run login tests — verify they pass**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: all 5 tests PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/ server/tests/
git commit -m "feat: auth login and logout endpoints with tests"
```

---

## Task 5: Auth — Invite Flow

**Files:**
- Modify: `server/src/controllers/auth.controller.ts` (acceptInvite)
- Create: `server/src/services/email.service.ts`
- Create: `server/src/routes/admin.ts` (invite endpoint only)
- Create: `server/src/controllers/admin.controller.ts` (sendInvite only)

- [x] **Step 1: Create email service**

```typescript
// server/src/services/email.service.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '1025'),
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

export async function sendInviteEmail(to: string, token: string, inviterName: string) {
  if (process.env.NODE_ENV === 'test') return  // no-op in tests
  const url = `${process.env.APP_URL}/invite/${token}`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@booking.app',
    to,
    subject: `${inviterName} 邀请您加入会议室预订系统`,
    html: `<p>点击链接完成注册：<a href="${url}">${url}</a></p><p>链接 24 小时内有效。</p>`,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  if (process.env.NODE_ENV === 'test') return  // no-op in tests
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@booking.app',
    to,
    subject: '重置您的密码',
    html: `<p>点击链接重置密码：<a href="${url}">${url}</a></p><p>链接 1 小时内有效。</p>`,
  })
}
```

- [x] **Step 2: Write failing invite tests**

```typescript
// Add to server/tests/auth.test.ts

describe('POST /api/admin/invitations + POST /api/auth/accept-invite', () => {
  beforeEach(clearDatabase)

  it('admin can send invite and user can accept it', async () => {
    const admin = await createUser({ role: 'ADMIN', email: 'admin@test.com' })
    const { prisma: db } = await import('../src/lib/prisma')

    // Login as admin to get cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' })
    const cookie = loginRes.headers['set-cookie'][0]

    // Send invite
    const inviteRes = await request(app)
      .post('/api/admin/invitations')
      .set('Cookie', cookie)
      .send({ email: 'newuser@test.com' })
    expect(inviteRes.status).toBe(201)

    // Find the token in DB
    const inv = await db.invitation.findFirst({ where: { email: 'newuser@test.com' } })
    expect(inv).not.toBeNull()

    // Accept invite
    const acceptRes = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token: inv!.token, name: 'New User', password: 'NewPass123!' })
    expect(acceptRes.status).toBe(201)
    expect(acceptRes.headers['set-cookie'][0]).toContain('token=')

    // Token is consumed
    const used = await db.invitation.findUnique({ where: { id: inv!.id } })
    expect(used!.usedAt).not.toBeNull()
  })

  it('returns 400 if invite token is expired', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    await import('../src/lib/prisma').then(({ prisma: db }) =>
      db.invitation.create({
        data: {
          email: 'x@test.com',
          invitedBy: admin.id,
          expiresAt: new Date(Date.now() - 1000), // expired
        },
      })
    )
    const inv = await (await import('../src/lib/prisma')).prisma.invitation.findFirst()
    const res = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token: inv!.token, name: 'X', password: 'Pass123!' })
    expect(res.status).toBe(400)
  })
})
```

- [x] **Step 3: Run — verify fail**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: FAIL on invite tests.

- [x] **Step 4: Implement sendInvite (admin) and acceptInvite**

```typescript
// server/src/routes/admin.ts
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requireAdmin } from '../middleware/requireAdmin'
import * as admin from '../controllers/admin.controller'

const router = Router()
router.use(authenticate, requireAdmin)

router.post('/invitations', admin.sendInvite)

// Stubs for remaining admin routes (Tasks 9–10)
router.get('/users', admin.listUsers)
router.patch('/users/:id', admin.updateUser)
router.get('/rooms', admin.listRooms)
router.post('/rooms', admin.createRoom)
router.patch('/rooms/:id', admin.updateRoom)
router.delete('/rooms/:id', admin.deleteRoom)
router.get('/blocked-slots', admin.listBlockedSlots)
router.post('/blocked-slots', admin.createBlockedSlot)
router.delete('/blocked-slots/:id', admin.deleteBlockedSlot)
router.get('/bookings', admin.listAllBookings)
router.delete('/bookings/:id', admin.cancelAnyBooking)

export default router
```

```typescript
// server/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { sendInviteEmail } from '../services/email.service'
import { AuthRequest } from '../middleware/authenticate'

const inviteSchema = z.object({ email: z.string().email() })

export async function sendInvite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = inviteSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new AppError(409, 'User with this email already exists')

    const inviter = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } })
    const invitation = await prisma.invitation.create({
      data: {
        email,
        invitedBy: req.user!.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    await sendInviteEmail(email, invitation.token, inviter.name)
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

// Stubs — implemented in Task 9
export const listUsers = (_r: Request, res: Response) => res.status(501).end()
export const updateUser = (_r: Request, res: Response) => res.status(501).end()
export const listRooms = (_r: Request, res: Response) => res.status(501).end()
export const createRoom = (_r: Request, res: Response) => res.status(501).end()
export const updateRoom = (_r: Request, res: Response) => res.status(501).end()
export const deleteRoom = (_r: Request, res: Response) => res.status(501).end()
export const listBlockedSlots = (_r: Request, res: Response) => res.status(501).end()
export const createBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const deleteBlockedSlot = (_r: Request, res: Response) => res.status(501).end()
export const listAllBookings = (_r: Request, res: Response) => res.status(501).end()
export const cancelAnyBooking = (_r: Request, res: Response) => res.status(501).end()
```

```typescript
// Replace acceptInvite stub in server/src/controllers/auth.controller.ts
const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1),
  password: z.string().min(8),
})

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, name, password } = acceptInviteSchema.parse(req.body)

    const inv = await prisma.invitation.findUnique({ where: { token } })
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired invitation')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: inv.email, name, passwordHash },
      })
      await tx.invitation.update({ where: { id: inv.id }, data: { usedAt: new Date() } })
      return u
    })

    const jwtToken = signToken({ userId: user.id, role: user.role })
    res.cookie('token', jwtToken, COOKIE_OPTS)
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}
```

- [x] **Step 5: Run tests — verify pass**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: all tests PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/ server/tests/
git commit -m "feat: invite flow (send invite + accept invite)"
```

---

## Task 6: Auth — Password Reset

**Files:**
- Modify: `server/src/controllers/auth.controller.ts` (forgotPassword + resetPassword)

- [x] **Step 1: Write failing tests**

```typescript
// Add to server/tests/auth.test.ts

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

    // Trigger forgot-password
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@test.com' })

    const refreshed = await db.user.findUnique({ where: { id: user.id } })
    expect(refreshed!.resetToken).not.toBeNull()

    // Reset with the token
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: refreshed!.resetToken, newPassword: 'NewSecure999!' })
    expect(res.status).toBe(200)

    // Old password no longer works
    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@test.com', password: 'Password123!' })
    expect(loginOld.status).toBe(401)

    // New password works
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
```

- [x] **Step 2: Run — verify fail**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: password reset tests FAIL.

- [x] **Step 3: Implement forgotPassword and resetPassword**

```typescript
// Replace stubs in server/src/controllers/auth.controller.ts

const forgotSchema = z.object({ email: z.string().email() })
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) })

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    // Always return 200 to prevent user enumeration
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex')
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      })
      await sendPasswordResetEmail(email, token)
    }
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = resetSchema.parse(req.body)
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
    })
    if (!user) throw new AppError(400, 'Invalid or expired reset token')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    })
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}
```

- [x] **Step 4: Run tests — all auth tests pass**

```bash
cd server && npm test -- tests/auth.test.ts
```

Expected: all PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/controllers/auth.controller.ts
git commit -m "feat: password reset flow"
```

---

## Task 7: Rooms API

**Files:**
- Create: `server/src/routes/rooms.ts`
- Create: `server/src/controllers/rooms.controller.ts`

- [x] **Step 1: Write failing tests**

```typescript
// server/tests/auth.test.ts — add a new file server/tests/rooms.test.ts

// server/tests/rooms.test.ts
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
```

- [x] **Step 2: Run — verify fail**

```bash
cd server && npm test -- tests/rooms.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement rooms routes and controller**

```typescript
// server/src/routes/rooms.ts
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import * as rooms from '../controllers/rooms.controller'

const router = Router()
router.use(authenticate)
router.get('/', rooms.listRooms)
export default router
```

```typescript
// server/src/controllers/rooms.controller.ts
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await prisma.room.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    res.json(rooms)
  } catch (err) { next(err) }
}
```

Replace stubs in `server/src/controllers/admin.controller.ts`:

```typescript
// Replace listRooms, createRoom, updateRoom, deleteRoom stubs

const roomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  zone: z.enum(['OFFICE', 'SHARED']),
  location: z.string().optional(),
  description: z.string().optional(),
})

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })
    res.json(rooms)
  } catch (err) { next(err) }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = roomSchema.parse(req.body)
    const room = await prisma.room.create({ data })
    res.status(201).json(room)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = roomSchema.partial().parse(req.body)
    const room = await prisma.room.update({ where: { id: req.params.id }, data })
    res.json(room)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.room.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ ok: true })
  } catch (err) { next(err) }
}
```

- [x] **Step 4: Run tests — verify pass**

```bash
cd server && npm test -- tests/rooms.test.ts
```

Expected: all PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/ server/tests/rooms.test.ts
git commit -m "feat: rooms API (list + admin CRUD)"
```

---

## Task 8: Booking Service — Business Rules

**Files:**
- Create: `server/src/services/booking.service.ts`

This is the most critical task. All booking rules are validated here in a single transaction.

- [x] **Step 1: Write failing business rule tests**

```typescript
// server/tests/bookings.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { clearDatabase, createUser, createRoom } from './helpers'
import { prisma } from '../src/lib/prisma'

const app = createApp()

// Helper: create booking via API (returns response)
async function bookAs(cookie: string, body: object) {
  return request(app).post('/api/bookings').set('Cookie', cookie).send(body)
}

// Helper: get tomorrow at 10:00 (weekday-safe)
function nextWeekday(hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  // Make sure it's a weekday
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
    const end = new Date(start.getTime() + 60 * 60 * 1000) // +1h

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
    const end = new Date(start.getTime() + 20 * 60 * 1000) // 20 min
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/30 分钟/)
  })

  it('rejects duration > 4 hours', async () => {
    const start = nextWeekday(9, 0)
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000) // 5h
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/4 小时/)
  })

  it('rejects non-:00/:30 start time', async () => {
    const start = nextWeekday(10, 15) // 10:15 — invalid
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
    // Find next Saturday
    while (start.getDay() !== 6) start.setDate(start.getDate() + 1)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const res = await bookAs(cookie, { roomId: officeRoom.id, title: 'X', startTime: start.toISOString(), endTime: end.toISOString() })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/工作日/)
  })

  it('rejects SHARED room outside 09:00–18:00', async () => {
    const start = nextWeekday(8, 0) // 08:00 — too early
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
```

- [x] **Step 2: Run — verify fail**

```bash
cd server && npm test -- tests/bookings.test.ts
```

Expected: FAIL — routes not defined.

- [x] **Step 3: Implement booking.service.ts**

```typescript
// server/src/services/booking.service.ts
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

  // --- Stateless validations (no DB needed) ---
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

  // --- DB-dependent validations ---
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } })
    if (!room || !room.isActive) throw new AppError(404, '会议室不存在')

    // Zone rules
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

    // Room conflict (lock rows for update)
    const roomConflict = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "roomId" = ${roomId}
        AND status = 'CONFIRMED'
        AND "startTime" < ${endTime}
        AND "endTime" > ${startTime}
      FOR UPDATE
    `
    if (roomConflict.length > 0) throw new AppError(409, '该时段已被预订，存在冲突')

    // BlockedSlot conflict
    const blockedConflict = await tx.blockedSlot.findFirst({
      where: { roomId, startTime: { lt: endTime }, endTime: { gt: startTime } },
    })
    if (blockedConflict) throw new AppError(409, '该时段已被管理员封锁')

    // User double-booking conflict
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
```

- [x] **Step 4: Run — verify business rule tests pass**

```bash
cd server && npm test -- tests/bookings.test.ts
```

Expected: the business rule tests pass once we add the routes in the next task.

- [x] **Step 6: Commit**

```bash
git add server/src/services/booking.service.ts server/tests/bookings.test.ts
git commit -m "feat: booking business rules service with transaction locking"
```

---

## Task 9: Bookings API Routes

**Files:**
- Create: `server/src/routes/bookings.ts`
- Create: `server/src/controllers/bookings.controller.ts`

- [x] **Step 1: Implement routes and controller**

```typescript
// server/src/routes/bookings.ts
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { bookingLimiter } from '../middleware/rateLimiter'
import * as bookings from '../controllers/bookings.controller'

const router = Router()
router.use(authenticate)
router.get('/', bookings.listBookings)
router.get('/mine', bookings.myBookings)
router.post('/', bookingLimiter, bookings.createBooking)
router.delete('/:id', bookings.cancelBooking)
export default router
```

```typescript
// server/src/controllers/bookings.controller.ts
import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/authenticate'
import * as bookingService from '../services/booking.service'

const createSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
})

export async function listBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, roomId } = req.query as { date?: string; roomId?: string }
    const where: Record<string, unknown> = { status: 'CONFIRMED' }

    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.startTime = { gte: dayStart, lte: dayEnd }
    }
    if (roomId) where.roomId = roomId

    const bookings = await prisma.booking.findMany({
      where,
      include: { room: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    })

    // Mask other users' titles for privacy
    const userId = req.user!.userId
    const masked = bookings.map((b) => ({
      ...b,
      title: b.userId === userId ? b.title : null,
      isOwn: b.userId === userId,
    }))
    res.json(masked)
  } catch (err) { next(err) }
}

export async function myBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as { status?: string }
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId, ...(status ? { status: status as 'CONFIRMED' | 'CANCELLED' } : {}) },
      include: { room: { select: { name: true, capacity: true } } },
      orderBy: { startTime: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
}

export async function createBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, title, startTime, endTime } = createSchema.parse(req.body)
    const booking = await bookingService.createBooking({
      userId: req.user!.userId,
      roomId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    })
    res.status(201).json(booking)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id,
      req.user!.userId,
      req.user!.role === 'ADMIN'
    )
    res.json(booking)
  } catch (err) { next(err) }
}
```

- [x] **Step 2: Run all booking tests**

```bash
cd server && npm test -- tests/bookings.test.ts
```

Expected: all PASS.

- [x] **Step 3: Commit**

```bash
git add server/src/routes/bookings.ts server/src/controllers/bookings.controller.ts
git commit -m "feat: bookings API (list, my bookings, create, cancel)"
```

---

## Task 10: Admin APIs — Users, Blocked Slots, All Bookings

**Files:**
- Modify: `server/src/controllers/admin.controller.ts` (replace remaining stubs)

- [x] **Step 1: Write failing admin tests**

```typescript
// server/tests/admin.test.ts
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
```

- [x] **Step 2: Run — verify fail**

```bash
cd server && npm test -- tests/admin.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement remaining admin controller stubs**

```typescript
// Replace stubs in server/src/controllers/admin.controller.ts

const blockedSlotSchema = z.object({
  roomId: z.string().uuid(),
  reason: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
})

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) { next(err) }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    res.json(user)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function listBlockedSlots(_req: Request, res: Response, next: NextFunction) {
  try {
    const slots = await prisma.blockedSlot.findMany({ include: { room: { select: { name: true } } }, orderBy: { startTime: 'asc' } })
    res.json(slots)
  } catch (err) { next(err) }
}

export async function createBlockedSlot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, reason, startTime, endTime } = blockedSlotSchema.parse(req.body)
    const slot = await prisma.blockedSlot.create({
      data: { roomId, reason, startTime: new Date(startTime), endTime: new Date(endTime), createdBy: req.user!.userId },
    })
    res.status(201).json(slot)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}

export async function deleteBlockedSlot(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.blockedSlot.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function listAllBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, roomId, userId } = req.query as Record<string, string | undefined>
    const where: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.startTime = { gte: dayStart, lte: dayEnd }
    }
    if (roomId) where.roomId = roomId
    if (userId) where.userId = userId

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
}

export async function cancelAnyBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, '', true)
    res.json(booking)
  } catch (err) { next(err) }
}
```

Add import at top of admin.controller.ts:
```typescript
import * as bookingService from '../services/booking.service'
```

- [x] **Step 4: Run all tests**

```bash
cd server && npm test
```

Expected: all tests PASS across auth, rooms, bookings, admin test files.

- [x] **Step 5: Final commit**

```bash
git add server/src/controllers/admin.controller.ts server/tests/admin.test.ts
git commit -m "feat: admin APIs for users, blocked slots, and all bookings"
```

---

## Done

The full backend API is now implemented and tested. Verify the full test suite:

```bash
cd server && npm test
```

Expected output:
```
✓ tests/auth.test.ts (10 tests)
✓ tests/rooms.test.ts (4 tests)
✓ tests/bookings.test.ts (8 tests)
✓ tests/admin.test.ts (5 tests)

Test Files: 4 passed
Tests: 27 passed
```

Start the dev server and smoke-test with curl:

```bash
cd server && npm run dev

# In another terminal:
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@company.com","password":"Admin1234!"}'
# Expected: {"id":"...","name":"Admin","email":"admin@company.com","role":"ADMIN"}
```

**Next: Plan 2 — Frontend (React + Tailwind + React Query)**
