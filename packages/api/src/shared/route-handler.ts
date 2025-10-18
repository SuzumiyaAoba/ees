import { Effect, Runtime, Layer, Scope } from "effect"
import type { Context } from "hono"
import { AppLayer } from "@/app/providers/main"
import { handleErrorResponse } from "@/shared/error-handler"
import { EmbeddingApplicationService, ModelManagerTag, UploadDirectoryRepository, FileSystemService } from "@ees/core"
import type { EmbeddingApplicationService as EmbeddingApplicationServiceType } from "@ees/core"
import type { ModelManager } from "@ees/core"
import type { UploadDirectoryRepository as UploadDirectoryRepositoryType } from "@ees/core"
import type { FileSystemService as FileSystemServiceType } from "@ees/core"

/**
 * Shared runtime for test environment to ensure database persistence
 * In test mode with in-memory database, we need to share the same Layer instance
 * across all Effect program executions to maintain data consistency.
 */
let testRuntime: Runtime.Runtime<never> | null = null

/**
 * Initialize shared runtime for test environment
 * This ensures the same in-memory database is used across all requests
 */
async function getTestRuntime(): Promise<Runtime.Runtime<never>> {
  if (testRuntime) {
    return testRuntime
  }

  // Create a long-lived scope for the test runtime
  const scope = await Effect.runPromise(Scope.make())

  // Build the runtime with the AppLayer in the shared scope
  testRuntime = await Effect.runPromise(
    Layer.toRuntime(AppLayer).pipe(
      Scope.extend(scope)
    )
  )

  return testRuntime
}

/**
 * Generic route handler that abstracts the common Effect execution pattern
 * Eliminates duplicate code across all OpenAPI route handlers
 *
 * CRITICAL FIX: In test environment, uses a shared runtime to ensure
 * the same in-memory database is used across all requests.
 */
export async function executeEffectHandler<T>(
  c: Context,
  operation: string,
  effectProgram: Effect.Effect<T, unknown, unknown>
): Promise<Response> {
  try {
    let result: T

    if (process.env["NODE_ENV"] === "test") {
      // Use shared runtime in test mode to maintain database state
      const runtime = await getTestRuntime()
      result = await Runtime.runPromise(runtime)(
        // @ts-expect-error - Effect.provide changes requirements to 'never'
        effectProgram
      )
    } else {
      // Normal execution for production/development
      result = await Effect.runPromise(
        // @ts-expect-error - Effect.provide changes requirements to 'never' but Effect.gen infers 'any'
        // This is a known limitation in Effect-TypeScript integration with generic functions
        effectProgram.pipe(Effect.provide(AppLayer))
      )
    }

    return c.json(result, 200)
  } catch (error) {
    return handleErrorResponse(c, error, operation)
  }
}

/**
 * Helper for creating Effect programs with EmbeddingApplicationService
 * Reduces boilerplate in embedding-related endpoints
 */
export function withEmbeddingService<T, E = never, R = never>(
  serviceCall: (service: EmbeddingApplicationServiceType) => Effect.Effect<T, E, R>
): Effect.Effect<T, E, EmbeddingApplicationServiceType | R> {
  return Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* serviceCall(appService)
  })
}

/**
 * Helper for creating Effect programs with ModelManagerTag
 * Reduces boilerplate in model-related endpoints
 */
export function withModelManager<T, E = never, R = never>(
  serviceCall: (manager: ModelManager) => Effect.Effect<T, E, R>
): Effect.Effect<T, E, ModelManager | R> {
  return Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag
    return yield* serviceCall(modelManager)
  })
}

/**
 * Helper for creating Effect programs with UploadDirectoryRepository
 * Reduces boilerplate in upload directory endpoints
 */
export function withUploadDirectoryRepository<T, E, R>(
  repositoryCall: (repository: UploadDirectoryRepositoryType) => Effect.Effect<T, E, R>
): Effect.Effect<T, E, UploadDirectoryRepositoryType | R> {
  return Effect.gen(function* () {
    const repository = yield* UploadDirectoryRepository
    return yield* repositoryCall(repository)
  })
}

/**
 * Helper for creating Effect programs with FileSystemService
 * Reduces boilerplate in file system endpoints
 */
export function withFileSystemService<T, E, R>(
  serviceCall: (service: FileSystemServiceType) => Effect.Effect<T, E, R>
): Effect.Effect<T, E, FileSystemServiceType | R> {
  return Effect.gen(function* () {
    const service = yield* FileSystemService
    return yield* serviceCall(service)
  })
}

/**
 * Helper for handling conditional responses (e.g., 404 when resource not found)
 * Common pattern in GET and DELETE endpoints
 *
 * CRITICAL FIX: In test environment, uses shared runtime to ensure
 * the same in-memory database is used across all requests.
 */
export async function executeEffectHandlerWithConditional<T>(
  c: Context,
  operation: string,
  effectProgram: Effect.Effect<T | null, unknown, unknown>,
  notFoundMessage: string = "Resource not found"
): Promise<Response> {
  try {
    let result: T | null

    if (process.env["NODE_ENV"] === "test") {
      // Use shared runtime in test mode to maintain database state
      const runtime = await getTestRuntime()
      result = await Runtime.runPromise(runtime)(
        // @ts-expect-error - Effect.provide changes requirements to 'never'
        effectProgram
      )
    } else {
      // Normal execution for production/development
      result = await Effect.runPromise(
        // @ts-expect-error - Effect.provide changes requirements to 'never' but Effect.gen infers 'any'
        // This is a known limitation in Effect-TypeScript integration with generic functions
        effectProgram.pipe(Effect.provide(AppLayer))
      )
    }

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