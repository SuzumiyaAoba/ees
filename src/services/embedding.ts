import { and, eq, type SQL, sql } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { DatabaseService, DatabaseServiceLive } from "../database/connection"
import { embeddings } from "../database/schema"
import { DatabaseQueryError } from "../errors/database"
import type { OllamaModelError } from "../errors/ollama"
import type {
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
} from "../types/embedding"
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
  ) => Effect.Effect<Embedding | null, DatabaseQueryError>

  readonly getAllEmbeddings: (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) => Effect.Effect<EmbeddingsListResponse, DatabaseQueryError>

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
        id: result[0]?.id ?? 0,
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

  const getAllEmbeddings = (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) =>
    Effect.gen(function* () {
      const page = filters?.page ?? 1
      const limit = Math.min(filters?.limit ?? 10, 100) // Max 100 items per page
      const offset = (page - 1) * limit

      // Build where conditions based on filters
      const whereConditions: SQL<unknown>[] = []
      if (filters?.uri) {
        whereConditions.push(eq(embeddings.uri, filters.uri))
      }
      if (filters?.model_name) {
        whereConditions.push(eq(embeddings.modelName, filters.model_name))
      }

      // Get total count for pagination
      const totalCountResult = yield* Effect.tryPromise({
        try: () => {
          let countQuery = db
            .select({ count: sql<number>`count(*)` })
            .from(embeddings)

          if (whereConditions.length > 0) {
            countQuery = countQuery.where(
              whereConditions.length === 1
                ? whereConditions[0]!
                : and(...whereConditions)
            )
          }

          return countQuery
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to count embeddings from database",
            cause: error,
          }),
      })

      const totalCount = totalCountResult[0]?.count ?? 0

      // Get paginated results
      const result = yield* Effect.tryPromise({
        try: () => {
          let query = db.select().from(embeddings)

          if (whereConditions.length > 0) {
            query = query.where(
              whereConditions.length === 1
                ? whereConditions[0]!
                : and(...whereConditions)
            )
          }

          return query.orderBy(embeddings.createdAt).limit(limit).offset(offset)
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get embeddings from database",
            cause: error,
          }),
      })

      const embeddingsData = result.map((row) => {
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

      const totalPages = Math.ceil(totalCount / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      return {
        embeddings: embeddingsData,
        count: embeddingsData.length,
        page,
        limit,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev,
      }
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
