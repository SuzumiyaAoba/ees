/**
 * Repository pattern implementation for embedding data access
 * Separates database operations from business logic
 */

import { and, eq, type SQL, sql } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "@/shared/database/connection"
import { embeddings } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"
import { parseStoredEmbeddingData } from "@/entities/embedding/lib/embedding-data"
import type { Embedding } from "@/entities/embedding/model/embedding"

/**
 * SQL query constants for improved security and maintainability
 */
const EMBEDDING_QUERIES = {
  INSERT_OR_UPDATE: `
    INSERT INTO embeddings (uri, text, model_name, embedding)
    VALUES (?, ?, ?, vector(?))
    ON CONFLICT(uri) DO UPDATE SET
      text = excluded.text,
      model_name = excluded.model_name,
      embedding = excluded.embedding,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `,
  VECTOR_SEARCH_COSINE: `
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
  `,
  VECTOR_SEARCH_FALLBACK: `
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
  `,
} as const

/**
 * Result type for save operation
 */
export interface SaveEmbeddingResult {
  id: number
}

/**
 * Options for listing embeddings
 */
export interface ListEmbeddingsOptions {
  uri?: string
  model_name?: string
  page?: number
  limit?: number
}

/**
 * Result type for list operation with pagination
 */
export interface ListEmbeddingsResult {
  embeddings: Embedding[]
  count: number
  page: number
  limit: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Options for searching similar embeddings
 */
export interface SearchSimilarOptions {
  queryEmbedding: number[]
  modelName: string
  limit: number
  threshold?: number | undefined
  metric: "cosine" | "euclidean" | "dot_product"
}

/**
 * Raw result from vector search query
 */
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

/**
 * Result item from similarity search
 */
export interface SimilarEmbedding {
  id: number
  uri: string
  text: string
  model_name: string
  similarity: number
  created_at: string | null
  updated_at: string | null
}

/**
 * Repository interface for embedding data access
 * Provides clean separation between data access and business logic
 */
export interface EmbeddingRepository {
  /**
   * Save or update an embedding in the database
   * @param uri - Unique identifier for the embedding
   * @param text - Text content
   * @param modelName - Model name used to generate embedding
   * @param embedding - Embedding vector
   * @returns Effect containing the saved embedding's ID
   */
  readonly save: (
    uri: string,
    text: string,
    modelName: string,
    embedding: number[]
  ) => Effect.Effect<SaveEmbeddingResult, DatabaseQueryError>

  /**
   * Find an embedding by URI and model name
   * @param uri - Unique identifier
   * @param modelName - Model name
   * @returns Effect containing the embedding or null if not found
   */
  readonly findByUri: (
    uri: string,
    modelName: string
  ) => Effect.Effect<Embedding | null, DatabaseQueryError>

  /**
   * List all embeddings with optional filtering and pagination
   * @param options - Filtering and pagination options
   * @returns Effect containing paginated list of embeddings
   */
  readonly findAll: (
    options?: ListEmbeddingsOptions
  ) => Effect.Effect<ListEmbeddingsResult, DatabaseQueryError>

  /**
   * Delete an embedding by ID
   * @param id - Database ID of the embedding
   * @returns Effect containing boolean indicating success
   */
  readonly deleteById: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Search for similar embeddings using vector similarity
   * @param options - Search options with query embedding and parameters
   * @returns Effect containing array of similar embeddings
   */
  readonly searchSimilar: (
    options: SearchSimilarOptions
  ) => Effect.Effect<SimilarEmbedding[], DatabaseQueryError>
}

export const EmbeddingRepository = Context.GenericTag<EmbeddingRepository>(
  "EmbeddingRepository"
)

/**
 * Implementation of EmbeddingRepository
 */
const make = Effect.gen(function* () {
  const { db, client } = yield* DatabaseService

  const save = (
    uri: string,
    text: string,
    modelName: string,
    embedding: number[]
  ): Effect.Effect<SaveEmbeddingResult, DatabaseQueryError> =>
    Effect.gen(function* () {
      // Convert embedding array to libSQL F32_BLOB format using vector() function
      const embeddingVector = JSON.stringify(embedding)

      // Insert or update embedding in database using parameterized query
      const result = yield* Effect.tryPromise({
        try: async () => {
          const insertResult = await client.execute({
            sql: EMBEDDING_QUERIES.INSERT_OR_UPDATE,
            args: [uri, text, modelName, embeddingVector],
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
      }
    })

  const findByUri = (
    uri: string,
    modelName: string
  ): Effect.Effect<Embedding | null, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(embeddings)
            .where(
              and(eq(embeddings.uri, uri), eq(embeddings.modelName, modelName))
            )
            .limit(1),
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

  const findAll = (
    options?: ListEmbeddingsOptions
  ): Effect.Effect<ListEmbeddingsResult, DatabaseQueryError> =>
    Effect.gen(function* () {
      const page = options?.page ?? 1
      const limit = Math.min(options?.limit ?? 10, 100) // Max 100 items per page
      const offset = (page - 1) * limit

      // Build where conditions based on filters
      const whereConditions: SQL<unknown>[] = []
      if (options?.uri) {
        whereConditions.push(eq(embeddings.uri, options.uri))
      }
      if (options?.model_name) {
        whereConditions.push(eq(embeddings.modelName, options.model_name))
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

  const deleteById = (id: number): Effect.Effect<boolean, DatabaseQueryError> =>
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

  const searchSimilar = (
    options: SearchSimilarOptions
  ): Effect.Effect<SimilarEmbedding[], DatabaseQueryError> =>
    Effect.gen(function* () {
      const { queryEmbedding, modelName, limit, threshold, metric } = options

      // Use libSQL native vector search for efficient similarity search
      const queryVector = JSON.stringify(queryEmbedding)

      // Build the search query using libSQL vector functions with predefined constants
      let vectorSearchQuery: string

      if (metric === "cosine") {
        // Use cosine distance with vector_top_k for efficient search
        vectorSearchQuery = threshold
          ? EMBEDDING_QUERIES.VECTOR_SEARCH_COSINE +
            ` AND (1.0 - vector_distance_cos(e.embedding, vector(?))) >= ? ORDER BY similarity DESC`
          : EMBEDDING_QUERIES.VECTOR_SEARCH_COSINE +
            ` ORDER BY similarity DESC`
      } else {
        // Fallback to regular similarity search for other metrics
        vectorSearchQuery = EMBEDDING_QUERIES.VECTOR_SEARCH_FALLBACK
      }

      const searchResults = yield* Effect.tryPromise({
        try: async () => {
          // Execute raw SQL for vector search using libSQL client
          let args: (string | number)[]
          if (metric === "cosine") {
            args = threshold
              ? [
                  queryVector,
                  queryVector,
                  limit,
                  modelName,
                  queryVector,
                  threshold,
                ]
              : [queryVector, queryVector, limit, modelName]
          } else {
            args = [queryVector, modelName, limit]
          }

          const result = await client.execute({
            sql: vectorSearchQuery,
            args,
          })
          return result.rows as unknown as VectorSearchRowRaw[]
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

      return results
    })

  const repository = {
    save,
    findByUri,
    findAll,
    deleteById,
    searchSimilar,
  }

  return repository satisfies typeof EmbeddingRepository.Service
})

/**
 * Live layer for EmbeddingRepository
 */
export const EmbeddingRepositoryLive = Layer.effect(
  EmbeddingRepository,
  make
).pipe(Layer.provide(DatabaseServiceLive))
