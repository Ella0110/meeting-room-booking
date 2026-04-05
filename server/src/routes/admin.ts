import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requireAdmin } from '../middleware/requireAdmin'
import * as admin from '../controllers/admin.controller'

const router = Router()
router.use(authenticate, requireAdmin)

router.post('/invitations', admin.sendInvite)
router.get('/users', admin.listUsers)
router.patch('/users/:id', admin.updateUser)
router.get('/rooms', admin.listRooms)
router.post('/rooms', admin.createRoom)
router.patch('/rooms/:id', admin.updateRoom)
router.delete('/rooms/:id', admin.deleteRoom)
router.get('/blocked-slots', admin.listBlockedSlots)
router.post('/blocked-slots', admin.createBlockedSlot)
router.delete('/blocked-slots/:id', admin.deleteBlockedSlot)
router.get('/bookings', admin.listAllBookings)
router.delete('/bookings/:id', admin.cancelAnyBooking)

export default router
