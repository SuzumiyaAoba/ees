import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect, Exit } from "effect"
import type { Context } from "hono"
import { batchCreateEmbeddingRoute } from "@/features/batch-create-embedding"
import { createEmbeddingRoute } from "@/features/create-embedding"
import { deleteEmbeddingRoute } from "@/features/delete-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
} from "@/features/list-embeddings"
import { listModelsRoute } from "@/features/list-models"
import { migrationApp } from "@/features/migrate-embeddings"
import { providerApp } from "@/features/provider-management"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { uploadApp } from "@/features/upload-embeddings"
import { EmbeddingApplicationService, ModelManagerTag } from "@ees/core"
import { rootRoute } from "./config/routes"
import { AppLayer } from "./providers/main"

/**
 * Helper function to map Effect errors to appropriate HTTP status codes
 */
function handleEffectError(c: Context, cause: unknown, operation: string) {
  console.error(`Effect error in ${operation}:`, cause)

  const causeString = String(cause)
  if (causeString.includes("ValidationError") || causeString.includes("required") || causeString.includes("invalid")) {
    return c.json({ error: "Validation error", details: causeString }, 400)
  }
  if (causeString.includes("NotFound") || causeString.includes("not found")) {
    return c.json({ error: "Resource not found", details: causeString }, 404)
  }
  if (causeString.includes("Unauthorized") || causeString.includes("authentication")) {
    return c.json({ error: "Unauthorized", details: causeString }, 401)
  }
  if (causeString.includes("RateLimit") || causeString.includes("rate limit")) {
    return c.json({ error: "Rate limit exceeded", details: causeString }, 429)
  }

  return c.json({ error: "Internal server error", details: causeString }, 500)
}

/**
 * EES (Embeddings API Service) - Main application
 *
 * A Hono-based REST API for managing text embeddings using multiple providers.
 * Supports creating, searching, listing, and deleting embeddings with OpenAPI documentation.
 */

console.log("Initializing Hono app...")
const app = new OpenAPIHono()

console.log("Setting up error handling...")

// Global error handling middleware
app.onError((err, c) => {
  console.error("Global error handler:", err)

  // Handle validation errors (usually from Zod/OpenAPI validation)
  if (err.message.includes("validation") || err.message.includes("required") || err.message.includes("invalid")) {
    return c.json({ error: "Validation error", details: err.message }, 400)
  }

  // Handle JSON parsing errors
  if (err.message.includes("JSON") || err.message.includes("parse") || err.name === "SyntaxError") {
    return c.json({ error: "Malformed JSON in request body", details: err.message }, 400)
  }

  // Handle not found errors
  if (err.message.includes("not found") || err.message.includes("Not Found")) {
    return c.json({ error: "Resource not found", details: err.message }, 404)
  }

  // Default to 500 for unhandled errors
  return c.json({ error: "Internal server error", details: err.message }, 500)
})

console.log("Setting up routes...")

/**
 * Root endpoint - Health check and service identification
 */
app.openapi(rootRoute, (c) => c.text("EES - Embeddings API Service" as never))

/**
 * Migration routes - Model migration and compatibility
 */
app.route("/", migrationApp)

/**
 * Upload routes - File upload and processing
 */
app.route("/", uploadApp)

/**
 * Provider management routes - Provider status and model discovery
 */
app.route("/", providerApp)

/**
 * Create embedding endpoint
 * Generates a new embedding for the provided text using the configured provider
 */
app.openapi(createEmbeddingRoute, async (c) => {
  const { uri, text, model_name } = c.req.valid("json")

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.createEmbedding({
      uri,
      text,
      modelName: model_name,
    })
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200)
  } else {
    return handleEffectError(c, exit.cause, "createEmbedding")
  }
})

/**
 * Batch create embeddings endpoint
 * Processes multiple texts in a single request for efficient bulk embedding generation
 */
app.openapi(batchCreateEmbeddingRoute, async (c) => {
  const request = c.req.valid("json")

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.createBatchEmbeddings(request)
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200)
  } else {
    return handleEffectError(c, exit.cause, "batchCreateEmbedding")
  }
})

/**
 * Search embeddings endpoint
 * Finds similar embeddings using vector similarity search with configurable metrics
 */
app.openapi(searchEmbeddingsRoute, async (c) => {
  const request = c.req.valid("json")

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.searchEmbeddings(request)
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200)
  } else {
    return handleEffectError(c, exit.cause, "searchEmbeddings")
  }
})

/**
 * Get embedding by URI endpoint
 * Retrieves a specific embedding using its unique URI identifier
 */
app.openapi(getEmbeddingByUriRoute, async (c) => {
  const { uri } = c.req.valid("param")
  const decodedUri = decodeURIComponent(uri)

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.getEmbeddingByUri(decodedUri)
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    const embedding = exit.value
    if (!embedding) {
      return c.json({ error: "Embedding not found" }, 404)
    }
    return c.json(embedding, 200)
  } else {
    // For getByUri, treat most errors as "not found"
    const causeString = String(exit.cause)
    if (causeString.includes("NotFound") || causeString.includes("not found")) {
      return c.json({ error: "Embedding not found" }, 404)
    }
    return handleEffectError(c, exit.cause, "getEmbeddingByUri")
  }
})

/**
 * List embeddings endpoint
 * Returns paginated list of embeddings with optional filtering by URI and model
 */
app.openapi(listEmbeddingsRoute, async (c) => {
  const { uri, model_name, page, limit } = c.req.valid("query")

  // Build filters object, always include page and limit for pagination
  const filters: {
    uri?: string
    modelName?: string
    page: number
    limit: number
  } = {
    page: page || 1,
    limit: limit || 10,
  }

  // Only add optional filters if they were explicitly provided
  const queryParams = c.req.query()
  if (queryParams["uri"] && uri) {
    filters.uri = uri
  }
  if (queryParams["model_name"] && model_name) {
    filters.modelName = model_name
  }

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.listEmbeddings(filters)
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200)
  } else {
    return handleEffectError(c, exit.cause, "listEmbeddings")
  }
})

/**
 * Delete embedding endpoint
 * Removes an embedding from the database by its ID
 */
app.openapi(deleteEmbeddingRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const id = Number(idStr)

  if (Number.isNaN(id)) {
    return c.json({ error: "Invalid ID parameter" }, 400)
  }

  const program = Effect.gen(function* () {
    const appService = yield* EmbeddingApplicationService
    return yield* appService.deleteEmbedding(id)
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    const deleted = exit.value
    if (!deleted) {
      return c.json({ error: "Embedding not found" }, 404)
    }
    return c.json({ message: "Embedding deleted successfully" }, 200)
  } else {
    // For delete, treat most errors as "not found"
    const causeString = String(exit.cause)
    if (causeString.includes("NotFound") || causeString.includes("not found")) {
      return c.json({ error: "Embedding not found" }, 404)
    }
    return handleEffectError(c, exit.cause, "deleteEmbedding")
  }
})

/**
 * List available models endpoint
 * Returns all models available through configured providers including environment variables and Ollama response
 */
app.openapi(listModelsRoute, async (c) => {
  const program = Effect.gen(function* () {
    const modelManager = yield* ModelManagerTag
    const models = yield* modelManager.listAvailableModels()

    // Extract unique providers from models
    const providers = Array.from(new Set(models.map((model: { provider: string }) => model.provider)))

    return {
      models,
      count: models.length,
      providers
    }
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200)
  } else {
    return handleEffectError(c, exit.cause, "listModels")
  }
})

/**
 * OpenAPI specification endpoint
 * Provides machine-readable API documentation in OpenAPI 3.0 format
 */
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "EES - Embeddings API Service",
    description:
      "API for generating, storing, and retrieving text embeddings using Ollama models",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check endpoints",
    },
    {
      name: "Embeddings",
      description: "Embedding generation and management endpoints",
    },
    {
      name: "Models",
      description: "Model information and availability endpoints",
    },
    {
      name: "Providers",
      description: "Provider management and status endpoints",
    },
  ],
})

/**
 * Swagger UI endpoint
 * Interactive API documentation interface for testing and exploration
 */
app.get("/docs", swaggerUI({ url: "/openapi.json" }))


export default app
