import { serve } from "@hono/node-server"
import { getPort } from "@ees/core"
import app from "./app"

const port = getPort(3000)

console.log(`🚀 Starting EES API server on port ${port}`)

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

try {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      console.log(`✅ EES API server is running on http://localhost:${port}`)
      console.log(`📚 API documentation available at http://localhost:${port}/docs`)
    }
  )
} catch (error) {
  console.error('Failed to start server:', error)
  process.exit(1)
}