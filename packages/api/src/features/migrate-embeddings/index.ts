/**
 * Migration feature implementation
 * Handles migration operations between embedding models
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import { ModelManagerTag } from "@ees/core"
import {
  migrateEmbeddingsRoute,
  checkCompatibilityRoute,
  type MigrationRequest,
  type CompatibilityCheckRequest,
} from "./api/route"

/**
 * Migration feature app with handlers
 */
export const migrationApp = new OpenAPIHono()

// Add middleware to inject AppLayer
migrationApp.use("*", async (c: any, next: any) => {
  // Set AppLayer from parent app context
  if (!c.get("AppLayer")) {
    // This should be set by the parent app, but we'll import it as fallback
    const { AppLayer } = await import("@/app/providers/main")
    c.set("AppLayer", AppLayer)
  }
  await next()
})

/**
 * Handler for migrating embeddings between models
 */
migrationApp.openapi(migrateEmbeddingsRoute, async (c: any) => {
  const { fromModel, toModel, options } = await c.req.json() as MigrationRequest

  const migrationProgram = Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag

    // Type-safe options handling
    const migrationOptions = options ? {
      preserveOriginal: options.preserveOriginal,
      batchSize: options.batchSize,
      continueOnError: options.continueOnError,
      metadata: options.metadata,
    } : undefined

    return yield* modelManager.migrateEmbeddings(fromModel, toModel, migrationOptions as any)
  })

  try {
    const result = await Effect.runPromise(migrationProgram.pipe(
      Effect.provide(c.get("AppLayer"))
    ) as any)

    return c.json(result, 200)
  } catch (error) {
    // Handle specific error types
    if (error && typeof error === "object" && "_tag" in error) {
      const errorObj = error as any
      switch (errorObj._tag) {
        case "ModelNotFoundError":
          return c.json(
            { error: `Model not found: ${errorObj.message}` },
            404
          )
        case "ModelIncompatibleError":
          return c.json(
            { error: `Models are incompatible: ${errorObj.message}` },
            400
          )
        case "MigrationError":
          return c.json(
            { error: `Migration failed: ${errorObj.message}` },
            500
          )
        case "DatabaseQueryError":
          return c.json(
            { error: `Database error: ${errorObj.message}` },
            500
          )
        case "ProviderConnectionError":
        case "ProviderAuthenticationError":
        case "ProviderModelError":
        case "ProviderRateLimitError":
          return c.json(
            { error: `Provider error: ${errorObj.message}` },
            500
          )
      }
    }

    console.error("Unexpected migration error:", error)
    return c.json(
      { error: "Internal server error during migration" },
      500
    )
  }
})

/**
 * Handler for checking model compatibility
 */
migrationApp.openapi(checkCompatibilityRoute, async (c: any) => {
  const { sourceModel, targetModel } = await c.req.json() as CompatibilityCheckRequest

  const compatibilityProgram = Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag
    return yield* modelManager.validateModelCompatibility(sourceModel, targetModel)
  })

  try {
    const result = await Effect.runPromise(compatibilityProgram.pipe(
      Effect.provide(c.get("AppLayer"))
    ) as any)

    return c.json(result, 200)
  } catch (error) {
    // Handle specific error types
    if (error && typeof error === "object" && "_tag" in error) {
      const errorObj = error as any
      switch (errorObj._tag) {
        case "ModelNotFoundError":
          return c.json(
            { error: `Model not found: ${errorObj.message}` },
            404
          )
        case "DatabaseQueryError":
          return c.json(
            { error: `Database error: ${errorObj.message}` },
            500
          )
        case "ProviderConnectionError":
        case "ProviderAuthenticationError":
        case "ProviderModelError":
        case "ProviderRateLimitError":
          return c.json(
            { error: `Provider error: ${errorObj.message}` },
            500
          )
      }
    }

    console.error("Unexpected compatibility check error:", error)
    return c.json(
      { error: "Internal server error during compatibility check" },
      500
    )
  }
})