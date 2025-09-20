import { serve } from "@hono/node-server"
import { getPort } from "@ees/core"
import app from "./app"

const port = getPort(3000)

console.log(`🚀 Starting EES API server on port ${port}`)

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