import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../client'
import { listBookings, createBooking } from '../bookings'

vi.mock('../client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockGet = vi.mocked(api.get)
const mockPost = vi.mocked(api.post)

describe('listBookings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls GET /api/bookings with date param', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    await listBookings('2026-04-10')
    expect(mockGet).toHaveBeenCalledWith('/api/bookings', { params: { date: '2026-04-10', roomId: undefined } })
  })

  it('returns the data array', async () => {
    const bookings = [{ id: '1', title: 'Meeting', isOwn: true }]
    mockGet.mockResolvedValueOnce({ data: bookings })
    const result = await listBookings('2026-04-10')
    expect(result).toEqual(bookings)
  })
})

describe('createBooking', () => {
  it('calls POST /api/bookings with body', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: '1' } })
    const body = {
      roomId: 'room-1',
      title: 'Meeting',
      startTime: '2026-04-10T10:00:00.000Z',
      endTime: '2026-04-10T11:00:00.000Z',
    }
    await createBooking(body)
    expect(mockPost).toHaveBeenCalledWith('/api/bookings', body)
  })
})
