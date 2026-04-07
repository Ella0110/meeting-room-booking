import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRooms } from '../useRooms'
import * as roomsApi from '../../api/rooms'

vi.mock('../../api/rooms')
const mockListRooms = vi.mocked(roomsApi.listRooms)

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useRooms', () => {
  it('returns rooms from API', async () => {
    const rooms = [{ id: '1', name: 'Room A', capacity: 8, zone: 'OFFICE', isActive: true }]
    mockListRooms.mockResolvedValueOnce(rooms as never)
    const { result } = renderHook(() => useRooms(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(rooms))
  })

  it('starts in loading state', () => {
    mockListRooms.mockResolvedValueOnce([])
    const { result } = renderHook(() => useRooms(), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })
})
