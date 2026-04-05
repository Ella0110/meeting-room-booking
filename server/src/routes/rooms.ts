import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import * as rooms from '../controllers/rooms.controller'

const router = Router()
router.use(authenticate)
router.get('/', rooms.listRooms)
export default router
