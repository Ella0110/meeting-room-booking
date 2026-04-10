import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminRooms } from '../../hooks/useAdminData'
import { createRoom, updateRoom, deleteRoom, enableRoom } from '../../api/admin'
import type { Room } from '../../types'
import Skeleton from '../../components/Skeleton'
import { ROOM_COLORS, getRoomTextColor } from '../../utils/roomColors'

const ZONE_LABELS = { OFFICE: '办公区', SHARED: '共享区' }

export default function RoomsPage() {
  const qc = useQueryClient()
  const { data: rooms = [], isLoading } = useAdminRooms()
  const [showForm, setShowForm] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState(8)
  const [zone, setZone] = useState<'OFFICE' | 'SHARED'>('OFFICE')
  const [location, setLocation] = useState('')
  const [colorIndex, setColorIndex] = useState(0)

  const saveMutation = useMutation({
    mutationFn: () =>
      editRoom
        ? updateRoom(editRoom.id, { name, capacity, zone, location: location || undefined, colorIndex })
        : createRoom({ name, capacity, zone, location: location || undefined, colorIndex }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rooms'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      setShowForm(false)
      setEditRoom(null)
      setName(''); setCapacity(8); setZone('OFFICE'); setLocation(''); setColorIndex(0)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rooms'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  const enableMutation = useMutation({
    mutationFn: (id: string) => enableRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rooms'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  function openEdit(room: Room) {
    setEditRoom(room)
    setName(room.name); setCapacity(room.capacity); setZone(room.zone)
    setLocation(room.location ?? '')
    setColorIndex(room.colorIndex ?? 0)
    setShowForm(true)
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-grotesk font-black text-3xl uppercase">会议室管理</h1>
        <button
          onClick={() => { setShowForm(true); setEditRoom(null); setName(''); setCapacity(8); setZone('OFFICE'); setLocation(''); setColorIndex(0) }}
          className="rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(255,190,11,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          + 新建
        </button>
      </div>

      {showForm && (
        <div className="border-4 border-black bg-[#FFF0F4] p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-grotesk font-black text-xl uppercase mb-4">
            {editRoom ? '编辑会议室' : '新建会议室'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-grotesk font-black text-sm uppercase">名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-grotesk font-black text-sm uppercase">容量</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-grotesk font-black text-sm uppercase">分区</label>
              <select value={zone} onChange={(e) => setZone(e.target.value as 'OFFICE' | 'SHARED')}
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none">
                <option value="OFFICE">OFFICE（仅工作日）</option>
                <option value="SHARED">SHARED（任意日 09-18）</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-grotesk font-black text-sm uppercase">位置（可选）</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="例：3楼东侧"
                className="rounded-none border-4 border-black font-mono px-3 py-2 focus:outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-grotesk font-black text-sm uppercase">房间颜色</label>
              <div className="flex gap-2 flex-wrap">
                {ROOM_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setColorIndex(idx)}
                    className="w-8 h-8 border-2 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: colorIndex === idx ? '#000' : 'transparent',
                      boxShadow: colorIndex === idx ? '3px 3px 0 0 #000' : 'none',
                      transform: colorIndex === idx ? 'translate(-1px, -1px)' : 'none',
                    }}
                    aria-label={`颜色 ${idx}`}
                  >
                    {colorIndex === idx && (
                      <span style={{ color: getRoomTextColor(idx), fontSize: 14, fontWeight: 900 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowForm(false); setEditRoom(null) }}
              className="rounded-none border-4 border-black bg-white font-grotesk font-black uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              取消
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}
              className="rounded-none border-4 border-black bg-black text-white font-grotesk font-black uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(255,190,11,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none">
              {saveMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className={`border-4 border-black p-4 flex items-center justify-between gap-4 ${room.isActive ? 'bg-white' : 'bg-[#f3f4f6]'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 border-2 border-black flex-shrink-0"
                    style={{ backgroundColor: ROOM_COLORS[room.colorIndex ?? 0] }}
                  />
                  <span className="font-grotesk font-black">{room.name}</span>
                  <span className="font-mono text-xs border-2 border-black px-2 py-0.5">{ZONE_LABELS[room.zone]}</span>
                  {!room.isActive && <span className="font-mono text-xs border-2 border-gray-400 px-2 py-0.5 text-gray-500">停用</span>}
                </div>
                <p className="font-mono text-sm text-gray-600">{room.capacity} 人{room.location ? ` · ${room.location}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(room)}
                  className="rounded-none border-4 border-black bg-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                  编辑
                </button>
                {room.isActive ? (
                  <button
                    onClick={() => { if (confirm(`确认停用 ${room.name}？`)) deleteMutation.mutate(room.id) }}
                    disabled={deleteMutation.isPending}
                    className="rounded-none border-4 border-black bg-[#FF006E] text-white font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none">
                    停用
                  </button>
                ) : (
                  <button
                    onClick={() => enableMutation.mutate(room.id)}
                    disabled={enableMutation.isPending}
                    className="rounded-none border-4 border-black bg-[#06D6A0] text-black font-grotesk font-black uppercase text-xs px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none">
                    启用
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
