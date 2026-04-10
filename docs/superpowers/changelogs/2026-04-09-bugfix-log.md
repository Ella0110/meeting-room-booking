# Bug Fix & 改进记录：2026-04-09

> 前端开发完成后的第一轮 UI 修复与功能完善，按提交顺序排列。

---

## Fix 1 · UI 整体打磨（大批量）

**Commit：** `cfcfc79`
**日期：** 2026-04-09
**涉及文件：**
- `client/src/components/NavBar.tsx`
- `client/src/components/booking/BookingForm.tsx`
- `client/src/components/booking/BookingPanel.tsx`
- `client/src/components/calendar/CalendarCell.tsx`
- `client/src/components/calendar/CalendarGrid.tsx`
- `client/src/components/calendar/CalendarHeader.tsx`
- `client/src/pages/CalendarPage.tsx`
- `client/src/pages/MyBookingsPage.tsx`
- `client/src/pages/admin/AdminLayout.tsx`
- `client/src/utils/roomColors.ts`

**修复内容：**
- **CalendarCell**：过去时段改为 `#d1d5db` 明显灰色（原来近白色难以辨认）
- **CalendarHeader**：背景色改为 `#FFBE0B` 黄色，移除周视图切换（后续重新加入）
- **BookingForm**：确认按钮的阴影改用房间颜色（`colorIndex`）
- **BookingPanel / CalendarGrid**：移除房间 emoji
- **NavBar**：加入明确的「退出登录」按钮，用户名单独显示
- **AdminLayout**：侧边栏底部 + 移动端导航加入退出登录按钮
- **MyBookingsPage**：加入黄色页面标题，与日历页风格一致

---

## Fix 2 · 过去时段用斜纹样式，三种状态视觉区分

**Commit：** `3ce44a0`
**文件：** `client/src/components/calendar/CalendarCell.tsx`

**问题：** 过去时段、他人预订、封锁时段三种灰色状态视觉相近，难以分辨。

**修复：** 过去时段改用极浅斜纹（`#f3f4f6` / `#ebebeb`），与他人预订的实心灰（`#d1d5db` + 黑边）和封锁时段的深色斜纹形成明显区别。

> 注：此方案后在 Fix 4 中再次调整（改回扁平双灰色）

---

## Fix 3 · 房间颜色与面板主题

**Commit：** `61dd77b`
**文件：**
- `client/src/utils/roomColors.ts`
- `client/src/components/booking/BookingPanel.tsx`
- `client/src/components/calendar/CalendarCell.tsx`
- `client/src/components/calendar/CalendarGrid.tsx`
- `client/src/pages/CalendarPage.tsx`

**修复内容：**
- **roomColors**：添加第 6 个颜色 `#3A86FF`（蓝色），确保 6 个房间各有独立颜色
- **BookingPanel**：顶部 bar 用房间主色，「✦ 新建预订」标签反色显示，时间区域用房间色背景
- **CalendarCell**：过去时段改为扁平双灰（整点 `#e5e7eb`，半点 `#efefef`），去掉斜纹，与他人预订实心灰保持清晰区分
- **CalendarGrid**：外层 div 加 `h-full`，确保滚动容器有确定高度
- **CalendarPage**：房间标题行加 `flex-1 min-h-0`，使其在滚动时真正吸顶

---

## Fix 4 · React Query 缓存失效：取消/封锁操作后日历不刷新

**Commit：** `2858c0d`
**文件：**
- `client/src/components/booking/BookingCard.tsx`
- `client/src/components/calendar/CalendarGrid.tsx`
- `client/src/pages/admin/BlockedSlotsPage.tsx`
- `client/src/pages/admin/BookingsPage.tsx`

**问题：** 取消预订或添加封锁时段后，日历不会自动更新，需要手动刷新页面。

**修复：** 在相关操作的 `onSuccess` 回调中补全 `invalidateQueries`：
- `BookingCard` 取消：额外 invalidate `['bookings']`（原来只 invalidate `['my-bookings']`）
- 管理员取消预订：invalidate `['bookings']` + `['my-bookings']`
- 管理员添加/删除封锁时段：invalidate `['blocked-slots']`

---

## Fix 5 · 预订面板顶部 Bar 样式 + 时长按钮颜色

**Commit：** `6da7e8b`
**文件：**
- `client/src/components/booking/BookingPanel.tsx`
- `client/src/components/booking/BookingForm.tsx`
- `client/src/components/NavBar.tsx`

**修复内容：**
- **BookingPanel**：顶部 bar 背景改为白色，「✦ 新建预订」标签背景改为房间主色
- **BookingForm**：选中的时长按钮使用房间主色（原来硬编码为紫色）

---

## Fix 6 · 封锁时段表单：日期和时间输入限制

**Commit：** `1e94637`
**文件：** `client/src/pages/admin/BlockedSlotsPage.tsx`

**问题：** 管理员可以选择过去的日期来创建封锁时段，时间输入为自由文本，可输入非整点/半点时间。

**修复：**
- 日期 input 加 `min={todayStr}`，禁止选择过去日期
- 开始时间：改为 select，列出 09:00–17:30 所有半小时格
- 结束时间：动态过滤，只显示晚于开始时间的选项
- 开始时间前移时自动更新结束时间

---

## Fix 7 · 房间颜色从 DB 读取 + 封锁时段自动取消冲突预订

**Commit：** `92ed599`
**文件：**
- `client/src/utils/roomColors.ts`（扩展至 8 色）
- `client/src/types/index.ts`（Room 类型加 `colorIndex`）
- `client/src/components/calendar/CalendarGrid.tsx`
- `client/src/pages/CalendarPage.tsx`
- `client/src/pages/admin/BlockedSlotsPage.tsx`
- `client/src/pages/admin/RoomsPage.tsx`
- `server/src/controllers/admin.controller.ts`

**修复内容：**
- **颜色从 DB 读取**：`Room.colorIndex` 存入 DB，创建房间时自动分配最小未使用 index；前端 CalendarGrid/CalendarPage/图例均从 `room.colorIndex` 取色，不再用数组位置
- **ROOM_COLORS 扩展**：添加 `#00B4D8`（青色）和 `#C8F135`（黄绿），共 8 色
- **封锁时段自动取消冲突**：`createBlockedSlot` 自动 cancel 时间重叠的 CONFIRMED 预订，并返回 `cancelledCount`
- **BlockedSlotsPage** 创建成功后显示「已自动取消 N 个冲突预订」
- **RoomsPage**：save/delete/enable 操作后 invalidate `['rooms']`，日历自动刷新

---

## Fix 8 · colorIndex 回退、日/周切换、导航动画、日期限制、测试修复

**Commit：** `44e85e2`
**文件：** 15 个文件（见 commit stats）

**修复内容（批量）：**
- **CalendarGrid / CalendarPage / MobileCalendar**：`room.colorIndex ?? rIdx` 回退，防止 schema 迁移后服务重启前颜色丢失
- **CalendarHeader**：恢复日/周切换按钮；`←` 在今天禁用，`→` 在今天+7天禁用（对应可预订窗口）
- **NavBar**：NavLink 加 `active:scale-90` 点击动画；`/` 路由加 `end` prop 防止匹配子路由
- **前端测试**：CalendarCell 测试改用未来日期（修复空格子因在过去而渲染为灰色）；roomColors 测试更新为 8 色；CalendarPage 测试改用 regex 匹配
- **服务端**：加入 `dotenv/config` import；提交 colorIndex 迁移 SQL

---

## Fix 9 · Prisma Client 根目录重新生成

**Commit：** `e45e6cb`
**文件：** `package.json`（根目录）

**问题：** `colorIndex` 字段在 API 响应中缺失。原因：根目录 npm workspace 的 Prisma client 是旧版本，未包含新字段。

**修复：** 根 `package.json` 加入 `postinstall` 脚本，每次 `npm install` 后自动重新生成 Prisma client，保持同步。

---

## Feat 10 · 管理员 UI 显示邀请链接（SMTP 不可用时）

**Commit：** `0c854ad`
**文件：**
- `client/src/pages/admin/UsersPage.tsx`
- `client/src/api/admin.ts`
- `server/src/controllers/admin.controller.ts`

**问题：** SMTP（MailHog）不可用时，邀请链接只打印到服务端控制台，管理员看不到。

**修复：** 邀请接口返回 `inviteUrl` 字段；UsersPage 在发送邀请后显示链接 + 一键复制按钮。

---

## Fix 11 · 登录/登出时清空 React Query 缓存

**Commit：** `f796669`
**文件：** `client/src/contexts/AuthContext.tsx`

**问题：** 切换用户登录后，日历仍显示前一个用户的预订（带错误颜色），需手动刷新才能恢复正常。

**修复：** 登录和登出时调用 `queryClient.clear()`，强制所有缓存失效：

```ts
// AuthContext.tsx
queryClient.clear()  // login & logout 各调用一次
```

---

## Feat 12 · 周视图（7 天网格 + 预订块）

**Commit：** `11f1945`
**文件：**
- `client/src/components/calendar/WeekCalendarGrid.tsx`（新增）
- `client/src/components/calendar/CalendarHeader.tsx`
- `client/src/pages/CalendarPage.tsx`
- 多个测试文件

**内容：**
- 新建 `WeekCalendarGrid`：周一–周日列 × 09:00–18:00 行，用 `useQueries` 并行拉取 7 天数据，绝对定位渲染预订块，支持同时段多房间错排
- `CalendarHeader`：周视图显示「周范围」标题，`←` `→` 跳 7 天，「本周」badge
- `CalendarPage`：持有 `viewMode` state，在 `CalendarGrid`（日）和 `WeekCalendarGrid`（周）间切换；点击周视图中任意日期列表头，切换到该日的日视图
- 测试：`AuthContext` 测试补包 `QueryClientProvider`

---

## Feat 13 · 点击时段前检查可用性

**Commit：** `d891b65`
**文件：** `client/src/pages/CalendarPage.tsx`

**问题：** 页面加载后其他用户新建预订，本地缓存未更新，点击已占用时段仍会打开预订面板。

**修复：** 点击时段时强制拉取最新数据（`staleTime: 0`），若时段已被占用则显示 toast 并阻止面板打开：

```ts
// handleCellClick
const [freshBookings, freshBlocked] = await Promise.all([
  qc.fetchQuery({ ..., staleTime: 0 }),
  qc.fetchQuery({ ..., staleTime: 0 }),
])
if (occupied) {
  setConflictMsg('该时段已被预订，请选择其他时间')
  return
}
```
