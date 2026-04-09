import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { Users, Building2, Ban, CalendarDays, ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/admin/users',         label: '用户管理',   Icon: Users },
  { to: '/admin/rooms',         label: '会议室管理', Icon: Building2 },
  { to: '/admin/blocked-slots', label: '封锁时段',   Icon: Ban },
  { to: '/admin/bookings',      label: '全部预订',   Icon: CalendarDays },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r-4 border-black bg-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b-4 border-black flex flex-col gap-3">
          <div className="inline-block bg-[#FF006E] border-4 border-black px-2 py-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-grotesk font-black text-white text-sm uppercase">管理后台</span>
          </div>
          <Link to="/" className="flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-black transition-colors">
            <ArrowLeft size={12} />
            返回主界面
          </Link>
        </div>
        <nav className="p-2 flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 font-mono text-sm border-2 border-transparent transition-all ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'hover:bg-[#FFFBEB] hover:border-black'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        {/* Logout at bottom */}
        <div className="p-3 border-t-4 border-black">
          <div className="font-mono text-[11px] text-gray-500 px-1 mb-2">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 font-mono text-sm border-4 border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden w-full flex flex-col">
        <div className="flex border-b-4 border-black overflow-x-auto bg-white">
          <Link to="/" className="flex items-center gap-1 px-3 py-3 font-mono text-xs border-r-4 border-black flex-shrink-0 bg-[#FFFBEB]">
            <ArrowLeft size={12} />
            返回
          </Link>
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-3 font-grotesk font-black text-xs uppercase border-r-2 border-black flex-shrink-0 whitespace-nowrap transition-all ${
                  isActive ? 'bg-black text-white' : 'bg-white hover:bg-[#FFFBEB]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-3 font-mono text-xs border-l-4 border-black flex-shrink-0 bg-[#FF006E] text-white ml-auto"
          >
            <LogOut size={12} />
            退出
          </button>
        </div>
        <main className="flex-1"><Outlet /></main>
      </div>

      {/* Main content (desktop) */}
      <main className="flex-1 hidden md:block overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
