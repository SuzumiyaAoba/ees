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
  ProviderConnectionError,
  type ProviderAuthenticationError,
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

/**
 * Multi-provider embedding service interface
 * Provides operations for creating, searching, and managing embeddings
 */
export interface EmbeddingService {
  /**
   * Create an embedding for the given text using the configured provider
   * @param uri - Unique identifier for the text content
   * @param text - Text content to generate embedding for
   * @param modelName - Optional model name to use (defaults to provider's default)
   * @returns Effect containing the embedding creation result
   */
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

  /**
   * Create multiple embeddings in a single batch operation
   * @param request - Batch request containing multiple texts to embed
   * @returns Effect containing batch processing results with success/failure counts
   */
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

  /**
   * Retrieve a specific embedding by its URI and model name
   * @param uri - Unique identifier for the embedding
   * @param modelName - Model name used to generate the embedding
   * @returns Effect containing the embedding data or null if not found
   */
  readonly getEmbedding: (
    uri: string,
    modelName: string
  ) => Effect.Effect<Embedding | null, DatabaseQueryError>

  /**
   * List all embeddings with optional filtering and pagination
   * @param filters - Optional filters for URI, model name, and pagination
   * @returns Effect containing paginated list of embeddings
   */
  readonly getAllEmbeddings: (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) => Effect.Effect<EmbeddingsListResponse, DatabaseQueryError>

  /**
   * Delete an embedding by its ID
   * @param id - Database ID of the embedding to delete
   * @returns Effect containing boolean indicating success
   */
  readonly deleteEmbedding: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Search for similar embeddings using vector similarity
   * @param request - Search request with query text and similarity parameters
   * @returns Effect containing search results ranked by similarity
   */
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

  /**
   * List all available embedding providers
   * @returns Effect containing array of provider names
   */
  readonly listProviders: () => Effect.Effect<string[], never>

  /**
   * Get the currently configured provider
   * @returns Effect containing the current provider name
   */
  readonly getCurrentProvider: () => Effect.Effect<string, never>

  /**
   * Get available models for a provider
   * @param providerType - Optional provider name (defaults to current provider)
   * @returns Effect containing array of available models
   */
  readonly getProviderModels: (
    providerType?: string
  ) => Effect.Effect<
    Array<{ name: string; provider: string; dimensions?: number | undefined }>,
    ProviderConnectionError | ProviderAuthenticationError
  >

  /**
   * Create an embedding using a specific provider
   * @param providerType - Name of the provider to use
   * @param uri - Unique identifier for the text content
   * @param text - Text content to generate embedding for
   * @param modelName - Optional model name to use
   * @returns Effect containing the embedding creation result
   */
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

      // Convert embedding array to libSQL F32_BLOB format using vector() function
      const embeddingVector = JSON.stringify(embeddingResponse.embedding)

      // Insert or update embedding in database using raw SQL with vector() function
      const result = yield* Effect.tryPromise({
        try: async () => {
          const insertResult = await client.execute({
            sql: `
              INSERT INTO embeddings (uri, text, model_name, embedding)
              VALUES (?, ?, ?, vector(?))
              ON CONFLICT(uri) DO UPDATE SET
                text = excluded.text,
                model_name = excluded.model_name,
                embedding = excluded.embedding,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id
            `,
            args: [uri, text, embeddingResponse.model, embeddingVector]
          })
          return insertResult.rows
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to save embedding to database",
            cause: error,
          }),
      })

      return {
        id: Number(result[0]?.["id"] ?? 0),
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

          // Convert embedding array to libSQL F32_BLOB format using vector() function
          const embeddingVector = JSON.stringify(embeddingResponse.embedding)

          // Insert or update embedding in database using raw SQL with vector() function
          const insertResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await client.execute({
                sql: `
                  INSERT INTO embeddings (uri, text, model_name, embedding)
                  VALUES (?, ?, ?, vector(?))
                  ON CONFLICT(uri) DO UPDATE SET
                    text = excluded.text,
                    model_name = excluded.model_name,
                    embedding = excluded.embedding,
                    updated_at = CURRENT_TIMESTAMP
                  RETURNING id
                `,
                args: [uri, text, embeddingResponse.model, embeddingVector]
              })
              return result.rows
            },
            catch: (error) =>
              new DatabaseQueryError({
                message: `Failed to save embedding for URI ${uri}`,
                cause: error,
              }),
          })

          return {
            id: Number(insertResult[0]?.["id"] ?? 0),
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

  const getEmbedding = (uri: string, modelName: string) =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db.select().from(embeddings).where(
            and(eq(embeddings.uri, uri), eq(embeddings.modelName, modelName))
          ).limit(1),
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
            (1.0 - vector_distance_cos(e.embedding, vector(?))) as similarity,
            e.created_at,
            e.updated_at
          FROM vector_top_k('idx_embeddings_vector', vector(?), ?) as v
          INNER JOIN embeddings as e ON v.id = e.rowid
          WHERE e.model_name = ?
          ${threshold ? `AND (1.0 - vector_distance_cos(e.embedding, vector(?))) >= ?` : ""}
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
            vector_distance_cos(embedding, vector(?)) as distance,
            created_at,
            updated_at
          FROM embeddings
          WHERE model_name = ?
          ORDER BY distance ASC
          LIMIT ?
        `
      }

      type VectorSearchRowRaw = {
        id: number | string | null
        uri: string | null
        text: string | null
        model_name: string | null
        similarity?: number | string | null
        distance?: number | string | null
        created_at?: string | null
        updated_at?: string | null
      }

      const searchResults = yield* Effect.tryPromise({
        try: async () => {
          // Execute raw SQL for vector search using libSQL client
          let args: (string | number)[]
          if (metric === "cosine") {
            args = threshold
              ? [queryVector, queryVector, limit, actualModelName, queryVector, threshold]
              : [queryVector, queryVector, limit, actualModelName]
          } else {
            args = [queryVector, actualModelName, limit]
          }

          const result = await client.execute({
            sql: vectorSearchQuery,
            args,
          })
          return result.rows as unknown as Array<VectorSearchRowRaw>
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to execute vector search query",
            cause: error,
          }),
      })

      // Transform results to expected format
      const results = searchResults
        .map((row) => ({
          id: Number(row["id"] ?? 0),
          uri: String(row["uri"] ?? ""),
          text: String(row["text"] ?? ""),
          model_name: String(row["model_name"] ?? ""),
          similarity:
            metric === "cosine"
              ? Number(row["similarity"] ?? 0)
              : 1.0 - Number(row["distance"] ?? 0),
          created_at: row["created_at"] ? String(row["created_at"]) : null,
          updated_at: row["updated_at"] ? String(row["updated_at"]) : null,
        }))
        .filter(
          (result) =>
            // Apply threshold filter if specified for non-cosine metrics
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
          new ProviderConnectionError({
            provider: currentProvider,
            message: `Provider switching from ${currentProvider} to ${providerType} not yet supported`,
            errorCode: "PROVIDER_SWITCH_NOT_SUPPORTED",
            cause: new Error(`Provider switching not implemented`),
          })
        )
      }

      // Use the regular createEmbedding method
      return yield* createEmbedding(uri, text, modelName)
    })

  const service = {
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
  }
  return service satisfies typeof EmbeddingService.Service
})

export const EmbeddingServiceLive = Layer.suspend(() => {
  // Ensure environment is properly read at layer creation time
  const defaultProvider = getDefaultProvider()
  const factoryConfig = {
    defaultProvider,
    availableProviders: [defaultProvider],
  }

  return Layer.effect(EmbeddingService, make).pipe(
    Layer.provide(DatabaseServiceLive),
    Layer.provideMerge(createEmbeddingProviderService(factoryConfig))
  )
})
