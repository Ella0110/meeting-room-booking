import rateLimit from 'express-rate-limit'

export const bookingLimiter = rateLimit({
  windowMs: 5_000,
  max: 3,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})
