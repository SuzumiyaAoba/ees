import { serve } from "@hono/node-server"
import { getPort } from "@ees/core"
import { createPinoLogger, createLoggerConfig } from "@ees/core"
import app from "./app"

const port = getPort(3000)
const logger = createPinoLogger(createLoggerConfig())

logger.info({
  port,
  component: "server",
  phase: "startup"
}, "Starting EES API server")

// Add process error handlers
process.on('uncaughtException', (error) => {
  logger.fatal({
    error: error.message,
    stack: error.stack,
    component: "server"
  }, "Uncaught Exception")
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({
    reason: String(reason),
    promise: String(promise),
    component: "server"
  }, "Unhandled Rejection")
  process.exit(1)
})

try {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      logger.info({
        url: `http://localhost:${port}`,
        docsUrl: `http://localhost:${port}/docs`,
        component: "server",
        phase: "ready"
      }, "EES API server is running")
    }
  )
} catch (error) {
  logger.fatal({
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    component: "server"
  }, "Failed to start server")
  process.exit(1)
}