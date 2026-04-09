import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminUsers } from '../../hooks/useAdminData'
import { sendInvite, updateUser } from '../../api/admin'
import Skeleton from '../../components/Skeleton'

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useAdminUsers()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')

  const inviteMutation = useMutation({
    mutationFn: () => sendInvite(inviteEmail),
    onSuccess: () => {
      setInviteSuccess(`邀请已发送至 ${inviteEmail}`)
      setInviteEmail('')
      setTimeout(() => setInviteSuccess(''), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setInviteError(msg ?? '发送失败')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateUser(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="font-grotesk font-black text-3xl uppercase mb-6">用户管理</h1>

      {/* Invite form */}
      <div className="border-4 border-black bg-[#FFFBEB] p-4 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-grotesk font-black text-xl uppercase mb-3">发送邀请</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
            placeholder="邮箱地址"
            className="flex-1 rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all"
          />
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={!inviteEmail || inviteMutation.isPending}
            className="rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(255,190,11,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            发送邀请
          </button>
        </div>
        {inviteSuccess && <p className="font-mono text-sm text-[#06D6A0] mt-2">{inviteSuccess}</p>}
        {inviteError && <p className="font-mono text-sm text-[#FF006E] mt-2">{inviteError}</p>}
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`border-4 border-black p-4 flex items-center justify-between gap-4 ${user.isActive ? 'bg-white' : 'bg-[#f3f4f6]'}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-grotesk font-black">{user.name}</span>
                  {user.role === 'ADMIN' && (
                    <span className="bg-[#FF006E] text-white font-grotesk font-black text-xs uppercase px-2 py-0.5 border-2 border-black">
                      管理员
                    </span>
                  )}
                  {!user.isActive && (
                    <span className="font-mono text-xs border-2 border-gray-400 px-2 py-0.5 text-gray-500">停用</span>
                  )}
                </div>
                <p className="font-mono text-sm text-gray-600">{user.email}</p>
              </div>
              {user.role !== 'ADMIN' && (
                <button
                  onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                  disabled={toggleMutation.isPending}
                  className={`rounded-none border-4 border-black font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none ${
                    user.isActive ? 'bg-white' : 'bg-[#06D6A0]'
                  }`}
                >
                  {user.isActive ? '停用' : '恢复'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
