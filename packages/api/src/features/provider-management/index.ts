/**
 * Provider Management API Implementation
 * Handles provider listing, status checking, and model discovery
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  createPinoLogger,
  createLoggerConfig,
  ConnectionService,
  createProviderLayer,
  OllamaProviderService,
  OpenAICompatibleProviderService,
} from "@ees/core"
import {
  listProvidersRoute,
  getCurrentProviderRoute,
  listProviderModelsRoute,
  type ProviderInfo,
  type ProviderModel,
  type CurrentProvider,
} from "./api/route"

/**
 * Logger instance for provider management
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Provider management feature app with handlers
 */
export const providerApp = new OpenAPIHono()

/**
 * Handler for listing all available providers
 */
providerApp.openapi(listProvidersRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const listProvidersProgram = Effect.gen(function* () {
      // For now, return static provider information
      // This will be enhanced with actual provider checking
      const providers: ProviderInfo[] = [
        {
          name: "ollama",
          displayName: "Ollama",
          description: "Local AI model provider",
          status: "online",
          version: "0.1.0",
          modelCount: 5,
        },
      ]

      return providers
    })

    const result = await Effect.runPromise(
      listProvidersProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<ProviderInfo[], Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing providers")
    return c.json(
      { error: "Failed to list providers" },
      500
    )
  }
})

/**
 * Handler for getting current active provider
 * Uses the active connection from the database instead of environment variables
 */
providerApp.openapi(getCurrentProviderRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const getCurrentProviderProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService

      // Get the active connection from the database
      const activeConnection = yield* connectionService.getActiveConnection()

      // If no active connection exists, return an error
      if (!activeConnection) {
        return yield* Effect.fail(new Error("No active connection configured"))
      }

      const currentProvider: CurrentProvider = {
        provider: activeConnection.type,
        configuration: {
          baseUrl: activeConnection.baseUrl,
        },
      }

      return currentProvider
    })

    const result = await Effect.runPromise(
      getCurrentProviderProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<CurrentProvider, Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error getting current provider")
    if (error instanceof Error && error.message === "No active connection configured") {
      return c.json(
        { error: "No active connection configured. Please activate a connection first." },
        404
      )
    }
    return c.json(
      { error: "Failed to get current provider" },
      500
    )
  }
})

/**
 * Handler for listing provider models
 * Gets models from the active connection via ConnectionService
 */
providerApp.openapi(listProviderModelsRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const { provider } = c.req.valid("query")

    const listModelsProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService

      // Get the active connection from the database (with API key for provider initialization)
      const activeConnection = yield* connectionService.getActiveConnectionConfig()

      // If no active connection exists, return an error
      if (!activeConnection) {
        return yield* Effect.fail(new Error("No active connection configured"))
      }

      // If provider filter is specified and doesn't match active connection, return empty array
      if (provider && activeConnection.type !== provider) {
        return []
      }

      // Create provider config from active connection
      const providerConfig = {
        type: activeConnection.type,
        baseUrl: activeConnection.baseUrl,
        ...(activeConnection.apiKey && { apiKey: activeConnection.apiKey }),
      }

      // Create a temporary provider layer to list models
      const providerLayer = createProviderLayer(providerConfig)

      // Get the provider service tag based on the connection type
      const ProviderServiceTag = activeConnection.type === "ollama"
        ? OllamaProviderService
        : OpenAICompatibleProviderService

      // Create an Effect program that uses the provider layer
      // This program is independent of AppLayer
      const listModelsEffect = Effect.gen(function* () {
        const providerService = yield* ProviderServiceTag
        return yield* providerService.listModels()
      }).pipe(Effect.provide(providerLayer))

      // Run the Effect to get the models
      const models = yield* listModelsEffect

      // Map to ProviderModel format
      const formattedModels: ProviderModel[] = models.map((model: { name: string; provider: string; dimensions?: number }) => ({
        name: model.name,
        provider: model.provider,
        dimensions: model.dimensions,
      }))

      return formattedModels
    })

    const result = await Effect.runPromise(
      listModelsProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<ProviderModel[], Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing provider models")
    if (error instanceof Error && error.message.includes("Provider not found")) {
      return c.json(
        { error: "Provider not found or no models available" },
        404
      )
    }
    if (error instanceof Error && error.message.includes("No active connection")) {
      return c.json(
        { error: "No active connection configured. Please activate a connection first." },
        404
      )
    }
    return c.json(
      { error: "Failed to list provider models" },
      500
    )
  }
})

