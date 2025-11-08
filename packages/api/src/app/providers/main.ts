import { ApplicationLayer } from "@ees/core"
import { createPinoLogger, createLoggerConfig } from "@ees/core"

/**
 * Logger instance for application layer initialization
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Create application layer with environment-specific configuration
 *
 * IMPORTANT: In test environment, database connection sharing is handled at the
 * DatabaseService level by caching the database client globally.
 * See packages/core/src/shared/database/connection.ts for implementation details.
 *
 * This ensures:
 * 1. POST request creates data in shared in-memory database
 * 2. GET request fetches from same database ✅
 *
 * The ApplicationLayer itself doesn't need special handling for tests.
 */
function createAppLayer() {
  if (process.env["NODE_ENV"] === "test") {
    logger.debug("Initializing test environment app layer")
  }

  // Use the standard application layer for all environments
  // Database sharing is handled internally by DatabaseService
  return ApplicationLayer
}

/**
 * Web application layer
 * Uses the shared application layer for consistency with CLI and other interfaces
 */
export const AppLayer = createAppLayer()
