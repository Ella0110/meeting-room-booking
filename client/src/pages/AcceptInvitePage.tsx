import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { acceptInvite } from '../api/auth'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await acceptInvite(token!, name, password)
      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? '邀请链接无效或已过期')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="mb-4 inline-block bg-[#8338EC] border-4 border-black px-3 py-1">
          <span className="font-grotesk font-black text-white text-sm uppercase">新账号</span>
        </div>
        <h1 className="font-grotesk font-black text-3xl uppercase mb-6">接受邀请</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="font-grotesk font-black text-sm uppercase">姓名</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
              placeholder="你的名字"
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
              minLength={8}
              className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
              placeholder="至少 8 位"
            />
          </div>
          {error && (
            <div className="border-4 border-[#FF006E] bg-[#FF006E]/10 px-3 py-2 font-mono text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-none border-4 border-black bg-[#8338EC] text-white font-grotesk font-black uppercase py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? '提交中...' : '设置密码'}
          </button>
        </form>
      </div>
    </div>
  )
}
