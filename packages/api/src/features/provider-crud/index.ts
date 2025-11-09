/**
 * Provider CRUD API Implementation
 * Handles database CRUD operations for provider configurations
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  createPinoLogger,
  createLoggerConfig,
  ProviderRepository,
  createProviderLayer,
  OllamaProviderService,
  OpenAICompatibleProviderService,
} from "@ees/core"
import {
  listProvidersRoute,
  getProviderRoute,
  createProviderRoute,
  updateProviderRoute,
  deleteProviderRoute,
  testProviderRoute,
  type CreateProviderRequest,
  type UpdateProviderRequest,
  type ProviderTestRequest,
} from "./api/route"

/**
 * Logger instance for provider CRUD
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Provider CRUD feature app with handlers
 */
export const providerCrudApp = new OpenAPIHono()

/**
 * Handler for listing all providers
 */
providerCrudApp.openapi(listProvidersRoute, async (c) => {
  try {
    const { AppLayer } = await import("@/app/providers/main")

    const listProvidersProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository
      const providers = yield* providerRepository.findAll()

      return {
        providers: providers.map(p => ({
          ...p,
          type: p.type as "ollama" | "openai-compatible",
          metadata: p.metadata ? (JSON.parse(p.metadata) as Record<string, unknown>) : null,
        })),
        total: providers.length,
      }
    })

    const result = await Effect.runPromise(
      listProvidersProgram.pipe(Effect.provide(AppLayer))
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
 * Handler for getting provider by ID
 */
providerCrudApp.openapi(getProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const getProviderProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository
      const provider = yield* providerRepository.findById(id)

      if (!provider) {
        return null
      }

      return {
        ...provider,
        type: provider.type as "ollama" | "openai-compatible",
        metadata: provider.metadata ? (JSON.parse(provider.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      getProviderProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json(
        { error: "Provider not found" },
        404
      )
    }

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error getting provider")
    return c.json(
      { error: "Failed to get provider" },
      500
    )
  }
})

/**
 * Handler for creating a provider
 */
providerCrudApp.openapi(createProviderRoute, async (c) => {
  try {
    const body = c.req.valid("json") as CreateProviderRequest
    const { AppLayer } = await import("@/app/providers/main")

    const createProviderProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository
      const provider = yield* providerRepository.create({
        name: body.name,
        type: body.type,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey || null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      })

      return {
        ...provider,
        type: provider.type as "ollama" | "openai-compatible",
        metadata: provider.metadata ? (JSON.parse(provider.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      createProviderProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 201)
  } catch (error) {
    logger.error({ error: String(error) }, "Error creating provider")
    return c.json(
      { error: "Failed to create provider" },
      500
    )
  }
})

/**
 * Handler for updating a provider
 */
providerCrudApp.openapi(updateProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const body = c.req.valid("json") as UpdateProviderRequest
    const { AppLayer } = await import("@/app/providers/main")

    const updateProviderProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository

      const updateData: Record<string, unknown> = {}
      if (body.name) updateData["name"] = body.name
      if (body.baseUrl) updateData["baseUrl"] = body.baseUrl
      if (body.apiKey !== undefined) updateData["apiKey"] = body.apiKey || null
      if (body.metadata) updateData["metadata"] = JSON.stringify(body.metadata)

      const success = yield* providerRepository.update(id, updateData)

      if (!success) {
        return null
      }

      const provider = yield* providerRepository.findById(id)

      if (!provider) {
        return null
      }

      return {
        ...provider,
        type: provider.type as "ollama" | "openai-compatible",
        metadata: provider.metadata ? (JSON.parse(provider.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      updateProviderProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json(
        { error: "Provider not found" },
        404
      )
    }

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error updating provider")

    if (String(error).includes("not found")) {
      return c.json(
        { error: "Provider not found" },
        404
      )
    }

    return c.json(
      { error: "Failed to update provider" },
      500
    )
  }
})

/**
 * Handler for deleting a provider
 */
providerCrudApp.openapi(deleteProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const deleteProviderProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository
      return yield* providerRepository.delete(id)
    })

    const success = await Effect.runPromise(
      deleteProviderProgram.pipe(Effect.provide(AppLayer))
    )

    if (!success) {
      return c.json(
        { error: "Provider not found" },
        404
      )
    }

    return c.body(null, 204)
  } catch (error) {
    logger.error({ error: String(error) }, "Error deleting provider")
    return c.json(
      { error: "Failed to delete provider" },
      500
    )
  }
})

/**
 * Handler for testing a provider connection
 */
providerCrudApp.openapi(testProviderRoute, async (c) => {
  try {
    const body = c.req.valid("json") as ProviderTestRequest
    const { AppLayer } = await import("@/app/providers/main")

    const testProviderProgram = Effect.gen(function* () {
      const providerRepository = yield* ProviderRepository

      // Get provider configuration
      let providerConfig: { type: string; baseUrl: string; apiKey?: string | null }

      if (body.id) {
        const provider = yield* providerRepository.findById(body.id)
        if (!provider) {
          return yield* Effect.fail(new Error("Provider not found"))
        }
        providerConfig = {
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
        }
      } else if (body.baseUrl && body.type) {
        providerConfig = {
          type: body.type,
          baseUrl: body.baseUrl,
          apiKey: body.apiKey,
        }
      } else {
        return yield* Effect.fail(new Error("Either provider ID or baseUrl and type must be provided"))
      }

      // Create a temporary provider layer to test the connection
      const providerLayer = createProviderLayer({
        type: providerConfig.type as "ollama" | "openai-compatible",
        baseUrl: providerConfig.baseUrl,
        ...(providerConfig.apiKey && { apiKey: providerConfig.apiKey }),
      })

      // Get the provider service tag based on the type
      const ProviderServiceTag = providerConfig.type === "ollama"
        ? OllamaProviderService
        : OpenAICompatibleProviderService

      // Create an Effect program that uses the provider layer
      const testConnectionEffect = Effect.gen(function* () {
        const providerService = yield* ProviderServiceTag
        const models = yield* providerService.listModels()
        return models.map((m: { name: string }) => m.name)
      }).pipe(Effect.provide(providerLayer))

      // Run the Effect to test the connection
      const models = yield* testConnectionEffect

      return {
        success: true,
        message: "Connection successful",
        models,
      }
    })

    const result = await Effect.runPromise(
      testProviderProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Provider test failed")

    return c.json(
      {
        error: String(error),
        success: false,
      },
      400
    )
  }
})
