# 项目复盘：企业会议室预订系统

**整理日期：** 2026-04-11
**项目周期：** 2026-04-03 起，历经设计 → 后端 → 前端 → 迭代修复
**目的：** 帮助开发者系统回顾每个关键决策背后的思考过程

---

## 一、项目背景与目标

**场景：** 企业内部（非商用）会议室预订，员工自助预订，管理员维护房间和用户。

**核心约束（设计阶段确定）：**
- 预订无需审批，无冲突即立即确认
- 最多提前 7 天预订，时长 30min～4h，整点/半点
- 开始前 1 小时内不可取消
- 账号邀请制（管理员发邮件，员工点链接设密码）
- 隐私：只能看到他人预订的时段（灰色），看不到标题

这些约束直接决定了后续的数据模型、API 设计和 UI 交互。

---

## 二、技术选型决策

### 为什么选 React + Express + PostgreSQL？

这是一个经典的三层架构，没有过度工程化。理由如下：

| 选择 | 理由 |
|---|---|
| React 18 | 组件化 UI，React Query 处理异步数据 |
| Vite | 比 CRA 快得多，支持 TypeScript 开箱即用 |
| Express | 轻量，控制粒度高，不需要 NestJS 那种大框架 |
| Prisma | 类型安全的 ORM，schema 即文档，迁移方便 |
| PostgreSQL | 支持行级锁（`SELECT FOR UPDATE`），防并发冲突 |
| JWT + httpOnly Cookie | 比 localStorage 安全（防 XSS），比 session 轻量 |
| Tailwind CSS v3 | 设计系统统一，不需要维护 CSS 文件 |
| React Query v5 | 服务端状态管理，内置缓存失效、后台刷新 |
| Zod | 后端请求体验证，同时也是类型推导的来源 |

### 为什么不用 Next.js？

这是一个**内部工具**，不需要 SEO，不需要 SSR。Next.js 会引入不必要的复杂度（文件路由、服务端组件等）。分离的 client/server 让后端测试更独立清晰。

### 为什么 Monorepo（单仓库）？

前后端同时开发，共用类型定义更方便（虽然本项目未做类型共享，但结构清晰）。一个 `git push` 包含完整的功能，便于代码审查。

---

## 三、开发阶段复盘

### 阶段一：后端 API（Plan 1）

**原则：** 先写测试，再写实现（TDD）。

**关键决策：冲突检测用事务+行级锁，不用唯一索引**

最直觉的防冲突方案是给 `(roomId, startTime)` 加唯一索引。但这有问题：
- 已取消（CANCELLED）的预订仍占用索引位置，导致同时段无法重新预订
- 时间段重叠检测不能简单用索引（`startTime < endTime AND endTime > startTime`）

最终方案：
```sql
BEGIN TRANSACTION
SELECT ... FROM Booking WHERE roomId = ? AND status = 'CONFIRMED'
  AND startTime < $endTime AND endTime > $startTime
FOR UPDATE   -- 行级锁，防止并发写入
-- 无冲突则
INSERT INTO Booking ...
COMMIT
```

`FOR UPDATE` 的作用：两个用户同时点击同一时段时，第一个拿到锁执行检测+写入，第二个等待第一个提交后再检测，此时发现已有预订，返回 409。

**关键决策：Zod 做请求验证**

所有入参在 controller 层先过 Zod schema，类型错误直接返回 422，service 层假设数据已合法。这让 service 层代码更干净。

```ts
// controller
const body = createSchema.parse(req.body)  // 抛出则 catch → 422

// service 层不再做类型判断，直接用
```

### 阶段二：前端（Plan 2，15 个 Task）

**原则：** 每个 Task 独立提交，Task 之间有依赖的严格顺序执行。

**关键决策：React Query 作为唯一数据层**

没有使用 Redux 或 Zustand。服务端状态（房间列表、预订列表）全部用 React Query 管理：

```ts
// 声明式：组件只关心"我需要什么数据"
const { data: bookings = [] } = useBookings(dateStr)

// 操作后让相关缓存失效，React Query 自动重新请求
qc.invalidateQueries({ queryKey: ['bookings', dateStr] })
```

这个模式统一了所有数据获取逻辑，避免了手动管理 loading/error state 的重复代码。

**关键决策：日历网格用 CSS Grid + span**

日历主体是一个时间（行）× 房间（列）的网格。难点是预订块可能跨越多行（如 1 小时 = 2 个 30 分钟格）。

解决方案：CSS Grid 的 `grid-row: X / span N`——让预订块从第 X 行开始，跨 N 行。

```css
/* 10:00 的格子在第 3 行（09:00=1，09:30=2，10:00=3）*/
/* 1小时预订 = 跨 2 个格子 */
grid-row: 3 / span 2;
grid-column: 2;  /* 第 2 个房间列 */
```

这比绝对定位简单得多，浏览器自动处理高度计算。

**关键决策：移动端单独实现（MobileCalendar）**

日历网格在手机屏幕上横向展示多个房间列太窄。方案：移动端改为「顶部房间 Tab」+「纵向时间轴」，一次看一个房间。这不是简单的响应式调整，是完全不同的交互模型，所以独立成 `MobileCalendar` 组件。

### 阶段三：迭代修复（2026-04-09 ~ 04-10）

前端开发完成后，进行了系统性的 UI 打磨和功能修复，共 13 + 7 = 20 个修复/改进。

---

## 四、关键设计决策详解

### 决策 1：隐私模型

```ts
// 后端：查询预订时，只有自己的预订才返回 title
{
  id: booking.id,
  title: booking.userId === currentUserId ? booking.title : null,
  isOwn: booking.userId === currentUserId,
  // ...
}
```

前端根据 `isOwn` 决定渲染方式：
- `isOwn = true` → 房间专属颜色 + 标题文字
- `isOwn = false` → 灰色色块，无文字

这保证了即使前端代码被查看，也无法获取他人会议标题。

### 决策 2：颜色系统

8 个预设颜色存在 `roomColors.ts` 中，数据库只存 `colorIndex`（0-7 的整数）。这样：
- 改颜色方案只需改前端一个文件
- 数据库不存颜色字符串，避免无效值

```ts
// client/src/utils/roomColors.ts
export const ROOM_COLORS = ['#FFBE0B', '#FF006E', '#8338EC', '#06D6A0', '#FB5607', '#3A86FF', '#00B4D8', '#C8F135']
export const getRoomColor = (index: number) => ROOM_COLORS[index % ROOM_COLORS.length]
```

`% ROOM_COLORS.length` 确保 index 越界时安全回退。

### 决策 3：前端冲突检测（双重防护）

**第一道：前端检测（用户体验）**

点击时段时，前端先用最新数据检测冲突：
```ts
// 强制绕过缓存，拿最新数据
const [freshBookings, freshBlocked] = await Promise.all([
  qc.fetchQuery({ staleTime: 0, ... }),
  qc.fetchQuery({ staleTime: 0, ... }),
])
if (occupied) { showToast(); return }  // 不打开面板
```

为什么用 `staleTime: 0`？React Query 默认 `staleTime: 30000`（30 秒内不重新请求）。但这 30 秒内其他用户可能已经预订了同一时段。`staleTime: 0` 强制每次都请求最新数据。

**第二道：后端事务（数据安全）**

即使前端检测通过，后端仍会在事务中再次检测（加行级锁）。这保证了即使两个用户同时绕过前端检测，数据库层面也只有一个会成功。

**为什么两道都要？**
- 只有前端：无法防止 API 并发攻击或多标签页操作
- 只有后端：用户体验差（填完表单提交才知道冲突）
- 两道都有：体验好 + 数据安全

### 决策 4：编辑预订的范围界定

**问题：** 预订编辑应该支持多少功能？

**选项分析：**
- A. 只改标题 → 太局限，时间填错也要取消重订
- B. 改标题 + 同日时间段 → 覆盖主要需求，复杂度可控
- C. 改标题 + 任意日期时间 → 复杂，需要跨日冲突检测

**选择 B 的理由：**
- "改日期"等于取消重订，用户已理解这个流程
- 同日冲突检测和新建预订逻辑相同（复用）
- `EditBookingForm` 可以复用 `BookingForm` 的时长按钮和 maxDuration 计算

**后端实现的关键：排除自身的冲突检测**

```ts
// 检测同房间冲突时，必须排除自己（否则"时间不变"也会报冲突）
const roomConflict = await tx.booking.findFirst({
  where: {
    id: { not: bookingId },  // ← 关键
    roomId: booking.roomId,
    status: 'CONFIRMED',
    startTime: { lt: newEnd },
    endTime: { gt: newStart },
  },
})
```

---

## 五、遇到的问题与解决过程

### 问题类别一：React Query 缓存未失效

**现象：** 取消预订后日历没有更新；切换用户后仍显示前一个用户的预订。

**根本原因：** `invalidateQueries` 漏了某些 key；或者 `queryClient.clear()` 未在 login/logout 时调用。

**经验：** 每个修改数据的操作（取消、创建、封锁）必须检查：哪些 queryKey 的数据会受影响？逐一 invalidate。

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['my-bookings'] })
  qc.invalidateQueries({ queryKey: ['bookings'] })   // 日历也要更新
}
```

### 问题类别二：useState 初始化只执行一次

**现象（本次修复）：** 点击 Room1 的预订打开编辑面板，关闭后点击 Room2 的预订，面板仍显示 Room1 的标题和时间。

**根本原因：**
```ts
// EditBookingForm 中
const [title, setTitle] = useState(booking.title)  // 只在首次挂载时执行
```

`booking` prop 变了，`useState` 的初始值不会重新计算。

**解决方案：** 给组件加 `key={booking.id}`。当 key 变化时，React 销毁旧组件实例，创建新的，所有 `useState` 重新初始化。

```tsx
<EditBookingForm key={booking.id} booking={booking} ... />
```

**规律：** 当一个组件需要在 prop 变化时完全重置 state，`key` 比 `useEffect` 更简洁可靠。

### 问题类别三：软警告 vs 硬阻止

**现象：** 用户已预订 Room1 9:00-10:00，点击 Room2 9:00，初版给了黄色警告但仍打开面板。用户继续提交时服务端必然拒绝。

**分析过程：**
1. 看 `booking.service.ts` 第 72 行：`userConflict` 检测——服务端**必然**拒绝跨房间同时段预订
2. 既然服务端必然拒绝，软警告+允许继续 = 误导用户

**结论：** 前端检测逻辑应与后端行为一致。服务端拒绝什么，前端就硬阻止什么。

### 问题类别四：Prisma 类型转换

**现象：** 用 `id != ${bookingId}::uuid` 写 raw SQL 时，Prisma 报类型错误。

**原因：** Prisma 的模板参数（`${bookingId}`）默认作为 text 传入，不支持直接转为 uuid 类型。

**解决：** 反过来，把列转为 text 再比较：
```sql
id::text != ${bookingId}
```

### 问题类别五：Prisma Client 版本不同步

**现象：** 新增 `colorIndex` 字段到 schema 后，API 返回的数据中没有这个字段。

**原因：** Monorepo 中根目录的 `node_modules/@prisma/client` 是旧版本，没有包含新字段。`server/` 目录下的 client 是新的，但根目录的是老的。

**解决：** 根 `package.json` 加 postinstall 脚本：
```json
"postinstall": "cd server && npx prisma generate"
```

**经验：** Monorepo 中使用 Prisma 时，确保所有位置的 client 都是从同一个 schema 生成的。

---

## 六、UI 设计思维：俏皮野兽派（Neo-Brutalist Playful）

### 核心原则

1. **无圆角**（`border-radius: 0`）— 所有元素棱角分明
2. **硬阴影**（`box-shadow: 6px 6px 0 0 #000`）— 无模糊，纯位移
3. **粗边框**（`border: 4px solid #000`）— 轮廓明确
4. **按钮 hover**：阴影消失 + 位移 `translate(2px, 2px)`，模拟"被按下"的物理感
5. **字体**：标题 Space Grotesk（黑体+大写），正文 Space Mono（等宽）

### 颜色策略

- 底色：纯白 `#fff`
- 主色：黄色 `#FFBE0B`（页眉、日期高亮）
- 五种房间颜色：`#FFBE0B / #FF006E / #8338EC / #06D6A0 / #FB5607`（明亮纯色，无渐变）
- 错误/取消：`#FF006E`（粉红）
- Toast：黑底 + `#FF006E` 阴影（与页面元素明显区分）

### 动效原则

所有动效 ≤ 300ms，不能影响操作流畅感：
```css
/* 面板滑入：250ms，缓出曲线 */
transition: transform 250ms cubic-bezier(.25,.46,.45,.94);

/* 移动端抽屉：280ms（稍慢，更自然） */
transition: transform 280ms cubic-bezier(.25,.46,.45,.94);
```

---

## 七、项目扩展路径的预留

设计时就考虑了未来扩展，但没有过度实现：

| 扩展方向 | 当前预留 | 需要新增 |
|---|---|---|
| 商业化（收费） | 无 | `pricePerHour` 字段 + Payment/Order 表 |
| 多租户 SaaS | 无 | `Organization` 表 + 所有资源挂租户 |

**原则：** 不为假设的未来需求写代码。当前 schema 干净清晰，扩展时只需增加，不需要大改。

---

## 八、学习要点总结

| 主题 | 关键收获 |
|---|---|
| 并发安全 | 前端双重检测（UX）+ 后端行级锁（安全），缺一不可 |
| React Query | `invalidateQueries` 要覆盖所有受影响的 key；login/logout 要 `clear()` |
| useState 陷阱 | prop 变化不会重新初始化 state；用 `key` prop 强制重挂载 |
| 软硬阻止选择 | 逻辑与后端行为一致：服务端必然拒绝的，前端就硬阻止 |
| Zod + TypeScript | schema 即类型，controller 验证 + service 复用类型 |
| CSS Grid span | 跨行块用 `grid-row: X / span N`，比绝对定位更简洁 |
| UI 一致性 | 同类操作（取消 vs 编辑）用同样的权限规则（开始前 1 小时） |
