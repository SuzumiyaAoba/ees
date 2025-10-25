/**
 * Provider Management API Implementation
 * Handles provider listing, status checking, and model discovery
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import { createPinoLogger, createLoggerConfig } from "@ees/core"
import {
  listProvidersRoute,
  getCurrentProviderRoute,
  listProviderModelsRoute,
  getOllamaStatusRoute,
  type ProviderInfo,
  type ProviderModel,
  type OllamaStatus,
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
 */
providerApp.openapi(getCurrentProviderRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const getCurrentProviderProgram = Effect.gen(function* () {
      // Get provider configuration from environment variables
      const providerType = process.env["EES_DEFAULT_PROVIDER"] || "ollama"
      const baseUrl = process.env["EES_OLLAMA_BASE_URL"] || "http://localhost:11434"
      const defaultModel = process.env["EES_OLLAMA_DEFAULT_MODEL"] || "nomic-embed-text"

      const currentProvider: CurrentProvider = {
        provider: providerType,
        configuration: {
          baseUrl,
          model: defaultModel,
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
    return c.json(
      { error: "Failed to get current provider" },
      500
    )
  }
})

/**
 * Handler for listing provider models
 */
providerApp.openapi(listProviderModelsRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const { provider } = c.req.valid("query")

    const listModelsProgram = Effect.gen(function* () {
      // For now, return static model information
      // This will be enhanced with actual provider model discovery
      const allModels: ProviderModel[] = [
        {
          name: "nomic-embed-text",
          displayName: "Nomic Embed Text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
          size: 274301440,
          modified_at: "2024-01-01T00:00:00Z",
          digest: "sha256:abc123",
        },
        {
          name: "embeddinggemma",
          displayName: "Embedding Gemma",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
        },
      ]

      // Filter by provider if specified
      const filteredModels = provider
        ? allModels.filter((model) => model.provider === provider)
        : allModels

      // Return 404 if provider specified but no models found
      if (provider && filteredModels.length === 0) {
        return yield* Effect.fail(new Error("Provider not found"))
      }

      return filteredModels
    })

    const result = await Effect.runPromise(
      listModelsProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<ProviderModel[], Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing provider models")
    if (error instanceof Error && error.message === "Provider not found") {
      return c.json(
        { error: "Provider not found" },
        404
      )
    }
    return c.json(
      { error: "Failed to list provider models" },
      500
    )
  }
})

/**
 * Handler for getting Ollama status
 */
providerApp.openapi(getOllamaStatusRoute, async (c) => {
  const startTime = Date.now()
  const baseUrl = "http://localhost:11434"

  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    const getOllamaStatusProgram = Effect.gen(function* () {
      // Try to connect to Ollama service
      try {
        const response = yield* Effect.tryPromise({
          try: () => fetch(`${baseUrl}/api/version`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }),
          catch: () => new Error("Ollama service unavailable"),
        })

        if (!response.ok) {
          return yield* Effect.fail(new Error(`Ollama service returned ${response.status}`))
        }

        const versionData = yield* Effect.tryPromise({
          try: () => response.json() as Promise<{ version?: string }>,
          catch: () => new Error("Failed to parse Ollama version"),
        })

        // Get list of available models
        const modelsResponse = yield* Effect.tryPromise({
          try: () => fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }),
          catch: () => new Error("Failed to get Ollama models"),
        })

        let models: string[] = []
        if (modelsResponse.ok) {
          const modelsData = yield* Effect.tryPromise({
            try: () => modelsResponse.json() as Promise<{ models?: Array<{ name: string }> }>,
            catch: () => new Error("Failed to parse Ollama models"),
          })
          // Keep full model names with version tags for display (e.g., "gemma3:27b", "qwen3:8b")
          models = modelsData.models?.map((m) => m.name) || []
        }

        const responseTime = Date.now() - startTime

        const ollamaStatus: OllamaStatus = {
          status: "online",
          version: versionData.version || "unknown",
          models,
          responseTime,
          baseUrl,
        }

        return ollamaStatus
      } catch {
        return yield* Effect.fail(new Error("Ollama service unavailable"))
      }
    })

    const result = await Effect.runPromise(
      getOllamaStatusProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<OllamaStatus, Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    const responseTime = Date.now() - startTime
    logger.error({ error: String(error) }, "Error getting Ollama status")
    return c.json(
      {
        status: "offline" as const,
        error: error instanceof Error ? error.message : "Ollama service unavailable",
        responseTime,
        baseUrl,
      },
      503
    )
  }
})