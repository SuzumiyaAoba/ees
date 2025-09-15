import { eq } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { DatabaseService, DatabaseServiceLive } from "../database/connection"
import { embeddings } from "../database/schema"
import { DatabaseQueryError } from "../errors/database"
import type { OllamaModelError } from "../errors/ollama"
import type { CreateEmbeddingResponse } from "../types/embedding"
import { OllamaService, OllamaServiceLive } from "./ollama"

export interface EmbeddingService {
  readonly createEmbedding: (
    uri: string,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    CreateEmbeddingResponse,
    OllamaModelError | DatabaseQueryError
  >

  readonly getEmbedding: (
    uri: string
  ) => Effect.Effect<any | null, DatabaseQueryError>

  readonly getAllEmbeddings: () => Effect.Effect<any[], DatabaseQueryError>

  readonly deleteEmbedding: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>
}

export const EmbeddingService =
  Context.GenericTag<EmbeddingService>("EmbeddingService")

const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService
  const ollamaService = yield* OllamaService

  const createEmbedding = (
    uri: string,
    text: string,
    modelName = "embeddinggemma:300m"
  ) =>
    Effect.gen(function* () {
      // Generate embedding using Ollama
      const embedding = yield* ollamaService.generateEmbedding(text, modelName)

      // Convert embedding array to binary data for storage
      const embeddingBuffer = Buffer.from(JSON.stringify(embedding))

      // Insert or update embedding in database
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(embeddings)
            .values({
              uri,
              text,
              modelName,
              embedding: embeddingBuffer,
            })
            .onConflictDoUpdate({
              target: embeddings.uri,
              set: {
                text,
                modelName,
                embedding: embeddingBuffer,
                updatedAt: new Date().toISOString(),
              },
            })
            .returning({ id: embeddings.id }),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to save embedding to database",
            cause: error,
          }),
      })

      return {
        id: result[0]?.id,
        uri,
        model_name: modelName,
        message: "Embedding created successfully",
      }
    })

  const getEmbedding = (uri: string) =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db.select().from(embeddings).where(eq(embeddings.uri, uri)).limit(1),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get embedding from database",
            cause: error,
          }),
      })

      if (result.length === 0) {
        return null
      }

      const row = result[0]!
      const embeddingData = row.embedding as unknown as Uint8Array
      const embedding = JSON.parse(
        Buffer.from(embeddingData).toString()
      ) as number[]

      return {
        id: row.id,
        uri: row.uri,
        text: row.text,
        model_name: row.modelName,
        embedding,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      }
    })

  const getAllEmbeddings = () =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => db.select().from(embeddings).orderBy(embeddings.createdAt),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get embeddings from database",
            cause: error,
          }),
      })

      return result.map((row) => {
        const embeddingData = row.embedding as unknown as Uint8Array
        const embedding = JSON.parse(
          Buffer.from(embeddingData).toString()
        ) as number[]

        return {
          id: row.id,
          uri: row.uri,
          text: row.text,
          model_name: row.modelName,
          embedding,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }
      })
    })

  const deleteEmbedding = (id: number) =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => db.delete(embeddings).where(eq(embeddings.id, id)),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to delete embedding from database",
            cause: error,
          }),
      })

      return result.rowsAffected > 0
    })

  return {
    createEmbedding,
    getEmbedding,
    getAllEmbeddings,
    deleteEmbedding,
  } as const
})

export const EmbeddingServiceLive = Layer.effect(EmbeddingService, make).pipe(
  Layer.provide(OllamaServiceLive),
  Layer.provide(DatabaseServiceLive)
)
