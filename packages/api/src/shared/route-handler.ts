import { Effect } from "effect"
import type { Context } from "hono"
import { AppLayer } from "@/app/providers/main"
import { handleErrorResponse } from "@/shared/error-handler"
import { EmbeddingApplicationService, ModelManagerTag } from "@ees/core"

/**
 * Generic route handler that abstracts the common Effect execution pattern
 * Eliminates duplicate code across all OpenAPI route handlers
 */
export async function executeEffectHandler<T>(
  c: Context,
  operation: string,
  effectProgram: Effect.Effect<T, unknown, unknown>
): Promise<Response> {
  try {
    const result = await Effect.runPromise(
      // @ts-expect-error - Effect.provide changes requirements to 'never' but Effect.gen infers 'any'
      // This is a known limitation in Effect-TypeScript integration with generic functions
      effectProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    return handleErrorResponse(c, error, operation)
  }
}

/**
 * Helper for creating Effect programs with EmbeddingApplicationService
 * Reduces boilerplate in embedding-related endpoints
 */
export function withEmbeddingService<T>(
  serviceCall: (service: any) => Effect.Effect<T, unknown, unknown>
): Effect.Effect<T, unknown, unknown> {
  return Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* serviceCall(appService)
  })
}

/**
 * Helper for creating Effect programs with ModelManagerTag
 * Reduces boilerplate in model-related endpoints
 */
export function withModelManager<T>(
  serviceCall: (manager: any) => Effect.Effect<T, unknown, unknown>
): Effect.Effect<T, unknown, unknown> {
  return Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag
    return yield* serviceCall(modelManager)
  })
}

/**
 * Helper for handling conditional responses (e.g., 404 when resource not found)
 * Common pattern in GET and DELETE endpoints
 */
export async function executeEffectHandlerWithConditional<T>(
  c: Context,
  operation: string,
  effectProgram: Effect.Effect<T | null, unknown, unknown>,
  notFoundMessage: string = "Resource not found"
): Promise<Response> {
  try {
    const result = await Effect.runPromise(
      // @ts-expect-error - Effect.provide changes requirements to 'never' but Effect.gen infers 'any'
      // This is a known limitation in Effect-TypeScript integration with generic functions
      effectProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json({ error: notFoundMessage }, 404)
    }

    return c.json(result, 200)
  } catch (error) {
    return handleErrorResponse(c, error, operation)
  }
}

/**
 * Helper for parameter validation (used in DELETE endpoints)
 * Returns early error response for invalid parameters
 */
export function validateNumericId(idStr: string, context: Context): number | Response {
  const id = Number(idStr)

  if (Number.isNaN(id)) {
    return context.json({ error: "Invalid ID parameter" }, 400)
  }

  return id
}