import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md border-4 border-black bg-[#06D6A0] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
          <p className="font-grotesk font-black text-2xl uppercase mb-2">已发送！</p>
          <p className="font-mono text-sm mb-4">请检查 {email} 的收件箱</p>
          <Link to="/login" className="font-mono text-sm underline hover:no-underline">返回登录</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <h1 className="font-grotesk font-black text-3xl uppercase mb-6">忘记密码</h1>
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
          <button
            type="submit"
            disabled={loading}
            className="rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase py-3 shadow-[6px_6px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? '发送中...' : '发送重置邮件'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="font-mono text-sm underline hover:no-underline">返回登录</Link>
        </div>
      </div>
    </div>
  )
}
