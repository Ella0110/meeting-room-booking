import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://ella@localhost:5432/booking_app_test',
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
    },
    sequence: { concurrent: false },
  },
})
