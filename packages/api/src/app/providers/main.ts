import { ApplicationLayer } from "@ees/core"
import { Layer } from "effect"
import { createPinoLogger, createLoggerConfig } from "@ees/core"

/**
 * Logger instance for application layer initialization
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Create application layer with environment-specific configuration
 */
function createAppLayer() {
  // In test environment, ensure all services are properly initialized
  if (process.env["NODE_ENV"] === "test") {
    logger.debug("Initializing test environment app layer...")

    // For test environment, create a suspended layer to ensure proper initialization timing
    return Layer.suspend(() => {
      logger.debug("Creating ApplicationLayer for test environment")
      return ApplicationLayer
    })
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
