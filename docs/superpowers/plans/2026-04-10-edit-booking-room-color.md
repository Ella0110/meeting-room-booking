# Edit Booking + Room Color Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to configure room colors in the admin UI, and allow users to edit their own bookings (title + same-day start time + duration) from both the calendar and the My Bookings page.

**Architecture:** New `PATCH /api/bookings/:id` endpoint with conflict detection excluding self; `EditBookingForm` / `EditBookingPanel` components that reuse the existing duration-button pattern; CalendarCell made clickable for own bookings; BookingCard receives an optional `onEdit` callback.

**Tech Stack:** Express + Prisma (backend), React + React Query v5 + Tailwind (frontend), Vitest (tests)

---

## File Map

**Created:**
- `client/src/components/booking/EditBookingForm.tsx`
- `client/src/components/booking/EditBookingPanel.tsx`

**Modified:**
- `server/src/services/booking.service.ts` — add `updateBooking`
- `server/src/controllers/bookings.controller.ts` — add `updateBooking` handler + Zod schema
- `server/src/routes/bookings.ts` — add `PATCH /:id`
- `server/src/controllers/admin.controller.ts` — extend `roomSchema` with `colorIndex`
- `client/src/api/bookings.ts` — add `updateBooking` function
- `client/src/components/calendar/CalendarCell.tsx` — add `onBookingClick` prop
- `client/src/components/calendar/CalendarGrid.tsx` — add `onBookingClick` prop, pass through
- `client/src/pages/CalendarPage.tsx` — add edit panel state + `handleBookingClick`
- `client/src/components/booking/BookingCard.tsx` — add optional `onEdit` prop
- `client/src/pages/MyBookingsPage.tsx` — add `useRooms`, manage EditBookingPanel state
- `client/src/pages/admin/RoomsPage.tsx` — add `colorIndex` to form state + color swatch UI

---

### Task 1: Backend — colorIndex in admin room CRUD

**Files:**
- Modify: `server/src/controllers/admin.controller.ts:148-178`

- [ ] **Step 1: Extend roomSchema to accept colorIndex**

In `admin.controller.ts`, replace the existing `roomSchema` definition:

```ts
const roomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  zone: z.enum(['OFFICE', 'SHARED']),
  location: z.string().optional(),
  description: z.string().optional(),
  colorIndex: z.number().int().min(0).max(7).optional(),
})
```

- [ ] **Step 2: Use colorIndex in createRoom when provided**

Replace the `createRoom` function body:

```ts
export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = roomSchema.parse(req.body)
    let { colorIndex } = data
    if (colorIndex === undefined) {
      const usedIndices = new Set(
        (await prisma.room.findMany({ select: { colorIndex: true } })).map((r) => r.colorIndex)
      )
      colorIndex = 0
      while (usedIndices.has(colorIndex)) colorIndex++
    }
    const room = await prisma.room.create({ data: { ...data, colorIndex } })
    res.status(201).json(room)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}
```

(`updateRoom` already uses `roomSchema.partial().extend(...)` so `colorIndex` is automatically accepted in updates — no change needed there.)

- [ ] **Step 3: Verify manually**

Start the server (`cd server && npm run dev`), then:
```bash
# Update room colorIndex (replace <ROOM_ID> with a real ID from your DB)
curl -s -X PATCH http://localhost:3000/api/admin/rooms/<ROOM_ID> \
  -H "Content-Type: application/json" \
  -b "token=<ADMIN_JWT>" \
  -d '{"colorIndex": 3}' | jq '.colorIndex'
# Expected: 3
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/admin.controller.ts
git commit -m "feat: accept colorIndex in admin room create/update"
```

---

### Task 2: Backend — PATCH /api/bookings/:id (updateBooking)

**Files:**
- Modify: `server/src/services/booking.service.ts`
- Modify: `server/src/controllers/bookings.controller.ts`
- Modify: `server/src/routes/bookings.ts`
- Test: `server/src/services/__tests__/booking.service.test.ts` (or wherever existing booking tests live)

- [ ] **Step 1: Write failing tests for updateBooking**

Find the existing booking service test file (look in `server/src/services/__tests__/` or `server/src/__tests__/`). Add the following test suite:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { updateBooking } from '../booking.service'

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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npx vitest run --reporter=verbose 2>&1 | grep -A2 "updateBooking"
# Expected: FAIL — updateBooking is not defined
```

- [ ] **Step 3: Implement updateBooking in booking.service.ts**

Add after the `cancelBooking` function:

```ts
export interface UpdateBookingInput {
  title?: string
  startTime?: Date
  endTime?: Date
}

export async function updateBooking(bookingId: string, userId: string, input: UpdateBookingInput) {
  const { title, startTime, endTime } = input

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AppError(404, '预订不存在')
  if (booking.userId !== userId) throw new AppError(403, '无权修改该预订')
  if (booking.status === 'CANCELLED') throw new AppError(400, '预订已取消，无法修改')
  if (booking.startTime <= new Date()) throw new AppError(422, '无法修改已开始或已过去的预订')

  const newStart = startTime ?? booking.startTime
  const newEnd = endTime ?? booking.endTime

  if (startTime || endTime) {
    const startMin = newStart.getMinutes()
    const endMin = newEnd.getMinutes()
    if (startMin !== 0 && startMin !== 30) throw new AppError(422, '开始时间必须为整点或半点')
    if (endMin !== 0 && endMin !== 30) throw new AppError(422, '结束时间必须为整点或半点')
    const durationMin = (newEnd.getTime() - newStart.getTime()) / 60_000
    if (durationMin < 30) throw new AppError(422, '最短预订时长为 30 分钟')
    if (durationMin > 240) throw new AppError(422, '最长预订时长为 4 小时')
  }

  return prisma.$transaction(async (tx) => {
    const roomConflict = await tx.booking.findFirst({
      where: {
        id: { not: bookingId },
        roomId: booking.roomId,
        status: 'CONFIRMED',
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    })
    if (roomConflict) throw new AppError(409, '该时段已被预订，存在冲突')

    const blockedConflict = await tx.blockedSlot.findFirst({
      where: { roomId: booking.roomId, startTime: { lt: newEnd }, endTime: { gt: newStart } },
    })
    if (blockedConflict) throw new AppError(409, '该时段已被管理员封锁')

    const userConflict = await tx.booking.findFirst({
      where: {
        id: { not: bookingId },
        userId,
        status: 'CONFIRMED',
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    })
    if (userConflict) throw new AppError(409, '您在该时段已有其他预订')

    return tx.booking.update({
      where: { id: bookingId },
      data: {
        ...(title !== undefined && { title }),
        startTime: newStart,
        endTime: newEnd,
      },
      include: { room: { select: { name: true, capacity: true } } },
    })
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd server && npx vitest run --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|updateBooking)"
# Expected: all updateBooking tests PASS
```

- [ ] **Step 5: Add updateBooking handler to bookings.controller.ts**

Add after the `createBooking` function, before `cancelBooking`:

```ts
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
})

export async function updateBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, startTime, endTime } = updateSchema.parse(req.body)
    const booking = await bookingService.updateBooking(
      req.params['id'] as string,
      req.user!.userId,
      {
        title,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      }
    )
    res.json(booking)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(422).json({ error: err.errors }); return }
    next(err)
  }
}
```

- [ ] **Step 6: Add PATCH route in bookings.ts**

Add after the `router.post` line:

```ts
router.patch('/:id', bookings.updateBooking)
```

- [ ] **Step 7: Commit**

```bash
git add server/src/services/booking.service.ts \
        server/src/controllers/bookings.controller.ts \
        server/src/routes/bookings.ts
git commit -m "feat: add PATCH /api/bookings/:id to update title/time with conflict detection"
```

---

### Task 3: Frontend — Admin room color picker

**Files:**
- Modify: `client/src/pages/admin/RoomsPage.tsx`

- [ ] **Step 1: Add colorIndex state and ROOM_COLORS import**

At the top of `RoomsPage.tsx`, add the import:

```ts
import { ROOM_COLORS, getRoomTextColor } from '../../utils/roomColors'
```

In the component, add `colorIndex` state alongside the existing form states:

```ts
const [colorIndex, setColorIndex] = useState(0)
```

- [ ] **Step 2: Pre-fill colorIndex in openEdit**

Update `openEdit`:

```ts
function openEdit(room: Room) {
  setEditRoom(room)
  setName(room.name); setCapacity(room.capacity); setZone(room.zone)
  setLocation(room.location ?? '')
  setColorIndex(room.colorIndex ?? 0)
  setShowForm(true)
}
```

Also update the "新建" button's onClick to reset colorIndex:

```ts
onClick={() => {
  setShowForm(true); setEditRoom(null); setName(''); setCapacity(8);
  setZone('OFFICE'); setLocation(''); setColorIndex(0)
}}
```

- [ ] **Step 3: Include colorIndex in saveMutation**

```ts
const saveMutation = useMutation({
  mutationFn: () =>
    editRoom
      ? updateRoom(editRoom.id, { name, capacity, zone, location: location || undefined, colorIndex })
      : createRoom({ name, capacity, zone, location: location || undefined, colorIndex }),
  ...
})
```

- [ ] **Step 4: Add color swatch picker to the form**

In the form's grid section, add a new field after the location field:

```tsx
<div className="flex flex-col gap-1 md:col-span-2">
  <label className="font-grotesk font-black text-sm uppercase">房间颜色</label>
  <div className="flex gap-2 flex-wrap">
    {ROOM_COLORS.map((color, idx) => (
      <button
        key={idx}
        type="button"
        onClick={() => setColorIndex(idx)}
        className="w-8 h-8 border-2 flex items-center justify-center transition-all"
        style={{
          backgroundColor: color,
          borderColor: colorIndex === idx ? '#000' : 'transparent',
          boxShadow: colorIndex === idx ? '3px 3px 0 0 #000' : 'none',
          transform: colorIndex === idx ? 'translate(-1px, -1px)' : 'none',
        }}
        aria-label={`颜色 ${idx}`}
      >
        {colorIndex === idx && (
          <span style={{ color: getRoomTextColor(idx), fontSize: 14, fontWeight: 900 }}>✓</span>
        )}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Show color swatch in room list**

In the room list item, add a color dot before the room name:

```tsx
<div className="flex items-center gap-2">
  <span
    className="w-3 h-3 border-2 border-black flex-shrink-0"
    style={{ backgroundColor: ROOM_COLORS[room.colorIndex ?? 0] }}
  />
  <span className="font-grotesk font-black">{room.name}</span>
  ...
</div>
```

- [ ] **Step 6: Verify in browser**

Start frontend (`cd client && npm run dev`), go to `/admin/rooms`, edit a room, pick a different color, save. Confirm the color dot in the list updates.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/admin/RoomsPage.tsx
git commit -m "feat: add color picker to admin room form"
```

---

### Task 4: Frontend — updateBooking API function

**Files:**
- Modify: `client/src/api/bookings.ts`

- [ ] **Step 1: Add UpdateBookingInput interface and updateBooking function**

Append to `client/src/api/bookings.ts`:

```ts
export interface UpdateBookingInput {
  title?: string
  startTime?: string
  endTime?: string
}

export async function updateBooking(id: string, input: UpdateBookingInput): Promise<MyBooking> {
  const res = await api.patch<MyBooking>(`/api/bookings/${id}`, input)
  return res.data
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/bookings.ts
git commit -m "feat: add updateBooking API function"
```

---

### Task 5: Frontend — EditBookingForm component

**Files:**
- Create: `client/src/components/booking/EditBookingForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MyBooking, Booking, BlockedSlot } from '../../types'
import { updateBooking } from '../../api/bookings'
import { formatTime } from '../../utils/dateUtils'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'

const QUICK_DURATIONS = [
  { label: '30分', value: 30 },
  { label: '1小时', value: 60 },
  { label: '1.5时', value: 90 },
  { label: '2小时', value: 120 },
]
const MORE_DURATIONS = [
  { label: '2.5时', value: 150 },
  { label: '3小时', value: 180 },
  { label: '3.5时', value: 210 },
  { label: '4小时', value: 240 },
]

// 09:00, 09:30, ..., 17:00, 17:30
const TIME_OPTIONS: string[] = []
for (let h = 9; h <= 17; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 18) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

function calcMaxDuration(
  startDate: Date,
  bookingId: string,
  roomId: string,
  dayBookings: Booking[],
  dayBlockedSlots: BlockedSlot[],
): number {
  const allItems = [
    ...dayBookings
      .filter((b) => b.roomId === roomId && b.id !== bookingId)
      .map((b) => new Date(b.startTime).getTime()),
    ...dayBlockedSlots
      .filter((s) => s.roomId === roomId)
      .map((s) => new Date(s.startTime).getTime()),
  ].filter((t) => t > startDate.getTime())
  const nextConflict = allItems.length > 0 ? Math.min(...allItems) : Infinity
  const minutesUntilNext =
    nextConflict === Infinity ? 240 : Math.floor((nextConflict - startDate.getTime()) / 60_000)
  const closeTime = new Date(startDate)
  closeTime.setHours(18, 0, 0, 0)
  const minutesToClose = Math.floor((closeTime.getTime() - startDate.getTime()) / 60_000)
  return Math.min(240, minutesUntilNext, minutesToClose)
}

function getDefaultDuration(maxDuration: number): number {
  const all = [...QUICK_DURATIONS, ...MORE_DURATIONS].filter((d) => d.value <= maxDuration)
  if (all.some((d) => d.value === 60)) return 60
  return all[0]?.value ?? 30
}

interface EditBookingFormProps {
  booking: MyBooking
  colorIndex: number
  dayBookings: Booking[]
  dayBlockedSlots: BlockedSlot[]
  dateStr: string
  onSuccess: () => void
  onCancel: () => void
}

export default function EditBookingForm({
  booking, colorIndex, dayBookings, dayBlockedSlots, dateStr, onSuccess, onCancel,
}: EditBookingFormProps) {
  const roomColor = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)

  const initStart = new Date(booking.startTime)
  const initStartStr = `${String(initStart.getHours()).padStart(2, '0')}:${String(initStart.getMinutes()).padStart(2, '0')}`
  const initDuration = Math.floor(
    (new Date(booking.endTime).getTime() - initStart.getTime()) / 60_000
  )

  const [title, setTitle] = useState(booking.title)
  const [startTimeStr, setStartTimeStr] = useState(initStartStr)
  const [durationMin, setDurationMin] = useState(initDuration)
  const [serverError, setServerError] = useState('')

  // Derive startDate from booking date + selected HH:MM
  const baseDate = new Date(booking.startTime)
  const [startHour, startMinute] = startTimeStr.split(':').map(Number)
  const startDate = new Date(
    baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(),
    startHour, startMinute!, 0, 0
  )
  const maxDuration = calcMaxDuration(startDate, booking.id, booking.roomId, dayBookings, dayBlockedSlots)
  const endDate = new Date(startDate.getTime() + durationMin * 60_000)
  const availableQuick = QUICK_DURATIONS.filter((d) => d.value <= maxDuration)
  const availableMore = MORE_DURATIONS.filter((d) => d.value <= maxDuration)
  const canBook = maxDuration >= 30

  // Clamp duration when start time changes
  useEffect(() => {
    if (durationMin > maxDuration) setDurationMin(getDefaultDuration(maxDuration))
  }, [startTimeStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      updateBooking(booking.id, {
        title,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      }),
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setServerError(msg ?? '修改失败，请重试')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', dateStr] })
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setServerError(''); mutation.mutate() }}
      className="flex flex-col gap-5"
    >
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-title" className="font-grotesk font-black text-xs uppercase">
          会议主题 *
        </label>
        <input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-none border-4 border-black font-mono text-sm px-3 py-2.5 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
          placeholder="输入会议主题..."
        />
      </div>

      {/* Start time */}
      <div className="flex flex-col gap-1.5">
        <label className="font-grotesk font-black text-xs uppercase">开始时间</label>
        <select
          value={startTimeStr}
          onChange={(e) => setStartTimeStr(e.target.value)}
          className="rounded-none border-4 border-black font-mono text-sm px-3 py-2.5 focus:outline-none"
        >
          {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label className="font-grotesk font-black text-xs uppercase">
          时长
          {maxDuration < 240 && canBook && (
            <span className="ml-2 font-mono text-[9px] text-gray-400 normal-case">
              (最长 {maxDuration >= 60 ? `${maxDuration / 60}小时` : `${maxDuration}分钟`})
            </span>
          )}
        </label>
        {!canBook ? (
          <p className="font-mono text-[11px] text-[#FF006E] font-bold">
            该时段剩余时间不足 30 分钟，请选择其他时间
          </p>
        ) : (
          <>
            {availableQuick.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {availableQuick.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMin(d.value)}
                    className="rounded-none border-4 border-black font-grotesk font-black text-xs uppercase py-1.5 transition-all"
                    style={durationMin === d.value
                      ? { background: roomColor, color: textColor, boxShadow: '4px 4px 0 0 #000' }
                      : { background: '#fff', color: '#000' }
                    }
                  >{d.label}</button>
                ))}
              </div>
            )}
            {availableMore.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {availableMore.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMin(d.value)}
                    className="rounded-none border-2 border-black font-mono text-[10px] py-1 transition-all"
                    style={durationMin === d.value
                      ? { background: roomColor, color: textColor }
                      : { background: '#f9fafb', color: '#000' }
                    }
                  >{d.label}</button>
                ))}
              </div>
            )}
            <p className="font-mono text-[10px] text-gray-500">
              结束时间：{formatTime(endDate)}
            </p>
          </>
        )}
      </div>

      {serverError && (
        <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-4 border-t-4 border-black mt-auto">
        <button
          type="submit"
          disabled={!title.trim() || !canBook || mutation.isPending}
          className="w-full rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-3 text-sm transition-all disabled:opacity-50 disabled:pointer-events-none hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          style={{ boxShadow: `6px 6px 0 0 ${roomColor}` }}
        >
          {mutation.isPending ? '保存中...' : '✓ 保存修改'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-none border-4 border-black bg-white font-grotesk font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          取消
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/booking/EditBookingForm.tsx
git commit -m "feat: add EditBookingForm component"
```

---

### Task 6: Frontend — EditBookingPanel component

**Files:**
- Create: `client/src/components/booking/EditBookingPanel.tsx`

- [ ] **Step 1: Create the panel**

```tsx
import { useEffect } from 'react'
import type { MyBooking, Booking, BlockedSlot } from '../../types'
import { getRoomColor, getRoomTextColor } from '../../utils/roomColors'
import { formatTime, formatDisplayDate, formatDate } from '../../utils/dateUtils'
import { useBookings } from '../../hooks/useBookings'
import { useBlockedSlots } from '../../hooks/useBlockedSlots'
import EditBookingForm from './EditBookingForm'

interface EditBookingPanelProps {
  isOpen: boolean
  booking: MyBooking | null
  colorIndex: number
  onClose: () => void
}

export default function EditBookingPanel({ isOpen, booking, colorIndex, onClose }: EditBookingPanelProps) {
  const dateStr = booking ? formatDate(new Date(booking.startTime)) : ''
  const { data: dayBookings = [] } = useBookings(dateStr)
  const { data: dayBlockedSlots = [] } = useBlockedSlots(dateStr)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!booking) return null

  const color = getRoomColor(colorIndex)
  const textColor = getRoomTextColor(colorIndex)
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)

  const header = (
    <>
      <div
        style={{ backgroundColor: '#fff', borderBottom: '4px solid #000', padding: '10px 16px' }}
        className="flex items-center justify-between"
      >
        <div style={{ display: 'inline-block', transform: 'rotate(-1deg)' }}>
          <span
            className="font-grotesk font-black text-[11px] uppercase px-2.5 py-1 border-[3px] border-black"
            style={{ background: color, color: textColor, letterSpacing: '0.5px' }}
          >
            ✎ 编辑预订
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-none border-4 border-black bg-white px-2 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-3 p-5" style={{ borderBottom: '4px solid #000' }}>
        <div>
          <h2 className="font-grotesk font-black text-2xl uppercase" style={{ letterSpacing: '-0.5px' }}>
            {booking.room.name}
          </h2>
          <p className="font-mono text-[11px] text-gray-500 mt-0.5 uppercase">
            {formatDisplayDate(start)}
          </p>
        </div>
        <div className="border-4 border-black px-4 py-3" style={{ backgroundColor: color }}>
          <div className="flex items-center gap-2.5">
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(start)}
            </div>
            <span className="font-black text-xl" style={{ color: textColor }}>→</span>
            <div className="font-mono font-bold text-lg bg-black px-3 py-1" style={{ color }}>
              {formatTime(end)}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: slide-out right panel */}
      <div
        className={`hidden md:flex fixed top-0 right-0 h-full bg-white border-l-4 border-black z-50 flex-col transition-transform duration-[250ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 360 }}
      >
        {header}
        <div className="flex-1 overflow-y-auto p-6">
          <EditBookingForm
            booking={booking}
            colorIndex={colorIndex}
            dayBookings={dayBookings}
            dayBlockedSlots={dayBlockedSlots}
            dateStr={dateStr}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 bg-white border-t-4 border-black z-50 flex flex-col transition-transform duration-[280ms] ease-[cubic-bezier(.25,.46,.45,.94)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex justify-center py-2.5">
          <div className="w-10 h-1 bg-black" />
        </div>
        {header}
        <div className="overflow-y-auto p-4">
          <EditBookingForm
            booking={booking}
            colorIndex={colorIndex}
            dayBookings={dayBookings}
            dayBlockedSlots={dayBlockedSlots}
            dateStr={dateStr}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/booking/EditBookingPanel.tsx
git commit -m "feat: add EditBookingPanel component (slide-out + bottom sheet)"
```

---

### Task 7: Frontend — Calendar entry point (ownBooking click → edit panel)

**Files:**
- Modify: `client/src/components/calendar/CalendarCell.tsx`
- Modify: `client/src/components/calendar/CalendarGrid.tsx`
- Modify: `client/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Add onBookingClick prop to CalendarCell**

In `CalendarCell.tsx`, update the `CalendarCellProps` interface:

```ts
interface CalendarCellProps {
  cell: CellData
  room: Room
  colorIndex: number
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  onBookingClick?: (booking: Booking, room: Room) => void
  style: CSSProperties
}
```

Update the component signature to destructure `onBookingClick`:

```ts
export default function CalendarCell({
  cell, room, colorIndex, selectedDate, onCellClick, onBookingClick, style,
}: CalendarCellProps) {
```

In the `ownBooking` branch, make the div clickable when `onBookingClick` is provided. Replace the existing `ownBooking` div:

```tsx
if (cell.type === 'ownBooking' && cell.booking) {
  const start = new Date(cell.booking.startTime)
  const end = new Date(cell.booking.endTime)
  const isPast = new Date(cell.booking.startTime) <= new Date()
  return (
    <div
      style={{
        ...style,
        backgroundColor: color,
        border: '3px solid #000',
        boxShadow: '4px 4px 0 0 #000',
        padding: '8px 10px',
        overflow: 'hidden',
        zIndex: 10,
        cursor: onBookingClick && !isPast ? 'pointer' : 'default',
      }}
      className="my-booking relative flex flex-col"
      onClick={onBookingClick && !isPast ? () => onBookingClick(cell.booking!, room) : undefined}
    >
      <div
        className="font-grotesk font-black text-xs uppercase truncate leading-tight"
        style={{ color: textColor, letterSpacing: '0.3px' }}
      >
        {cell.booking.title}
      </div>
      <div className="font-mono text-[10px] mt-0.5" style={{ color: textColor, opacity: 0.8 }}>
        {formatTime(start)} → {formatTime(end)}
      </div>
      <div
        className="absolute bottom-1 right-1.5 font-mono text-[9px] font-bold uppercase px-1 border"
        style={{ background: 'rgba(0,0,0,0.2)', color: textColor, borderColor: 'rgba(0,0,0,0.3)' }}
      >
        {onBookingClick && !isPast ? '点击编辑' : '我的'}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add onBookingClick prop to CalendarGrid**

In `CalendarGrid.tsx`, update `CalendarGridProps`:

```ts
interface CalendarGridProps {
  rooms: Room[]
  bookings: Booking[]
  blockedSlots: BlockedSlot[]
  selectedDate: Date
  onCellClick: (room: Room, startTime: Date) => void
  onBookingClick?: (booking: Booking, room: Room) => void
  isLoading: boolean
}
```

Update the function signature and pass `onBookingClick` to `CalendarCell`:

```ts
export default function CalendarGrid({
  rooms, bookings, blockedSlots, selectedDate, onCellClick, onBookingClick, isLoading,
}: CalendarGridProps) {
```

In the `CalendarCell` render call inside `rooms.map`, add:

```tsx
<CalendarCell
  key={`${room.id}-${cell.slotIdx}`}
  cell={cell}
  room={room}
  colorIndex={room.colorIndex ?? rIdx}
  selectedDate={selectedDate}
  onCellClick={onCellClick}
  onBookingClick={onBookingClick}
  style={{ gridRow: `${gridRowStart} / span ${cell.span}`, gridColumn: rIdx + 2 }}
/>
```

- [ ] **Step 3: Wire up in CalendarPage**

In `CalendarPage.tsx`, add imports at the top:

```ts
import EditBookingPanel from '../components/booking/EditBookingPanel'
import type { MyBooking } from '../types'
```

Add state for the edit panel:

```ts
const [editPanelOpen, setEditPanelOpen] = useState(false)
const [editBooking, setEditBooking] = useState<MyBooking | null>(null)
const [editColorIndex, setEditColorIndex] = useState(0)
```

Add handler function after `handleCellClick`:

```ts
function handleBookingClick(booking: Booking, room: Room) {
  const myBooking: MyBooking = {
    id: booking.id,
    userId: booking.userId,
    roomId: booking.roomId,
    title: booking.title!,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    createdAt: booking.createdAt,
    room: { name: booking.room.name, capacity: room.capacity },
  }
  setEditBooking(myBooking)
  setEditColorIndex(room.colorIndex ?? 0)
  setEditPanelOpen(true)
}
```

Pass `onBookingClick` to `CalendarGrid`:

```tsx
<CalendarGrid
  rooms={rooms}
  bookings={bookings}
  blockedSlots={blockedSlots}
  selectedDate={selectedDate}
  onCellClick={handleCellClick}
  onBookingClick={handleBookingClick}
  isLoading={roomsLoading || bookingsLoading}
/>
```

Add `EditBookingPanel` at the bottom of the return, after `BookingPanel`:

```tsx
<EditBookingPanel
  isOpen={editPanelOpen}
  booking={editBooking}
  colorIndex={editColorIndex}
  onClose={() => setEditPanelOpen(false)}
/>
```

- [ ] **Step 4: Verify in browser**

Start dev servers. Create a future booking, then click its block in the calendar. The edit panel should slide in, pre-filled with the booking's title and time. Change the title, click "保存修改", confirm the calendar updates.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/calendar/CalendarCell.tsx \
        client/src/components/calendar/CalendarGrid.tsx \
        client/src/pages/CalendarPage.tsx
git commit -m "feat: make own booking blocks clickable in calendar to open edit panel"
```

---

### Task 8: Frontend — MyBookings entry point (edit button → edit panel)

**Files:**
- Modify: `client/src/components/booking/BookingCard.tsx`
- Modify: `client/src/pages/MyBookingsPage.tsx`

- [ ] **Step 1: Add onEdit prop to BookingCard**

In `BookingCard.tsx`, update `BookingCardProps`:

```ts
interface BookingCardProps {
  booking: MyBooking
  roomColorIndex?: number
  canCancel: boolean
  canEdit: boolean
  onEdit?: () => void
}
```

Update the component signature:

```ts
export default function BookingCard({ booking, roomColorIndex = 0, canCancel, canEdit, onEdit }: BookingCardProps) {
```

In the button area, add an edit button before the cancel button:

```tsx
{canEdit && booking.status === 'CONFIRMED' && (
  <button
    onClick={onEdit}
    className="rounded-none border-4 border-black bg-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex-shrink-0"
  >
    编辑
  </button>
)}
```

Update the button container to be a flex column on mobile and row on larger screens:

```tsx
<div className="flex flex-col gap-2 items-end flex-shrink-0">
  {/* edit button */}
  {/* cancel button */}
</div>
```

- [ ] **Step 2: Wire up MyBookingsPage**

In `MyBookingsPage.tsx`, add imports:

```ts
import { useState } from 'react'
import { useRooms } from '../hooks/useRooms'
import EditBookingPanel from '../components/booking/EditBookingPanel'
import type { MyBooking } from '../types'
```

Add `useRooms` call and edit panel state inside the component:

```ts
const { data: rooms = [] } = useRooms()
const [editPanelOpen, setEditPanelOpen] = useState(false)
const [editBooking, setEditBooking] = useState<MyBooking | null>(null)
const [editColorIndex, setEditColorIndex] = useState(0)
```

Add a helper to check if a booking can be edited (same rule as canCancel):

```ts
function canEdit(b: MyBooking): boolean {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
  return b.status === 'CONFIRMED' && new Date(b.startTime) > oneHourFromNow
}
```

Add `handleEdit`:

```ts
function handleEdit(b: MyBooking) {
  const room = rooms.find((r) => r.id === b.roomId)
  setEditBooking(b)
  setEditColorIndex(room?.colorIndex ?? 0)
  setEditPanelOpen(true)
}
```

Update the `BookingCard` render:

```tsx
<BookingCard
  key={b.id}
  booking={b}
  canCancel={canCancel(b)}
  canEdit={canEdit(b)}
  onEdit={() => handleEdit(b)}
/>
```

Add `EditBookingPanel` at the bottom of the return:

```tsx
<EditBookingPanel
  isOpen={editPanelOpen}
  booking={editBooking}
  colorIndex={editColorIndex}
  onClose={() => setEditPanelOpen(false)}
/>
```

- [ ] **Step 3: Verify in browser**

Go to `/my-bookings`. Upcoming bookings should show an "编辑" button. Click it, change the title, save. Confirm the list refreshes with the new title.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/booking/BookingCard.tsx \
        client/src/pages/MyBookingsPage.tsx
git commit -m "feat: add edit button to BookingCard and wire up edit panel in MyBookingsPage"
```
