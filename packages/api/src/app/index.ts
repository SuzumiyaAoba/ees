import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import type {
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingResponse,
} from "@ees/core"
import { batchCreateEmbeddingRoute } from "@/features/batch-create-embedding"
import { createEmbeddingRoute } from "@/features/create-embedding"
import { deleteEmbeddingRoute } from "@/features/delete-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
} from "@/features/list-embeddings"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { EmbeddingApplicationService, getPort } from "@ees/core"
import { rootRoute } from "./config/routes"
import { AppLayer } from "./providers/main"

console.log("Initializing Hono app...")
const app = new OpenAPIHono()

console.log("Setting up routes...")

// Root endpoint
app.openapi(rootRoute, (c) => c.text("EES - Embeddings API Service" as never))

// Create embedding
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
        }),
        Effect.provide(AppLayer)
      ) as unknown as Effect.Effect<CreateEmbeddingResponse, never, never>
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to create embedding:", error)
    return c.json({ error: "Failed to create embedding" }, 500)
  }
})

// Batch create embeddings
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
        ),
        Effect.provide(AppLayer)
      ) as unknown as Effect.Effect<BatchCreateEmbeddingResponse, never, never>
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to create batch embeddings:", error)
    return c.json({ error: "Failed to create batch embeddings" }, 500)
  }
})

// Search embeddings
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
        ),
        Effect.provide(AppLayer)
      ) as unknown as Effect.Effect<SearchEmbeddingResponse, never, never>
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to search embeddings:", error)
    return c.json({ error: "Failed to search embeddings" }, 500)
  }
})

// Get embedding by URI
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
        Effect.catchAll(() => Effect.succeed(null)),
        Effect.provide(AppLayer)
      ) as unknown as Effect.Effect<Embedding | null, never, never>
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

// Get all embeddings
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
    if (queryParams.uri) {
      filters.uri = uri
    }
    if (queryParams.model_name) {
      filters.modelName = model_name
    }

    const program = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService
      return yield* appService.listEmbeddings(filters)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer)) as unknown as Effect.Effect<
        EmbeddingsListResponse,
        never,
        never
      >
    )

    return c.json(result, 200)
  } catch (error) {
    console.error("Failed to retrieve embeddings:", error)
    return c.json({ error: "Failed to retrieve embeddings" }, 500)
  }
})

// Delete embedding
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
      program.pipe(Effect.provide(AppLayer)) as unknown as Effect.Effect<
        boolean,
        never,
        never
      >
    )

    if (!deleted) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json({ message: "Embedding deleted successfully" } as any, 200)
  } catch (error) {
    console.error("Failed to delete embedding:", error)
    return c.json({ error: "Failed to delete embedding" }, 500)
  }
})

// OpenAPI documentation endpoints
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

// Swagger UI
app.get("/docs", swaggerUI({ url: "/openapi.json" }))


export default app
