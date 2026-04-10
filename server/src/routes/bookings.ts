import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { bookingLimiter } from '../middleware/rateLimiter'
import * as bookings from '../controllers/bookings.controller'

const router = Router()
router.use(authenticate)
router.get('/blocked-slots', bookings.listBlockedSlots)
router.get('/', bookings.listBookings)
router.get('/mine', bookings.myBookings)
router.post('/', bookingLimiter, bookings.createBooking)
router.patch('/:id', bookings.updateBooking)
router.delete('/:id', bookings.cancelBooking)
export default router
