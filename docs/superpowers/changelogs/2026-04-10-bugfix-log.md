# Bug Fix & 改进记录：2026-04-10

> 本文档记录本次 session 中所有修复和改进，按提交顺序排列，附关键代码位置以便追溯。

---

## Fix 1 · CalendarHeader 布局调整

**Commit：** `6232800`
**文件：** `client/src/components/calendar/CalendarHeader.tsx`

**问题：** 日/周切换按钮在日期导航左侧，视觉上不自然。

**修复：** 使用 `justify-between` 将 header 分为左右两组：
- 左侧：`[←]` 日期 `[→]` `[今天]`
- 右侧：`[日 | 周]` 切换

---

## Fix 2 · 点击空格前强制拉取最新数据

**Commit：** `8f41644`
**文件：** `client/src/pages/CalendarPage.tsx`（`handleCellClick` 函数）

**问题：** 全局 `QueryClient` 设置了 `staleTime: 30_000`，导致 `fetchQuery` 返回缓存数据（最多 30 秒前的），无法感知其他用户新建的预订，已占用的时段仍可打开预订面板。

**修复：** 在 `handleCellClick` 的两个 `fetchQuery` 调用中显式传入 `staleTime: 0`，强制每次点击都请求最新数据：

```ts
qc.fetchQuery({ ..., staleTime: 0 })  // bookings
qc.fetchQuery({ ..., staleTime: 0 })  // blocked-slots
```

---

## Feat 3 · 预订面板时长按钮根据后续冲突动态限制

**Commit：** `a3bea0a`
**文件：**
- `client/src/pages/CalendarPage.tsx`（`handleCellClick`，新增 `panelMaxDuration` state）
- `client/src/components/booking/BookingPanel.tsx`（透传 `maxDuration` prop）
- `client/src/components/booking/BookingForm.tsx`（过滤时长按钮，重置 form state）

**问题：** 用户点击 10:30 的空格，但 11:00 已有预订；面板中仍可选 1小时/2小时等时长，点确认才被服务端拒绝，体验差。

**修复：** 打开面板前计算 `maxDuration`：

```ts
const maxDuration = Math.min(
  240,
  // 下一个冲突（同房间其他预订/封锁时段）距当前时间的分钟数
  minutesUntilNextConflict,
  // 18:00 下班时间距当前时间的分钟数
  minutesToClose
)
```

`BookingForm` 只渲染 `value <= maxDuration` 的按钮，并在受限时显示「最长 Xh」提示。

---

## Fix 4 · 移除自己预订块上的误导性 pointer 光标

**Commit：** `2e64595`
**文件：** `client/src/components/calendar/CalendarCell.tsx`（`ownBooking` 分支）

**问题：** 自己的预订块显示 `cursor: pointer`，暗示可点击，但实际没有 `onClick`，点击无反应，造成用户困惑。

**修复：** 改为 `cursor: default`。

---

## Feat 5 + Fix 6 · 跨房间重叠预订的前置拦截

**Commits：** `64f0959`（初始软警告）→ `c1fe27d`（改为硬阻止）
**文件：** `client/src/pages/CalendarPage.tsx`（`handleCellClick`）

**问题：** 用户已预订 Room 1 的 9:00–10:00，再点击 Room 2 的 9:00，面板打开 → 用户填完表单提交 → 服务端拒绝（`booking.service.ts` 第 72 行有 `userConflict` 检测）。用户白走了一遍流程。

**修复过程：**
1. 初版做成软警告（黄色 toast + 面板仍打开）→ 发现逻辑矛盾：服务端必然拒绝，软警告没有意义
2. 改为与房间冲突一致的硬阻止（不打开面板，显示 toast 2 秒后消失）

最终代码：
```ts
const selfConflict = freshBookings
  .filter(b => b.isOwn && b.roomId !== room.id)
  .some(b => new Date(b.startTime) < slotEnd && new Date(b.endTime) > startTime)

if (selfConflict) {
  setConflictMsg('你在该时段已有其他预订')
  conflictTimer.current = setTimeout(() => setConflictMsg(''), 2000)
  return
}
```

---

## Fix 7 · Toast 显示时长从 3s 缩短至 2s

**Commit：** `6583b66`
**文件：** `client/src/pages/CalendarPage.tsx`

**修复：** 两处 `setTimeout(..., 3000)` 改为 `setTimeout(..., 2000)`。

---

## 当前 Toast 行为汇总

| 场景 | Toast 文字 | 样式 | 时长 |
|---|---|---|---|
| 该房间该时段已有他人预订 | 该时段已被预订，请选择其他时间 | 黑底 + 粉红阴影 `#FF006E` | 2s |
| 自己在该时段已有其他房间预订 | 你在该时段已有其他预订 | 黑底 + 粉红阴影 `#FF006E` | 2s |
