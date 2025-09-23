import { ApplicationLayer } from "@ees/core"
import { Layer } from "effect"

/**
 * Create application layer with environment-specific configuration
 */
function createAppLayer() {
  // In test environment, ensure all services are properly initialized
  if (process.env["NODE_ENV"] === "test") {
    console.log("Initializing test environment app layer...")

    // For test environment, create a suspended layer to ensure proper initialization timing
    return Layer.suspend(() => {
      console.log("Creating ApplicationLayer for test environment")
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
