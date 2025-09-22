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
} from "./api/route"

interface TaggedError {
  _tag: string
  message: string
}

/**
 * Migration feature app with handlers
 */
export const migrationApp = new OpenAPIHono()

/**
 * Handler for migrating embeddings between models
 */
migrationApp.openapi(migrateEmbeddingsRoute, async (c) => {
  const { fromModel, toModel, options } = c.req.valid("json")

  // Import AppLayer dynamically
  const { AppLayer } = await import("@/app/providers/main")

  const migrationProgram = Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag

    // Type-safe options handling - only include defined properties
    const migrationOptions = options ? Object.fromEntries(
      Object.entries({
        preserveOriginal: options.preserveOriginal,
        batchSize: options.batchSize,
        continueOnError: options.continueOnError,
        metadata: options.metadata,
      }).filter(([, value]) => value !== undefined)
    ) : undefined

    return yield* modelManager.migrateEmbeddings(fromModel, toModel, migrationOptions)
  })

  try {
    const result = await Effect.runPromise(
      migrationProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<import("@ees/core").MigrationResult, Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    // Handle specific error types
    if (error && typeof error === "object" && "_tag" in error) {
      const errorObj = error as TaggedError
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
migrationApp.openapi(checkCompatibilityRoute, async (c) => {
  const { sourceModel, targetModel } = c.req.valid("json")

  // Import AppLayer dynamically
  const { AppLayer } = await import("@/app/providers/main")

  const compatibilityProgram = Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag
    return yield* modelManager.validateModelCompatibility(sourceModel, targetModel)
  })

  try {
    const result = await Effect.runPromise(
      compatibilityProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<import("@ees/core").ModelCompatibility, Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    // Handle specific error types
    if (error && typeof error === "object" && "_tag" in error) {
      const errorObj = error as TaggedError
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