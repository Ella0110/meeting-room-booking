import { NavLink, Outlet } from 'react-router-dom'
import { Users, Building2, Ban, CalendarDays } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin/users',         label: '用户管理',   Icon: Users },
  { to: '/admin/rooms',         label: '会议室管理', Icon: Building2 },
  { to: '/admin/blocked-slots', label: '封锁时段',   Icon: Ban },
  { to: '/admin/bookings',      label: '全部预订',   Icon: CalendarDays },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-56 border-r-4 border-black bg-white flex-shrink-0 hidden md:block">
        <div className="p-4 border-b-4 border-black">
          <div className="inline-block bg-[#FF006E] border-4 border-black px-2 py-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-grotesk font-black text-white text-sm uppercase">管理后台</span>
          </div>
        </div>
        <nav className="p-2 flex flex-col gap-1">
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
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden w-full">
        <div className="flex border-b-4 border-black overflow-x-auto bg-white">
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
