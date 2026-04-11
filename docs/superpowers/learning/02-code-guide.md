# 代码导读：企业会议室预订系统

**整理日期：** 2026-04-11
**目的：** 按模块逐一解析关键代码的实现思路，适合边看代码边阅读

---

## 一、项目结构总览

```
booking-app/
├── server/src/
│   ├── routes/           # Express 路由定义（URL → controller 函数）
│   ├── controllers/      # 请求处理（Zod 验证 + 调用 service）
│   ├── services/         # 核心业务逻辑（数据库操作）
│   ├── middleware/        # 认证中间件、错误处理
│   └── lib/prisma.ts     # Prisma client 单例
│
├── client/src/
│   ├── api/              # axios 请求函数（每个资源一个文件）
│   ├── hooks/            # React Query 封装（useBookings, useRooms...）
│   ├── components/
│   │   ├── calendar/     # 日历网格相关组件
│   │   └── booking/      # 预订面板相关组件
│   ├── pages/            # 路由页面（CalendarPage, MyBookingsPage...）
│   ├── types/index.ts    # 所有前端类型定义
│   └── utils/            # 工具函数（日期、颜色）
```

**数据流方向：**
```
用户操作
  → React 组件（页面/UI）
  → React Query hook
  → api/ 函数（axios）
  → Express 路由
  → controller（Zod 验证）
  → service（Prisma 事务）
  → PostgreSQL
  → 返回数据沿原路回来
  → React Query 缓存更新
  → 组件重渲染
```

---

## 二、后端核心：认证系统

**文件：** `server/src/middleware/auth.ts`、`server/src/controllers/auth.controller.ts`

### JWT + httpOnly Cookie

登录成功后，服务端将 JWT 写入 httpOnly Cookie：

```ts
// auth.controller.ts
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '8h' }
)
res.cookie('token', token, {
  httpOnly: true,    // JS 无法读取，防 XSS
  sameSite: 'lax',  // 防 CSRF（同站请求携带）
  maxAge: 8 * 60 * 60 * 1000,
})
```

后续请求，认证中间件从 Cookie 读取并验证 token：

```ts
// middleware/auth.ts
export function requireAuth(req, res, next) {
  const token = req.cookies['token']
  if (!token) return res.status(401).json({ error: '未登录' })
  const payload = jwt.verify(token, process.env.JWT_SECRET!)
  req.user = payload  // { userId, role }
  next()
}
```

**为什么不用 localStorage 存 JWT？**
localStorage 可被 JavaScript 读取，若存在 XSS 漏洞，攻击者可窃取 token。httpOnly Cookie 不可被 JS 读取，XSS 无效。

### 权限中间件

```ts
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: '需要管理员权限' })
  next()
}
```

用法：路由级别声明式保护：
```ts
router.post('/rooms', requireAuth, requireAdmin, admin.createRoom)
```

---

## 三、后端核心：业务逻辑层（Service）

**文件：** `server/src/services/booking.service.ts`

### 为什么要有 Service 层？

Controller 负责 HTTP 解析，Service 负责业务逻辑。分层的好处：
- Service 函数可以被测试（不依赖 HTTP）
- Service 可被多个 Controller 复用

### createBooking 的完整校验链

```
① 开始时间 > 当前时间           → 不能预过去
② startTime <= now + 7天         → 不能预太远
③ 时长 30～240 分钟              → 业务规则
④ 时间必须整点或半点             → 粒度限制
⑤ 事务开始
   ⑥ 查 Room 是否存在            → 404
   ⑦ OFFICE 区 → 检查是否工作日  → 422
   ⑧ SHARED 区 → 检查 09:00-18:00 → 422
   ⑨ SELECT ... FOR UPDATE        → 行级锁（防并发）
   ⑩ 检查房间同时段是否有 CONFIRMED → 409
   ⑪ 检查 BlockedSlot 是否冲突    → 409
   ⑫ 检查该用户同时段是否有其他预订 → 409
   ⑬ INSERT Booking
⑭ 事务提交
```

### 行级锁的工作原理

```ts
// 先用 raw SQL 锁住可能冲突的行
await tx.$queryRaw`
  SELECT id FROM "Booking"
  WHERE "roomId" = ${roomId}
    AND status = 'CONFIRMED'::"BookingStatus"
    AND "startTime" < ${endTime}
    AND "endTime" > ${startTime}
  FOR UPDATE   ← 关键
`
// 然后再用 Prisma 检查（获取完整对象）
const conflict = await tx.booking.findFirst(...)
```

**为什么要两步？**
`FOR UPDATE` 只是锁，不返回是否有冲突。随后的 `findFirst` 才是检查冲突并获取数据。

**并发场景：**
- 用户 A 和 B 同时预订同一时段
- A 先拿到锁，B 等待
- A 检测：无冲突 → INSERT → COMMIT → 释放锁
- B 拿到锁，检测：发现 A 的预订 → 返回 409

### updateBooking 与 createBooking 的关键差异

编辑预订时，冲突检测必须排除自身：

```ts
const roomConflict = await tx.booking.findFirst({
  where: {
    id: { not: bookingId },  // ← 排除自己，否则时间不变也报冲突
    roomId: booking.roomId,
    status: 'CONFIRMED',
    startTime: { lt: newEnd },
    endTime: { gt: newStart },
  },
})
```

行级锁也要排除自身：
```sql
AND id::text != ${bookingId}   -- 注意：用 id::text 而非 id::uuid
                                -- Prisma 模板参数以 text 传入
```

---

## 四、后端核心：错误处理

**文件：** `server/src/middleware/errorHandler.ts`

### AppError 类

```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}
```

Service 层抛出 `AppError`，中间件统一处理：

```ts
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  // 未预期的错误
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})
```

**好处：** Service 层不需要知道 HTTP，只需要 `throw new AppError(409, '...')` 即可。

---

## 五、前端核心：React Query 数据层

**文件：** `client/src/hooks/`

### 基本模式

```ts
// hooks/useBookings.ts
export function useBookings(date: string) {
  return useQuery<Booking[]>({
    queryKey: ['bookings', date],    // 缓存 key（date 变了就是不同的缓存）
    queryFn: () => listBookings(date),
    enabled: !!date,                 // date 为空时不请求
  })
}
```

组件里使用：
```ts
const { data: bookings = [], isLoading } = useBookings(dateStr)
```

### queryKey 的设计

queryKey 是缓存的标识符。设计原则：
- `['bookings', dateStr]` — 每天的预订是独立缓存（切换日期不会混）
- `['bookings']` — 无参数的 key 可以用 `invalidateQueries` 批量失效

```ts
// 精确失效今天的缓存
qc.invalidateQueries({ queryKey: ['bookings', '2026-04-11'] })

// 失效所有预订缓存（不管哪天）
qc.invalidateQueries({ queryKey: ['bookings'] })
```

### useMutation 模式

```ts
const mutation = useMutation({
  mutationFn: (data) => createBooking(data),
  onSuccess: () => {
    // 让相关缓存失效，触发重新请求
    qc.invalidateQueries({ queryKey: ['bookings', dateStr] })
    // 关闭面板
    onClose()
  },
  onError: (err) => {
    // 显示服务端错误
    const msg = err?.response?.data?.error
    setServerError(msg ?? '操作失败，请重试')
  },
})

// 触发
mutation.mutate(formData)

// 状态
mutation.isPending  // 请求中
mutation.isError    // 失败
```

### 为什么要 staleTime: 0

```ts
// CalendarPage.tsx — handleCellClick
const freshBookings = await qc.fetchQuery({
  queryKey: ['bookings', dateStr],
  queryFn: () => listBookings(dateStr),
  staleTime: 0,  // ← 强制跳过缓存，每次都请求最新数据
})
```

全局默认 `staleTime: 30000`（30 秒内不重新请求），但点击空格时需要实时检测是否被其他用户占用，所以这里覆盖为 0。

---

## 六、前端核心：日历网格算法

**文件：** `client/src/components/calendar/CalendarGrid.tsx`、`CalendarCell.tsx`

### CSS Grid 布局

```
gridTemplateColumns: "72px repeat(N, minmax(148px, 1fr))"
                      ↑时间列    ↑N 个房间列
gridTemplateRows:    "52px repeat(18, 58px)"
                      ↑表头行   ↑18 个半小时格（09:00-18:00）
```

每个单元格通过 `gridRow` 和 `gridColumn` 定位：
```ts
// 第 3 行（10:00）、第 2 列（第 1 个房间）
style={{ gridRow: 3, gridColumn: 2 }}

// 跨 2 行（1 小时预订）
style={{ gridRow: '3 / span 2', gridColumn: 2 }}
```

### computeRoomCells 算法

这是日历渲染的核心算法，为一个房间生成 18 个格子（slot）的状态：

```ts
function computeRoomCells(roomId, bookings, blockedSlots, firstSlotIdx) {
  const cells = Array(18).fill(null)  // 18个格子，初始都为 null
  const covered = new Set()           // 记录被预订块"覆盖"的格子

  // 第一步：填入预订块
  for (const booking of bookings.filter(b => b.roomId === roomId)) {
    const s = slotIndexOf(booking.startTime)  // 开始时间 → 格子序号
    const span = durationInSlots(booking.startTime, booking.endTime)  // 时长 → 占几格

    cells[s] = { slotIdx: s, span, type: booking.isOwn ? 'ownBooking' : 'otherBooking', booking }
    // 标记被覆盖的格子（不需要渲染）
    for (let i = s + 1; i < s + span; i++) covered.add(i)
  }

  // 第二步：填入封锁时段（逻辑相同）

  // 第三步：剩余格子标记为 free
  for (let i = firstSlotIdx; i < 18; i++) {
    if (!cells[i] && !covered.has(i)) {
      cells[i] = { slotIdx: i, span: 1, type: 'free' }
    }
  }
  return cells
}
```

**关键：** `covered` 集合避免了在预订块"内部"的格子被渲染为空格。

### CalendarCell 的四种状态

```
cell.type === 'free'         → 空格（可点击预订）
cell.type === 'ownBooking'   → 自己的预订（有颜色、可点击编辑）
cell.type === 'otherBooking' → 他人预订（灰色、不可点击）
cell.type === 'blocked'      → 封锁时段（斜纹、不可点击）
```

每种状态渲染完全不同的 JSX，用 `if` 分支处理：

```ts
if (cell.type === 'free') {
  const isPast = startTime < new Date()
  if (isPast) return <div style={{ cursor: 'not-allowed', backgroundColor: '#e5e7eb' }} />
  return <button onClick={() => onCellClick(room, startTime)} ... />
}

if (cell.type === 'ownBooking') {
  const isPast = booking.startTime <= new Date()
  return (
    <div
      onClick={onBookingClick && !isPast ? () => onBookingClick(booking, room) : undefined}
      style={{ cursor: onBookingClick && !isPast ? 'pointer' : 'default' }}
    >
      ...
    </div>
  )
}
```

**设计亮点：** `onBookingClick` 是可选的（`?`），所以在没有编辑功能的上下文（如周视图）也能复用这个组件。

---

## 七、前端核心：面板组件模式

**文件：** `client/src/components/booking/BookingPanel.tsx`、`EditBookingPanel.tsx`

### 双形态面板（桌面 + 移动端）

```tsx
return (
  <>
    {/* 桌面：右侧滑出 */}
    <div className={`hidden md:flex fixed top-0 right-0 h-full ... ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      ...
    </div>

    {/* 移动端：底部抽屉 */}
    <div className={`md:hidden fixed inset-x-0 bottom-0 ... ${
      isOpen ? 'translate-y-0' : 'translate-y-full'
    }`}>
      ...
    </div>

    {/* 遮罩层 */}
    {isOpen && <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />}
  </>
)
```

**原理：**
- `hidden md:flex` — 默认隐藏，md 断点（768px）以上显示为 flex
- `md:hidden` — md 以上隐藏（反向）
- transform 驱动动效，性能好（GPU 合成层）
- 遮罩层 `z-40`，面板 `z-50`——面板在遮罩上方，遮罩在其他内容上方

### 键盘关闭

```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }
  if (isOpen) document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)  // 清理
}, [isOpen, onClose])
```

**注意清理函数**：`useEffect` 返回的函数在组件卸载或依赖变化时执行，必须移除事件监听器，否则会内存泄漏或重复触发。

---

## 八、前端核心：表单状态管理

**文件：** `client/src/components/booking/BookingForm.tsx`、`EditBookingForm.tsx`

### maxDuration 动态计算

```ts
function calcMaxDuration(startDate, bookingId, roomId, dayBookings, dayBlockedSlots) {
  // 找到该房间在 startDate 之后的所有预订/封锁时段
  const allItems = [
    ...dayBookings
      .filter(b => b.roomId === roomId && b.id !== bookingId)  // 排除自身
      .map(b => new Date(b.startTime).getTime()),
    ...dayBlockedSlots
      .filter(s => s.roomId === roomId)
      .map(s => new Date(s.startTime).getTime()),
  ].filter(t => t > startDate.getTime())

  const nextConflict = allItems.length > 0 ? Math.min(...allItems) : Infinity
  const minutesUntilNext = nextConflict === Infinity
    ? 240
    : Math.floor((nextConflict - startDate.getTime()) / 60_000)

  const closeTime = new Date(startDate)
  closeTime.setHours(18, 0, 0, 0)  // 今天 18:00
  const minutesToClose = Math.floor((closeTime.getTime() - startDate.getTime()) / 60_000)

  return Math.min(240, minutesUntilNext, minutesToClose)
  //            ↑最长4h  ↑下一个冲突     ↑距18:00
}
```

**三个约束取最小值：**
- 不超过 4 小时（业务规则）
- 不超过下一个预订/封锁的开始时间
- 不超过 18:00 营业结束时间

### 时长按钮动态过滤

```ts
const availableQuick = QUICK_DURATIONS.filter(d => d.value <= maxDuration)
const availableMore  = MORE_DURATIONS.filter(d => d.value <= maxDuration)
const canBook = maxDuration >= 30  // 最少 30 分钟才能预订
```

用户选择开始时间时，重新计算 `maxDuration`，可用按钮实时更新。若当前选中时长超过新 `maxDuration`，用 `useEffect` 自动调整：

```ts
useEffect(() => {
  if (durationMin > maxDuration) {
    setDurationMin(getDefaultDuration(maxDuration))
  }
}, [startTimeStr])  // 只在开始时间变化时触发
```

### key prop 强制重置 state

```tsx
// EditBookingPanel.tsx
<EditBookingForm key={booking.id} booking={booking} ... />
```

**为什么需要 key？**

`useState(booking.title)` 中的初始值只在组件**首次挂载**时生效。如果 `booking` prop 变了（用户点击不同预订），state 不会自动更新。

`key={booking.id}` 告诉 React：当 `key` 变化时，这是一个**全新的组件**，销毁旧的，创建新的。新组件的所有 `useState` 重新初始化，读取新的 `booking` 数据。

---

## 九、前端核心：状态提升模式

**场景：** `EditBookingPanel` 需要在多个地方打开（日历页、我的预订页），怎么管理它的状态？

**方案：状态提升（Lift State Up）**

把面板的 `isOpen`、`booking`、`colorIndex` state 放到页面级组件：

```ts
// CalendarPage.tsx 或 MyBookingsPage.tsx
const [editPanelOpen, setEditPanelOpen] = useState(false)
const [editBooking, setEditBooking] = useState<MyBooking | null>(null)
const [editColorIndex, setEditColorIndex] = useState(0)

function handleEdit(booking, room) {
  setEditBooking(booking)
  setEditColorIndex(room.colorIndex ?? 0)
  setEditPanelOpen(true)  // 三个 state 同时更新（React 18 自动批处理）
}
```

`EditBookingPanel` 只接收 props，不持有自己的 `booking` state：

```tsx
<EditBookingPanel
  isOpen={editPanelOpen}
  booking={editBooking}
  colorIndex={editColorIndex}
  onClose={() => setEditPanelOpen(false)}
/>
```

**React 18 批处理：** 三个 `setState` 调用在同一个事件处理函数内，React 18 自动合并为一次渲染，不会中间渲染三次。

---

## 十、前端：类型系统设计

**文件：** `client/src/types/index.ts`

### Booking vs MyBooking

注意有两种"预订"类型：

```ts
// Booking：日历网格用，包含 isOwn 标志，title 可能为 null（他人预订不返回标题）
interface Booking {
  id: string
  isOwn: boolean
  title: string | null   // 他人的预订标题为 null（隐私）
  room: { name: string } // 只有房间名，没有 capacity
}

// MyBooking：我的预订页用，一定是自己的，title 确定不为 null
interface MyBooking {
  id: string
  title: string          // 非 null
  room: { name: string; capacity: number }  // 多了 capacity（卡片显示用）
}
```

**为什么要两个类型？** 日历接口为了保护隐私，他人预订的 `title` 返回 `null`；"我的预订"接口只返回自己的，标题一定存在。两个接口的响应结构不同，对应两个 TypeScript 类型。

---

## 十一、工具函数解析

**文件：** `client/src/utils/dateUtils.ts`、`client/src/utils/roomColors.ts`

### slotIndexOf（时间 → 格子序号）

```ts
// 09:00 → 0, 09:30 → 1, 10:00 → 2, ..., 17:30 → 17
export function slotIndexOf(date: Date): number {
  return (date.getHours() - 9) * 2 + (date.getMinutes() === 30 ? 1 : 0)
}
```

### durationInSlots（持续时长 → 几格）

```ts
// 1 小时 → 2 格，30 分钟 → 1 格
export function durationInSlots(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / (30 * 60 * 1000)
}
```

### roomColors（颜色安全取用）

```ts
export const ROOM_COLORS = ['#FFBE0B', '#FF006E', '#8338EC', '#06D6A0', '#FB5607', '#3A86FF', '#00B4D8', '#C8F135']

// % length 确保 index 越界不报错（防御性编程）
export const getRoomColor = (index: number) => ROOM_COLORS[index % ROOM_COLORS.length]

// 根据背景色决定文字颜色（深色背景 → 白字，浅色背景 → 黑字）
export function getRoomTextColor(index: number): string {
  const darkBg = [1, 2, 5]  // #FF006E, #8338EC, #3A86FF 较深
  return darkBg.includes(index % ROOM_COLORS.length) ? '#fff' : '#000'
}
```

---

## 十二、测试策略

**后端：** Vitest + Supertest，TDD（先写失败测试，再写实现）

```ts
describe('createBooking', () => {
  it('rejects if time conflicts with another booking', async () => {
    // 先创建一个预订
    await prisma.booking.create({ data: { roomId, startTime: t1, endTime: t2, ... } })

    // 再尝试创建重叠的预订，期望 409
    await expect(createBooking({ roomId, startTime: t1, endTime: t2, ... }))
      .rejects.toMatchObject({ statusCode: 409 })
  })
})
```

**前端：** Vitest + @testing-library/react，测试用户可见的行为

```ts
it('shows booking panel when a cell is clicked', async () => {
  render(<CalendarPage />, { wrapper: TestProviders })
  const cell = await screen.findByRole('button', { name: /预订.*09:00/ })
  await userEvent.click(cell)
  expect(await screen.findByText('新建预订')).toBeInTheDocument()
})
```

---

## 十三、学习路线推荐

### 第一步：理解数据模型

从 `server/prisma/schema.prisma` 开始，理解 User、Room、Booking、BlockedSlot 的字段和关系。

### 第二步：读后端核心 Service

`server/src/services/booking.service.ts` 是整个项目最核心的文件。理解：
1. 为什么校验顺序是这样的
2. 事务和行级锁如何工作
3. `id: { not: bookingId }` 在编辑时的作用

### 第三步：理解 React Query 数据流

看 `client/src/hooks/useBookings.ts`（最简单的 hook），然后看 `client/src/pages/CalendarPage.tsx` 中如何使用。重点：`invalidateQueries` 在哪些地方调用、为什么。

### 第四步：理解日历网格算法

`computeRoomCells` 函数（`CalendarGrid.tsx`）是前端最复杂的算法。手动画出 18 个格子，模拟一个 1 小时预订（10:00-11:00），跑一遍算法，观察 `cells` 和 `covered` 的变化。

### 第五步：理解面板组件

从 `BookingPanel.tsx` → `BookingForm.tsx` → `EditBookingPanel.tsx` → `EditBookingForm.tsx`，看相同的模式是如何复用和扩展的。

### 第六步：追踪一次完整的预订流程

从用户点击空格开始，逐步追踪：
1. `CalendarCell` 的 `onClick`
2. `CalendarPage.handleCellClick`（强制拉取最新数据、冲突检测、计算 maxDuration）
3. `BookingPanel` 打开，`BookingForm` 表单填写
4. 提交 → `useMutation` → `api/bookings.ts createBooking` → axios POST
5. `server/routes/bookings.ts` → `controller` → `service`
6. 事务 + 行级锁 → INSERT → 返回
7. `onSuccess` → `invalidateQueries` → 日历自动刷新
