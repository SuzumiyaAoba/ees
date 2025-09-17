import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import { EmbeddingService } from "../entities/embedding/api/embedding"
import { batchCreateEmbeddingRoute } from "../features/batch-create-embedding"
import { createEmbeddingRoute } from "../features/create-embedding"
import { deleteEmbeddingRoute } from "../features/delete-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
} from "../features/list-embeddings"
import { searchEmbeddingsRoute } from "../features/search-embeddings"
import { rootRoute } from "./config/routes"
import { AppLayer } from "./providers/main"

const app = new OpenAPIHono()

// Root endpoint
app.openapi(rootRoute, (c) => {
  return c.text("EES - Embeddings API Service") as any
})

// Create embedding
app.openapi(createEmbeddingRoute, async (c): Promise<any> => {
  try {
    const { uri, text, model_name } = c.req.valid("json")

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.createEmbedding(uri, text, model_name)
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((_error) => {
          return Effect.fail(new Error("Failed to create embedding"))
        })
      ) as any
    )

    return c.json(result as any)
  } catch (_error) {
    return c.json({ error: "Failed to create embedding" }, 500)
  }
})

// Batch create embeddings
app.openapi(batchCreateEmbeddingRoute, async (c): Promise<any> => {
  try {
    const request = c.req.valid("json")

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.createBatchEmbedding(request)
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((_error) => {
          return Effect.fail(new Error("Failed to create batch embeddings"))
        })
      ) as any
    )

    return c.json(result as any)
  } catch (_error) {
    return c.json({ error: "Failed to create batch embeddings" }, 500)
  }
})

// Search embeddings
app.openapi(searchEmbeddingsRoute, async (c): Promise<any> => {
  try {
    const request = c.req.valid("json")
    const searchRequest = {
      ...request,
      threshold: request.threshold ?? undefined,
    } as any

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.searchEmbeddings(searchRequest)
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((_error) => {
          return Effect.fail(new Error("Failed to search embeddings"))
        })
      ) as any
    )

    return c.json(result as any)
  } catch (_error) {
    return c.json({ error: "Failed to search embeddings" }, 500)
  }
})

// Get embedding by URI
app.openapi(getEmbeddingByUriRoute, async (c): Promise<any> => {
  try {
    const { uri } = c.req.valid("param")
    const decodedUri = decodeURIComponent(uri)

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.getEmbedding(decodedUri)
    })

    const embedding = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((_error) => {
          return Effect.succeed(null)
        })
      ) as any
    )

    if (!embedding) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json(embedding as any)
  } catch (_error) {
    return c.json({ error: "Failed to retrieve embedding" }, 500)
  }
})

// Get all embeddings
app.openapi(listEmbeddingsRoute, async (c): Promise<any> => {
  try {
    const { uri, model_name, page, limit } = c.req.valid("query")
    const filters: {
      uri?: string
      model_name?: string
      page?: number
      limit?: number
    } = {}

    if (uri) {
      filters.uri = uri
    }
    if (model_name) {
      filters.model_name = model_name
    }
    if (page) {
      filters.page = page
    }
    if (limit) {
      filters.limit = limit
    }

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.getAllEmbeddings(
        Object.keys(filters).length > 0 ? filters : undefined
      )
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer)) as any
    )

    return c.json(result as any)
  } catch (_error) {
    return c.json({ error: "Failed to retrieve embeddings" }, 500)
  }
})

// Delete embedding
app.openapi(deleteEmbeddingRoute, async (c): Promise<any> => {
  try {
    const { id: idStr } = c.req.valid("param")
    const id = Number(idStr)

    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid ID parameter" }, 400)
    }

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.deleteEmbedding(id)
    })

    const deleted = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer)) as any
    )

    if (!deleted) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json({ message: "Embedding deleted successfully" })
  } catch (_error) {
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

// Start server if this is the main module
if (require.main === module) {
  const port = Number(process.env["PORT"]) || 3000

  // Use Hono's serve method for Node.js
  const { serve } = require("@hono/node-server")
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      // Server callback
    }
  )
}

export default app
