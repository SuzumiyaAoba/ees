import { Hono } from "hono"
import { initializeDatabase } from "./database/connection"
import { CreateEmbeddingSchema } from "./schemas/embedding"
import { EmbeddingService } from "./services/embedding"

const app = new Hono()

// Initialize database on startup
initializeDatabase().catch(console.error)

const embeddingService = EmbeddingService.getInstance()

app.get("/", (c) => {
  return c.text("EES - Embeddings API Service")
})

app.post("/embeddings", async (c) => {
  try {
    const body = await c.req.json()
    const { file_path, text } = CreateEmbeddingSchema.parse(body)

    const result = await embeddingService.createEmbedding(file_path, text)
    return c.json(result)
  } catch (error) {
    console.error("Embedding creation error:", error)
    return c.json({ error: "Failed to create embedding" }, 500)
  }
})

app.get("/embeddings/:filePath", async (c) => {
  try {
    const filePath = c.req.param("filePath")
    const embedding = await embeddingService.getEmbedding(filePath)

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
    const embeddings = await embeddingService.getAllEmbeddings()
    return c.json({ embeddings, count: embeddings.length })
  } catch (error) {
    console.error("Embeddings retrieval error:", error)
    return c.json({ error: "Failed to retrieve embeddings" }, 500)
  }
})

app.delete("/embeddings/:filePath", async (c) => {
  try {
    const filePath = c.req.param("filePath")
    const deleted = await embeddingService.deleteEmbedding(filePath)

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
