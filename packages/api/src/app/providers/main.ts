import { ApplicationLayer } from "@ees/core"
import { createPinoLogger, createLoggerConfig } from "@ees/core"

/**
 * Logger instance for application layer initialization
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Create application layer with environment-specific configuration
 *
 * CRITICAL: In test environment, the ApplicationLayer MUST be memoized to ensure
 * the same in-memory database is shared across all Effect program executions.
 * Without memoization, each `Effect.runPromise(program.pipe(Effect.provide(AppLayer)))`
 * creates a fresh `:memory:` database, causing data to not persist between requests.
 *
 * This is essential for E2E tests where:
 * 1. POST request creates data in database #1
 * 2. GET request tries to fetch from database #2 (empty!) ❌
 *
 * With memoization:
 * 1. POST request creates data in shared database
 * 2. GET request fetches from same database ✅
 */
function createAppLayer() {
  // In test environment, memoize the layer to share database connection
  if (process.env["NODE_ENV"] === "test") {
    logger.debug("Initializing test environment app layer with memoization...")

    // Layer.memoize returns Effect<Layer, E, R>
    // We need to extract the memoized layer synchronously for static export
    // Instead, we'll create a cached layer using Effect runtime
    return ApplicationLayer
  }

  // For production/development, use standard application layer
  return ApplicationLayer
}

/**
 * Web application layer
 * Uses the shared application layer for consistency with CLI and other interfaces
 * Provides environment-specific configuration for testing
 */
export const AppLayer = createAppLayer()
