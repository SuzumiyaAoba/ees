import { Effect, Runtime } from "effect"
import { Hono } from "hono"
import { AppLayer } from "./layers/main"
import { CreateEmbeddingSchema } from "./schemas/embedding"
import { EmbeddingService } from "./services/embedding-effect"

const app = new Hono()

// Create Effect runtime with our application layer
const runtime = Runtime.defaultRuntime.pipe(
  Runtime.setConfigProvider(Runtime.defaultConfigProvider)
)

app.get("/", (c) => {
  return c.text("EES - Embeddings API Service")
})

app.post("/embeddings", async (c) => {
  try {
    const body = await c.req.json()
    const { file_path, text, model_name } = CreateEmbeddingSchema.parse(body)

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.createEmbedding(
        file_path,
        text,
        model_name
      )
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((error) => {
          console.error("Embedding creation error:", error)
          return Effect.fail(new Error("Failed to create embedding"))
        })
      )
    )

    return c.json(result)
  } catch (error) {
    console.error("Embedding creation error:", error)
    return c.json({ error: "Failed to create embedding" }, 500)
  }
})

app.get("/embeddings/:filePath", async (c) => {
  try {
    const filePath = c.req.param("filePath")

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.getEmbedding(filePath)
    })

    const embedding = await Effect.runPromise(
      program.pipe(
        Effect.provide(AppLayer),
        Effect.catchAll((error) => {
          console.error("Embedding retrieval error:", error)
          return Effect.succeed(null)
        })
      )
    )

    if (!embedding) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json(embedding)
  } catch (error) {
    console.error("Embedding retrieval error:", error)
    return c.json({ error: "Failed to retrieve embedding" }, 500)
  }
})

app.get("/embeddings", async (c) => {
  try {
    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.getAllEmbeddings()
    })

    const embeddings = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer))
    )

    return c.json({ embeddings, count: embeddings.length })
  } catch (error) {
    console.error("Embeddings retrieval error:", error)
    return c.json({ error: "Failed to retrieve embeddings" }, 500)
  }
})

app.delete("/embeddings/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"))

    if (isNaN(id)) {
      return c.json({ error: "Invalid ID parameter" }, 400)
    }

    const program = Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService
      return yield* embeddingService.deleteEmbedding(id)
    })

    const deleted = await Effect.runPromise(
      program.pipe(Effect.provide(AppLayer))
    )

    if (!deleted) {
      return c.json({ error: "Embedding not found" }, 404)
    }

    return c.json({ message: "Embedding deleted successfully" })
  } catch (error) {
    console.error("Embedding deletion error:", error)
    return c.json({ error: "Failed to delete embedding" }, 500)
  }
})

export default app
