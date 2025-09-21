import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import type {
  Embedding,
} from "@ees/core"
import { batchCreateEmbeddingRoute } from "@/features/batch-create-embedding"
import { createEmbeddingRoute } from "@/features/create-embedding"
import { deleteEmbeddingRoute } from "@/features/delete-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
} from "@/features/list-embeddings"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { EmbeddingApplicationService } from "@ees/core"
import { rootRoute } from "./config/routes"
import { AppLayer } from "./providers/main"

/**
 * EES (Embeddings API Service) - Main application
 *
 * A Hono-based REST API for managing text embeddings using multiple providers.
 * Supports creating, searching, listing, and deleting embeddings with OpenAPI documentation.
 */

console.log("Initializing Hono app...")
const app = new OpenAPIHono()

console.log("Setting up routes...")

/**
 * Root endpoint - Health check and service identification
 */
app.openapi(rootRoute, (c) => c.text("EES - Embeddings API Service" as never))

/**
 * Create embedding endpoint
 * Generates a new embedding for the provided text using the configured provider
 */
app.openapi(createEmbeddingRoute, async (c) => {
  try {
    const { uri, text, model_name } = c.req.valid("json")

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.createEmbedding({
        uri,
        text,
        modelName: model_name,
      })
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.catchAll((error) => {
          console.error("Detailed create embedding error:", error)
          return Effect.fail(new Error(`Failed to create embedding: ${error}`))
        }) as any,
        Effect.provide(AppLayer) as any
      )
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to create embedding:", error)
    return c.json({ error: "Failed to create embedding" }, 500)
  }
})

/**
 * Batch create embeddings endpoint
 * Processes multiple texts in a single request for efficient bulk embedding generation
 */
app.openapi(batchCreateEmbeddingRoute, async (c) => {
  try {
    const request = c.req.valid("json")

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.createBatchEmbeddings(request)
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.catchAll(() =>
          Effect.fail(new Error("Failed to create batch embeddings"))
        ) as any,
        Effect.provide(AppLayer) as any
      )
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to create batch embeddings:", error)
    return c.json({ error: "Failed to create batch embeddings" }, 500)
  }
})

/**
 * Search embeddings endpoint
 * Finds similar embeddings using vector similarity search with configurable metrics
 */
app.openapi(searchEmbeddingsRoute, async (c) => {
  try {
    const request = c.req.valid("json")

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.searchEmbeddings(request)
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.catchAll(() =>
          Effect.fail(new Error("Failed to search embeddings"))
        ) as any,
        Effect.provide(AppLayer) as any
      )
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to search embeddings:", error)
    return c.json({ error: "Failed to search embeddings" }, 500)
  }
})

/**
 * Get embedding by URI endpoint
 * Retrieves a specific embedding using its unique URI identifier
 */
app.openapi(getEmbeddingByUriRoute, async (c) => {
  try {
    const { uri } = c.req.valid("param")
    const decodedUri = decodeURIComponent(uri)

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.getEmbeddingByUri(decodedUri)
    })

    const embedding: Embedding | null = await Effect.runPromise(
      program.pipe(
        Effect.catchAll(() => Effect.succeed(null)) as any,
        Effect.provide(AppLayer) as any
      )
    )

    if (!embedding) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json(embedding, 200)
  } catch (error) {
    console.error("Failed to retrieve embedding:", error)
    return c.json({ error: "Failed to retrieve embedding" }, 500)
  }
})

/**
 * List embeddings endpoint
 * Returns paginated list of embeddings with optional filtering by URI and model
 */
app.openapi(listEmbeddingsRoute, async (c) => {
  try {
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

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer) as any)
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to retrieve embeddings:", error)
    return c.json({ error: "Failed to retrieve embeddings" }, 500)
  }
})

/**
 * Delete embedding endpoint
 * Removes an embedding from the database by its ID
 */
app.openapi(deleteEmbeddingRoute, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param")
    const id = Number(idStr)

    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid ID parameter" }, 400)
    }

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.deleteEmbedding(id)
    })

    const deleted = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer) as any)
    )

    if (!deleted) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json({ message: "Embedding deleted successfully" }, 200)
  } catch (error) {
    console.error("Failed to delete embedding:", error)
    return c.json({ error: "Failed to delete embedding" }, 500)
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
  ],
})

/**
 * Swagger UI endpoint
 * Interactive API documentation interface for testing and exploration
 */
app.get("/docs", swaggerUI({ url: "/openapi.json" }))


export default app
