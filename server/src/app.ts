import express from 'express'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import roomRoutes from './routes/rooms'
import bookingRoutes from './routes/bookings'
import adminRoutes from './routes/admin'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/auth', authRoutes)
  app.use('/api/rooms', roomRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/admin', adminRoutes)

  app.use(errorHandler)
  return app
}
