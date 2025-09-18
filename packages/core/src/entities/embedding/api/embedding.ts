/**
 * Multi-provider embedding service
 * Supports multiple providers (Ollama, OpenAI, Google AI) via Vercel AI SDK
 */

import { and, eq, type SQL, sql } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { getDefaultProvider } from "../../../shared/config/providers"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "../../../shared/database/connection"
import { embeddings } from "../../../shared/database/schema"
import { DatabaseQueryError } from "../../../shared/errors/database"
import {
  EmbeddingProviderService,
  type EmbeddingRequest,
  type ProviderAuthenticationError,
  type ProviderConnectionError,
  type ProviderModelError,
  type ProviderRateLimitError,
} from "../../../shared/providers"
import { createEmbeddingProviderService } from "../../../shared/providers/factory"
import { parseStoredEmbeddingData } from "../lib/embedding-data"
import type {
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
} from "../model/embedding"

export interface EmbeddingService {
  readonly createEmbedding: (
    uri: string,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    CreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

  readonly createBatchEmbedding: (
    request: BatchCreateEmbeddingRequest
  ) => Effect.Effect<
    BatchCreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
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

  readonly searchEmbeddings: (
    request: SearchEmbeddingRequest
  ) => Effect.Effect<
    SearchEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

  readonly listProviders: () => Effect.Effect<string[], never>

  readonly getCurrentProvider: () => Effect.Effect<string, never>

  readonly getProviderModels: (
    providerType?: string
  ) => Effect.Effect<
    Array<{ name: string; provider: string; dimensions?: number }>,
    ProviderConnectionError | ProviderAuthenticationError
  >

  readonly createEmbeddingWithProvider: (
    providerType: string,
    uri: string,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    CreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >
}

export const EmbeddingService =
  Context.GenericTag<EmbeddingService>("EmbeddingService")

// Similarity calculation helper functions
const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimension")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0
    const b = vecB[i] ?? 0
    dotProduct += a * b
    normA += a * a
    normB += b * b
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const calculateEuclideanDistance = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimension")
  }

  let sum = 0
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0
    const b = vecB[i] ?? 0
    const diff = a - b
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

const calculateDotProduct = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimension")
  }

  let dotProduct = 0
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0
    const b = vecB[i] ?? 0
    dotProduct += a * b
  }

  return dotProduct
}

// Note: _calculateSimilarity function was removed as it's unused
// Individual similarity functions are kept for potential future use

const make = Effect.gen(function* () {
  const { db, client } = yield* DatabaseService
  const providerService = yield* EmbeddingProviderService

  const createEmbedding = (uri: string, text: string, modelName?: string) =>
    Effect.gen(function* () {
      // Generate embedding using the current provider
      const embeddingRequest: EmbeddingRequest = {
        text,
        modelName,
      }
      const embeddingResponse =
        yield* providerService.generateEmbedding(embeddingRequest)

      // Convert embedding array to libSQL vector format
      // For libSQL vector search, we store embeddings as JSON string that can be converted with vector() function
      const embeddingData = JSON.stringify(embeddingResponse.embedding)

      // Insert or update embedding in database
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(embeddings)
            .values({
              uri,
              text,
              modelName: embeddingResponse.model,
              embedding: Buffer.from(embeddingData),
            })
            .onConflictDoUpdate({
              target: embeddings.uri,
              set: {
                text,
                modelName: embeddingResponse.model,
                embedding: Buffer.from(embeddingData),
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
        model_name: embeddingResponse.model,
        message: "Embedding created successfully",
      }
    })

  const createBatchEmbedding = (request: BatchCreateEmbeddingRequest) =>
    Effect.gen(function* () {
      const { texts, model_name } = request
      const results: BatchCreateEmbeddingResponse["results"] = []
      let successful = 0
      let failed = 0

      // Process each text individually
      for (const { uri, text } of texts) {
        // Try to create embedding, catch all errors at this level
        const result = yield* Effect.gen(function* () {
          // Generate embedding using the current provider
          const embeddingRequest: EmbeddingRequest = {
            text,
            modelName: model_name,
          }
          const embeddingResponse =
            yield* providerService.generateEmbedding(embeddingRequest)

          // Convert embedding array to libSQL vector format
          const embeddingData = JSON.stringify(embeddingResponse.embedding)

          // Insert or update embedding in database
          const insertResult = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(embeddings)
                .values({
                  uri,
                  text,
                  modelName: embeddingResponse.model,
                  embedding: Buffer.from(embeddingData),
                })
                .onConflictDoUpdate({
                  target: embeddings.uri,
                  set: {
                    text,
                    modelName: embeddingResponse.model,
                    embedding: Buffer.from(embeddingData),
                    updatedAt: new Date().toISOString(),
                  },
                })
                .returning({ id: embeddings.id }),
            catch: (error) =>
              new DatabaseQueryError({
                message: `Failed to save embedding for URI ${uri}`,
                cause: error,
              }),
          })

          return {
            id: insertResult[0]?.id ?? 0,
            uri,
            model_name: embeddingResponse.model,
            status: "success" as const,
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              id: 0,
              uri,
              model_name: model_name ?? "unknown",
              status: "error" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          )
        )

        results.push(result)

        if (result.status === "success") {
          successful++
        } else {
          failed++
        }
      }

      return {
        results,
        total: texts.length,
        successful,
        failed,
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

      const row = result[0]
      if (!row) {
        return null
      }

      const embedding = yield* parseStoredEmbeddingData(row.embedding).pipe(
        Effect.mapError(
          (error) =>
            new DatabaseQueryError({
              message: `Failed to parse embedding data for URI ${row.uri}`,
              cause: error,
            })
        )
      )

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
            const condition =
              whereConditions.length === 1
                ? whereConditions[0]
                : and(...whereConditions)
            if (condition) {
              countQuery = countQuery.where(condition) as typeof countQuery
            }
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
            const condition =
              whereConditions.length === 1
                ? whereConditions[0]
                : and(...whereConditions)
            if (condition) {
              query = query.where(condition) as typeof query
            }
          }

          return query.orderBy(embeddings.createdAt).limit(limit).offset(offset)
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get embeddings from database",
            cause: error,
          }),
      })

      const embeddingsData = yield* Effect.all(
        result.map((row) =>
          parseStoredEmbeddingData(row.embedding).pipe(
            Effect.map((embedding) => ({
              id: row.id,
              uri: row.uri,
              text: row.text,
              model_name: row.modelName,
              embedding,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })),
            Effect.mapError(
              (error) =>
                new DatabaseQueryError({
                  message: `Failed to parse embedding data for URI ${row.uri}`,
                  cause: error,
                })
            )
          )
        )
      )

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

  const searchEmbeddings = (request: SearchEmbeddingRequest) =>
    Effect.gen(function* () {
      const {
        query,
        model_name,
        limit = 10,
        threshold,
        metric = "cosine",
      } = request

      // Generate embedding for the query text using the current provider
      const embeddingRequest: EmbeddingRequest = {
        text: query,
        modelName: model_name,
      }
      const queryEmbeddingResponse =
        yield* providerService.generateEmbedding(embeddingRequest)
      const queryEmbedding = queryEmbeddingResponse.embedding
      const actualModelName = queryEmbeddingResponse.model

      // Use libSQL native vector search for efficient similarity search
      const queryVector = JSON.stringify(queryEmbedding)

      // Build the search query using libSQL vector functions
      let vectorSearchQuery: string

      if (metric === "cosine") {
        // Use cosine distance with vector_top_k for efficient search
        vectorSearchQuery = `
          SELECT
            e.id,
            e.uri,
            e.text,
            e.model_name,
            (1.0 - vector_distance_cos(e.embedding, vector('${queryVector}'))) as similarity,
            e.created_at,
            e.updated_at
          FROM vector_top_k('idx_embeddings_vector', vector('${queryVector}'), ${limit}) as v
          INNER JOIN embeddings as e ON v.id = e.rowid
          WHERE e.model_name = '${actualModelName}'
          ${threshold ? `AND (1.0 - vector_distance_cos(e.embedding, vector('${queryVector}'))) >= ${threshold}` : ""}
          ORDER BY similarity DESC
        `
      } else {
        // Fallback to regular similarity search for other metrics
        vectorSearchQuery = `
          SELECT
            id,
            uri,
            text,
            model_name,
            vector_distance_cos(embedding, vector('${queryVector}')) as distance,
            created_at,
            updated_at
          FROM embeddings
          WHERE model_name = '${actualModelName}'
          ORDER BY distance ASC
          LIMIT ${limit}
        `
      }

      const searchResults = yield* Effect.tryPromise({
        try: async () => {
          // Execute raw SQL for vector search using libSQL client
          const result = await client.execute({
            sql: vectorSearchQuery,
            args: [],
          })
          return result.rows
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to execute vector search query",
            cause: error,
          }),
      })

      // Transform results to expected format
      interface VectorSearchRow {
        id: unknown
        uri: unknown
        text: unknown
        model_name: unknown
        similarity?: unknown
        distance?: unknown
        created_at: unknown
        updated_at: unknown
      }

      const results = (searchResults as VectorSearchRow[])
        .map((row) => ({
          id: Number(row.id),
          uri: String(row.uri),
          text: String(row.text),
          model_name: String(row.model_name),
          similarity:
            metric === "cosine"
              ? Number(row.similarity)
              : 1.0 - Number(row.distance), // Convert distance to similarity
          created_at: row.created_at ? String(row.created_at) : null,
          updated_at: row.updated_at ? String(row.updated_at) : null,
        }))
        .filter(
          (result) =>
            // Apply threshold filter if specified
            !threshold || result.similarity >= threshold
        )

      return {
        results,
        query,
        model_name: actualModelName,
        metric,
        count: results.length,
        threshold,
      }
    })

  const listProviders = () => providerService.listAllProviders()

  const getCurrentProvider = () => providerService.getCurrentProvider()

  const getProviderModels = (providerType?: string) =>
    Effect.gen(function* () {
      if (providerType) {
        // Get models for specific provider
        const allModels = yield* providerService.listModels()
        return allModels.filter((model) => model.provider === providerType)
      }
      // Get models for current provider
      return yield* providerService.listModels()
    })

  const createEmbeddingWithProvider = (
    providerType: string,
    uri: string,
    text: string,
    modelName?: string
  ) =>
    Effect.gen(function* () {
      // For now, use the default provider since switching isn't implemented
      // This could be enhanced to support dynamic provider selection
      const currentProvider = yield* getCurrentProvider()
      if (currentProvider !== providerType) {
        return yield* Effect.fail(
          new Error(
            `Provider switching from ${currentProvider} to ${providerType} not yet supported`
          )
        )
      }

      // Use the regular createEmbedding method
      return yield* createEmbedding(uri, text, modelName)
    })

  return {
    createEmbedding,
    createBatchEmbedding,
    getEmbedding,
    getAllEmbeddings,
    deleteEmbedding,
    searchEmbeddings,
    listProviders,
    getCurrentProvider,
    getProviderModels,
    createEmbeddingWithProvider,
  } as const
})

export const EmbeddingServiceLive = Layer.effect(EmbeddingService, make).pipe(
  Layer.provide(DatabaseServiceLive),
  Layer.provideMerge(
    Layer.suspend(() => {
      const defaultProvider = getDefaultProvider()
      const factoryConfig = {
        defaultProvider,
        availableProviders: [defaultProvider],
      }
      return createEmbeddingProviderService(factoryConfig)
    })
  )
)
