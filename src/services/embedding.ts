import { eq } from "drizzle-orm"
import { db } from "../database/connection"
import { embeddings } from "../database/schema"
import type { CreateEmbeddingResponse } from "../types/embedding"
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
    text: string,
    modelName = "embeddinggemma:300m"
  ): Promise<CreateEmbeddingResponse> {
    // Generate embedding using Ollama
    const embedding = await this.ollamaService.generateEmbedding(
      text,
      modelName
    )

    // Convert embedding array to binary data for storage
    const embeddingBuffer = Buffer.from(JSON.stringify(embedding))

    try {
      // Insert or update embedding in database
      const result = await db
        .insert(embeddings)
        .values({
          filePath,
          modelName,
          embedding: embeddingBuffer,
        })
        .onConflictDoUpdate({
          target: embeddings.filePath,
          set: {
            modelName,
            embedding: embeddingBuffer,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning({ id: embeddings.id })

      return {
        id: result[0].id,
        file_path: filePath,
        model_name: modelName,
        message: "Embedding created successfully",
      }
    } catch (error) {
      console.error("Failed to save embedding to database:", error)
      throw new Error("Failed to save embedding to database")
    }
  }

  async getEmbedding(filePath: string): Promise<any | null> {
    try {
      const result = await db
        .select()
        .from(embeddings)
        .where(eq(embeddings.filePath, filePath))
        .limit(1)

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      const embeddingData = row.embedding as unknown as Uint8Array
      const embedding = JSON.parse(
        Buffer.from(embeddingData).toString()
      ) as number[]

      return {
        id: row.id,
        file_path: row.filePath,
        model_name: row.modelName,
        embedding,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      }
    } catch (error) {
      console.error("Failed to get embedding from database:", error)
      throw new Error("Failed to get embedding from database")
    }
  }

  async getAllEmbeddings(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(embeddings)
        .orderBy(embeddings.createdAt)

      return result.map((row) => {
        const embeddingData = row.embedding as unknown as Uint8Array
        const embedding = JSON.parse(
          Buffer.from(embeddingData).toString()
        ) as number[]

        return {
          id: row.id,
          file_path: row.filePath,
          model_name: row.modelName,
          embedding,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }
      })
    } catch (error) {
      console.error("Failed to get embeddings from database:", error)
      throw new Error("Failed to get embeddings from database")
    }
  }

  async deleteEmbedding(id: number): Promise<boolean> {
    try {
      const result = await db.delete(embeddings).where(eq(embeddings.id, id))

      return result.changes > 0
    } catch (error) {
      console.error("Failed to delete embedding from database:", error)
      throw new Error("Failed to delete embedding from database")
    }
  }
}
