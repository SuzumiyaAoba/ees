/**
 * Multi-provider embedding service
 * Supports multiple providers (Ollama, OpenAI, Google AI) via Vercel AI SDK
 */

import { and, eq, type SQL, sql } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { getDefaultProvider } from "@/shared/config/providers"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "@/shared/database/connection"
import { embeddings } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  EmbeddingProviderService,
  type EmbeddingRequest,
  type ProviderAuthenticationError,
  type ProviderConnectionError,
  type ProviderModelError,
  type ProviderRateLimitError,
} from "@/shared/providers"
import { createEmbeddingProviderService } from "@/shared/providers/factory"
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

const calculateSimilarity = (
  vecA: number[],
  vecB: number[],
  metric: "cosine" | "euclidean" | "dot_product"
): number => {
  switch (metric) {
    case "cosine":
      return calculateCosineSimilarity(vecA, vecB)
    case "euclidean": {
      // Convert distance to similarity (higher = more similar)
      const distance = calculateEuclideanDistance(vecA, vecB)
      return 1 / (1 + distance)
    }
    case "dot_product":
      return calculateDotProduct(vecA, vecB)
    default:
      throw new Error(`Unknown metric: ${metric}`)
  }
}

const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService
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

      // Convert embedding array to binary data for storage
      const embeddingBuffer = Buffer.from(
        JSON.stringify(embeddingResponse.embedding)
      )

      // Insert or update embedding in database
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(embeddings)
            .values({
              uri,
              text,
              modelName: embeddingResponse.model,
              embedding: embeddingBuffer,
            })
            .onConflictDoUpdate({
              target: embeddings.uri,
              set: {
                text,
                modelName: embeddingResponse.model,
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

          // Convert embedding array to binary data for storage
          const embeddingBuffer = Buffer.from(
            JSON.stringify(embeddingResponse.embedding)
          )

          // Insert or update embedding in database
          const insertResult = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(embeddings)
                .values({
                  uri,
                  text,
                  modelName: embeddingResponse.model,
                  embedding: embeddingBuffer,
                })
                .onConflictDoUpdate({
                  target: embeddings.uri,
                  set: {
                    text,
                    modelName: embeddingResponse.model,
                    embedding: embeddingBuffer,
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

      // Get all embeddings with the same model for comparison
      const allEmbeddings = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(embeddings)
            .where(eq(embeddings.modelName, actualModelName))
            .orderBy(embeddings.createdAt),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to retrieve embeddings for search",
            cause: error,
          }),
      })

      // Calculate similarities and find top N results efficiently
      const candidateResults: Array<{
        id: number
        uri: string
        text: string
        model_name: string
        similarity: number
        created_at: string | null
        updated_at: string | null
      }> = []

      // Process embeddings and use a min-heap approach for efficiency
      for (const row of allEmbeddings) {
        const storedEmbeddingResult = yield* parseStoredEmbeddingData(
          row.embedding
        ).pipe(Effect.either)

        if (storedEmbeddingResult._tag === "Left") {
          // Skip invalid embeddings, continue processing others
          continue
        }

        const storedEmbedding = storedEmbeddingResult.right

        try {
          const similarity = calculateSimilarity(
            queryEmbedding,
            storedEmbedding,
            metric
          )

          // Skip if doesn't meet threshold
          if (threshold && similarity < threshold) {
            continue
          }

          const result = {
            id: row.id,
            uri: row.uri,
            text: row.text,
            model_name: row.modelName,
            similarity,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          }

          // Efficient top-k selection: maintain sorted array of size limit
          if (candidateResults.length < limit) {
            candidateResults.push(result)
            // Sort only when we reach the limit for the first time
            if (candidateResults.length === limit) {
              candidateResults.sort((a, b) => b.similarity - a.similarity)
            }
          } else {
            const lastIndex = candidateResults.length - 1
            const lastResult = candidateResults[lastIndex]
            if (lastResult && similarity > lastResult.similarity) {
              // Only add if better than the worst in our top-k
              candidateResults[lastIndex] = result
              // Re-sort to maintain order (could be optimized with a proper heap)
              candidateResults.sort((a, b) => b.similarity - a.similarity)
            }
          }
        } catch (_error) {
          // Skip invalid similarity calculations
        }
      }

      // Final sort if we have less than limit results
      const results =
        candidateResults.length < limit
          ? candidateResults.sort((a, b) => b.similarity - a.similarity)
          : candidateResults

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
