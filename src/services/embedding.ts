import { db } from "../database/connection"
import type { CreateEmbeddingResponse, Embedding } from "../types/embedding"
import { OllamaService } from "./ollama"

export class EmbeddingService {
  private static instance: EmbeddingService
  private ollamaService: OllamaService

  private constructor() {
    this.ollamaService = OllamaService.getInstance()
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  async createEmbedding(
    filePath: string,
    text: string
  ): Promise<CreateEmbeddingResponse> {
    // Generate embedding using Ollama
    const embedding = await this.ollamaService.generateEmbedding(text)

    // Convert embedding array to binary data for storage
    const embeddingBuffer = Buffer.from(JSON.stringify(embedding))

    try {
      // Insert or update embedding in database
      const result = await db.execute({
        sql: `
          INSERT INTO embeddings (file_path, embedding)
          VALUES (?, ?)
          ON CONFLICT(file_path) DO UPDATE SET
            embedding = excluded.embedding,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [filePath, embeddingBuffer],
      })

      return {
        id: Number(result.lastInsertRowid),
        file_path: filePath,
        message: "Embedding created successfully",
      }
    } catch (error) {
      console.error("Failed to save embedding to database:", error)
      throw new Error("Failed to save embedding to database")
    }
  }

  async getEmbedding(filePath: string): Promise<Embedding | null> {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM embeddings WHERE file_path = ?",
        args: [filePath],
      })

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      const embeddingData = row.embedding as unknown as Uint8Array
      const embedding = JSON.parse(
        Buffer.from(embeddingData).toString()
      ) as number[]

      return {
        id: Number(row.id),
        file_path: row.file_path as string,
        embedding,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }
    } catch (error) {
      console.error("Failed to get embedding from database:", error)
      throw new Error("Failed to get embedding from database")
    }
  }

  async getAllEmbeddings(): Promise<Embedding[]> {
    try {
      const result = await db.execute(
        "SELECT * FROM embeddings ORDER BY created_at DESC"
      )

      return result.rows.map((row) => {
        const embeddingData = row.embedding as unknown as Uint8Array
        const embedding = JSON.parse(
          Buffer.from(embeddingData).toString()
        ) as number[]

        return {
          id: Number(row.id),
          file_path: row.file_path as string,
          embedding,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        }
      })
    } catch (error) {
      console.error("Failed to get embeddings from database:", error)
      throw new Error("Failed to get embeddings from database")
    }
  }

  async deleteEmbedding(filePath: string): Promise<boolean> {
    try {
      const result = await db.execute({
        sql: "DELETE FROM embeddings WHERE file_path = ?",
        args: [filePath],
      })

      return result.rowsAffected > 0
    } catch (error) {
      console.error("Failed to delete embedding from database:", error)
      throw new Error("Failed to delete embedding from database")
    }
  }
}
