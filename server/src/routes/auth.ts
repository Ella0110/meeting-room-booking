import { Router } from 'express'
import * as auth from '../controllers/auth.controller'

const router = Router()
router.post('/login', auth.login)
router.post('/logout', auth.logout)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password', auth.resetPassword)
router.post('/accept-invite', auth.acceptInvite)
export default router
