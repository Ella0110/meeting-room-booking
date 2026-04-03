# 企业会议室预订系统 — 设计文档

**日期：** 2026-04-03
**场景：** 企业内部会议室预订（非商用、非多租户）

---

## 1. 架构

**Monorepo · React + Express · PostgreSQL**

```
booking-app/
├── client/          # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/       # 路由页面
│       ├── components/  # 可复用 UI 组件
│       ├── hooks/       # React Query hooks
│       └── api/         # Axios 实例和请求函数
├── server/          # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/      # Express 路由
│       ├── controllers/ # 业务逻辑
│       ├── middleware/  # 认证、错误处理
│       └── prisma/      # Schema 和迁移
└── package.json     # root
```

**前端依赖：** React 18、TypeScript、Vite、React Query、Tailwind CSS、Axios
**后端依赖：** Express、TypeScript、Prisma ORM、JWT（httpOnly Cookie）、bcrypt、Zod
**数据库：** PostgreSQL，行级锁（`SELECT ... FOR UPDATE`）防并发冲突

---

## 2. 数据模型

### User
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| name | String | |
| email | String UNIQUE | |
| passwordHash | String | |
| role | ENUM | USER / ADMIN |
| isActive | Boolean | 默认 true，停用后无法登录 |
| createdAt | DateTime | |

### Room
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| name | String | |
| capacity | Int | |
| location | String? | |
| description | String? | |
| zone | ENUM | OFFICE / SHARED |
| isActive | Boolean | |

> **zone 规则：** OFFICE 仅工作日可预订；SHARED 任意日期但限 09:00–18:00

### Booking（核心表）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| userId | FK → User | |
| roomId | FK → Room | |
| title | String | 会议主题 |
| startTime | DateTime | |
| endTime | DateTime | |
| status | ENUM | CONFIRMED / CANCELLED |
| createdAt | DateTime | |

> 约束：`startTime < endTime`
> 冲突检测通过事务级 `SELECT ... FOR UPDATE` 保证，不依赖唯一索引（避免已取消记录阻止同时段重新预订）

### BlockedSlot
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| roomId | FK → Room | |
| reason | String | |
| startTime | DateTime | |
| endTime | DateTime | |
| createdBy | FK → User (Admin) | |

### Invitation
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| email | String | |
| token | String UNIQUE | |
| invitedBy | FK → User (Admin) | |
| expiresAt | DateTime | |
| usedAt | DateTime? | 已使用则不为 null |

### 关系
```
User 1──N Booking N──1 Room 1──N BlockedSlot
User 1──N Invitation
```

### 冲突检测（同一房间时间段重叠）
```sql
WHERE roomId = $roomId
  AND status = 'CONFIRMED'
  AND startTime < $endTime
  AND endTime > $startTime
-- 同时检查 BlockedSlot 是否存在重叠
```

---

## 3. 业务规则

| 规则 | 说明 |
|---|---|
| 预订确认 | 无冲突立即确认（status = CONFIRMED） |
| 提前上限 | 最多预订未来 7 天内的时段 |
| 时长限制 | 最短 30 分钟，最长 4 小时 |
| 时间粒度 | 整点或半点（:00 / :30） |
| 取消限制 | 距开始时间 ≤ 1 小时不可取消 |
| 用户并发 | 同一用户同一时段只能有一个 CONFIRMED 预订 |
| OFFICE 房间 | 仅周一至周五可预订 |
| SHARED 房间 | 任意日期，但 startTime 和 endTime 须在 09:00–18:00 内 |
| 周期性预订 | 不支持 |

---

## 4. 认证与权限

| 项目 | 说明 |
|---|---|
| 账号创建 | 邀请制：管理员发邮件邀请，员工点链接设置密码 |
| 密码重置 | 自助邮件重置（发送含 token 的链接） |
| 认证方式 | JWT 存储于 httpOnly Cookie |
| 会话有效期 | 建议 8 小时（工作日一天） |

**普通用户（role = USER）**
- 查看所有房间的预订日历
- 创建/取消自己的预订

**管理员（role = ADMIN）**
- 所有普通用户权限
- 管理用户（发送邀请、停用/恢复账号）
- 管理房间（增删改、设置 zone）
- 添加/删除封锁时段
- 查看所有预订、取消任意预订

---

## 5. UI 页面结构

### 用户端
| 页面 | 路径 | 说明 |
|---|---|---|
| 登录 | `/login` | 邮箱 + 密码 |
| 接受邀请 | `/invite/:token` | 设置初始密码 |
| 重置密码 | `/reset-password` | 邮件链接跳转 |
| 主页（日历） | `/` | 时间 × 房间网格，默认今天日视图；右上可切换周视图；点击空格 → 右侧面板预订 |
| 我的预订 | `/my-bookings` | 分「即将到来」和「历史记录」两个 Tab |

### 管理后台
| 页面 | 路径 | 说明 |
|---|---|---|
| 用户管理 | `/admin/users` | 邀请用户、停用/恢复账号 |
| 房间管理 | `/admin/rooms` | 增删改房间、设置 zone |
| 封锁时段 | `/admin/blocked-slots` | 按房间添加封锁记录 |
| 全部预订 | `/admin/bookings` | 查看所有预订、取消任意一条 |

**主页交互细节**
- 纵轴：时间段（09:00–18:00，30 分钟粒度）
- 横轴：所有 isActive = true 的房间
- 空闲格子：绿色，可点击 → 滑出右侧预订面板（房间和时间已预填）
- 已占用格子：红色，显示会议主题（hover 可见）
- 封锁时段：灰色，不可点击
- 左右箭头切换日期；右上角日/周视图切换

---

## 6. API 接口

### 认证
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT Cookie |
| POST | `/api/auth/logout` | 清除 Cookie |
| POST | `/api/auth/forgot-password` | 发送重置邮件 |
| POST | `/api/auth/reset-password` | 重置密码（验证 token） |
| POST | `/api/auth/accept-invite` | 接受邀请、设置密码 |

### 日历与预订
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/rooms` | 获取所有 isActive 房间 |
| GET | `/api/bookings?date=&roomId=` | 查询某天的预订列表（roomId 可选，不传则返回所有房间） |
| GET | `/api/bookings/mine` | 当前用户的预订（支持 status 过滤） |
| POST | `/api/bookings` | 创建预订（含完整业务规则校验） |
| DELETE | `/api/bookings/:id` | 取消自己的预订 |

### 管理后台
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/users` | 用户列表 |
| POST | `/api/admin/invitations` | 发送邀请邮件 |
| PATCH | `/api/admin/users/:id` | 停用/恢复账号 |
| GET | `/api/admin/rooms` | 所有房间（含非活跃） |
| POST | `/api/admin/rooms` | 新建房间 |
| PATCH | `/api/admin/rooms/:id` | 修改房间 |
| DELETE | `/api/admin/rooms/:id` | 删除房间 |
| GET | `/api/admin/blocked-slots` | 封锁时段列表 |
| POST | `/api/admin/blocked-slots` | 添加封锁时段 |
| DELETE | `/api/admin/blocked-slots/:id` | 删除封锁时段 |
| GET | `/api/admin/bookings` | 所有预订（支持日期/房间/用户过滤） |
| DELETE | `/api/admin/bookings/:id` | 取消任意预订 |

---

## 7. 核心预订流程

```
用户点击空闲格子
  → 右侧面板（房间+时间预填）
  → 输入会议主题
  → POST /api/bookings
      → BEGIN TRANSACTION
      → SELECT ... FOR UPDATE（检查 Booking 冲突）
      → SELECT（检查 BlockedSlot 冲突）
      → 校验业务规则（时长、提前天数、用户并发、zone 时间限制）
      → INSERT Booking (status = CONFIRMED)
      → COMMIT
  → React Query 刷新日历网格
```

---

## 8. 扩展路径

本设计为企业内部场景（A 方案）。后续扩展路径：

- **→ 商业化（B 方案）：** 给 Room 加 `pricePerHour`，增加 Payment / Order 表，开放自助注册
- **→ 多租户 SaaS（C 方案）：** 增加 `Organization` 表，所有资源挂租户，核心数据模型结构不变
