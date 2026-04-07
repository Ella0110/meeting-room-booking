import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login } from '../api/auth'

export default function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 inline-block bg-[#FFBE0B] border-4 border-black px-4 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
          <span className="font-grotesk font-black text-2xl uppercase tracking-wider">会议室预订</span>
        </div>

        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h1 className="font-grotesk font-black text-3xl uppercase mb-6">登录</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="font-grotesk font-black text-sm uppercase">邮箱</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="font-grotesk font-black text-sm uppercase">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-3 shadow-[6px_6px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="font-mono text-sm underline hover:no-underline">
              忘记密码？
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
