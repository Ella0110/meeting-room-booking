# 设计文档：编辑预订 + 房间颜色配置

**日期：** 2026-04-10
**状态：** 已批准，待实现

---

## 一、房间颜色配置

### 背景

当前 Room 模型已有 `colorIndex: Int` 字段，映射到前端 `roomColors.ts` 中 8 个预设颜色（`#FFBE0B` / `#FF006E` / `#8338EC` / `#06D6A0` / `#FB5607` / `#3A86FF` / `#00B4D8` / `#C8F135`）。但管理员编辑房间表单中没有颜色选项，颜色在创建时默认为 0（黄色）。

### 目标

管理员可以在创建/编辑房间时选择颜色，颜色持久化到数据库。

### 技术方案

**后端（小改动）**
- `PATCH /api/admin/rooms/:id` 已有，Zod schema 加 `colorIndex: z.number().int().min(0).max(7).optional()`
- `POST /api/admin/rooms` 同样加 `colorIndex` 支持
- service 层透传到 Prisma update/create，无需 DB migration

**前端（Admin RoomsPage）**
- 编辑/新建表单加一行「颜色」字段
- 展示 8 个色块（14×14px，黑边），点选后显示黑框+勾选标记
- `colorIndex` 作为 form state，随 save 一起提交
- `openEdit` 时预填 `room.colorIndex ?? 0`

### 不变的部分

- 前端 `getRoomColor(index)` / `getRoomTextColor(index)` 逻辑不变
- 日历、图例、预订面板的颜色渲染逻辑不变

---

## 二、编辑已有预订

### 背景

用户预订后无法修改，只能取消重订。需要支持修改标题和同日时间段。

### 目标

用户可以修改自己的预订：标题、开始时间（当天范围内）、时长。日期不可改（取消重订代替）。

### 触发入口

| 入口 | 操作 |
|---|---|
| 日历 → 点击自己的预订块 | 打开 EditBookingPanel 侧滑/底部抽屉 |
| 我的预订页 → 每条记录的「编辑」按钮 | 打开同一个 EditBookingPanel |

### 技术方案

#### 后端

新增 `PATCH /api/bookings/:id`，普通用户路由（需登录，非 admin 专属）。

校验顺序：
1. 找到 booking，`userId === req.user.id`（本人才能改）
2. `status !== 'CANCELLED'`（已取消不能改）
3. `startTime > now`（过去的预订不能改）
4. 新时间格式校验：整点/半点、30–240 分钟、不超 18:00
5. 冲突检测（同 createBooking，但排除自身 id）：
   - 同房间其他 booking 时间重叠
   - blocked slots 时间重叠
   - 用户自身其他预订时间重叠
6. 通过后 UPDATE `title` / `startTime` / `endTime`，返回完整 booking 对象

#### 前端：EditBookingPanel 组件

结构复用 `BookingPanel`（侧滑 + 底部抽屉双形态），内部替换为 `EditBookingForm`。

**EditBookingForm props：**
```ts
interface EditBookingFormProps {
  booking: Booking        // 含 room 信息
  onSuccess: () => void
  onCancel: () => void
}
```

**表单字段：**
- 标题 input，预填 `booking.title`
- 开始时间 select，列出当天 09:00–17:30 所有半小时格（30 个选项）
  - 选中项变化时，重新 fetch 当天数据动态计算 `maxDuration`（排除自身 booking）
- 时长按钮：复用现有 `QUICK_DURATIONS` / `MORE_DURATIONS` 逻辑，按 `maxDuration` 过滤
- 结束时间预览（只读，`startTime + duration`）

**提交行为：**
- `PATCH /api/bookings/:id`
- 乐观更新 `['bookings', dateStr]` 缓存（替换对应 booking）
- 成功后 `invalidate(['bookings', dateStr])` + `invalidate(['my-bookings'])`

#### 前端：日历入口

- `CalendarCell` 的 `ownBooking` div 改为可点击，新增 `onBookingClick?: (booking: Booking) => void` prop
- `CalendarGrid` 透传此回调
- `CalendarPage` 接收后设置 `editBooking` state，打开 `EditBookingPanel`

#### 前端：我的预订页入口

- 每条 `isOwn` 预订卡片加「编辑」按钮（与「取消」按钮并列）
- 点击设置 `editBooking` state，打开 `EditBookingPanel`（需将面板 state 提升到页面级）

---

## 三、实现顺序建议

1. 后端：`colorIndex` 支持（updateRoom / createRoom）
2. 后端：`PATCH /api/bookings/:id`（含测试）
3. 前端：Admin RoomsPage 加颜色选择器
4. 前端：`EditBookingForm` + `EditBookingPanel` 组件
5. 前端：日历入口（CalendarCell + CalendarGrid + CalendarPage）
6. 前端：我的预订页入口
