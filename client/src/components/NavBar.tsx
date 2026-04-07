import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Calendar, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b-4 border-black px-4 md:px-8 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-[#FFBE0B] border-4 border-black px-2 py-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
            <span className="font-grotesk font-black text-sm uppercase tracking-wider">会议室</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/" className="flex items-center gap-1 font-mono text-sm hover:underline">
            <Calendar size={16} />
            <span className="hidden md:inline">日历</span>
          </Link>
          <Link to="/my-bookings" className="flex items-center gap-1 font-mono text-sm hover:underline">
            <BookOpen size={16} />
            <span className="hidden md:inline">我的预订</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin/users" className="font-mono text-sm hover:underline border-2 border-black px-2 py-0.5">
              管理后台
            </Link>
          )}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm hidden md:block">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-none border-4 border-black bg-white px-2 py-1 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">退出</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
