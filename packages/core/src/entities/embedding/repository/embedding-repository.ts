/**
 * Repository pattern implementation for embedding data access
 * Separates database operations from business logic
 */

import { and, eq, like, type SQL, sql } from "drizzle-orm"
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
    INSERT INTO embeddings (uri, text, model_name, embedding, original_content, converted_format)
    VALUES (?, ?, ?, vector(?), ?, ?)
    ON CONFLICT(uri) DO UPDATE SET
      text = excluded.text,
      model_name = excluded.model_name,
      embedding = excluded.embedding,
      original_content = excluded.original_content,
      converted_format = excluded.converted_format,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `,
  VECTOR_SEARCH_COSINE: `
    SELECT
      id,
      uri,
      text,
      model_name,
      (1.0 - vector_distance_cos(embedding, vector(?))) as similarity,
      created_at,
      updated_at
    FROM embeddings
    WHERE model_name = ? AND (1.0 - vector_distance_cos(embedding, vector(?))) >= ?
    ORDER BY similarity DESC
    LIMIT ?
  `,
  VECTOR_SEARCH_COSINE_NO_THRESHOLD: `
    SELECT
      id,
      uri,
      text,
      model_name,
      (1.0 - vector_distance_cos(embedding, vector(?))) as similarity,
      created_at,
      updated_at
    FROM embeddings
    WHERE model_name = ?
    ORDER BY similarity DESC
    LIMIT ?
  `,
  VECTOR_SEARCH_EUCLIDEAN: `
    SELECT
      id,
      uri,
      text,
      model_name,
      vector_distance_l2(embedding, vector(?)) as distance,
      created_at,
      updated_at
    FROM embeddings
    WHERE model_name = ?
    ORDER BY distance ASC
    LIMIT ?
  `,
  VECTOR_SEARCH_DOT_PRODUCT: `
    SELECT
      id,
      uri,
      text,
      model_name,
      embedding,
      created_at,
      updated_at
    FROM embeddings
    WHERE model_name = ?
    LIMIT 10000
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
  total: number
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
  embedding?: string | Uint8Array | null
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
   * @param originalContent - Optional original content before conversion
   * @param convertedFormat - Optional format after conversion (e.g., "markdown")
   * @returns Effect containing the saved embedding's ID
   */
  readonly save: (
    uri: string,
    text: string,
    modelName: string,
    embedding: number[],
    originalContent?: string,
    convertedFormat?: string
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
   * Delete all embeddings from the database
   * @returns Effect containing the number of embeddings deleted
   */
  readonly deleteAll: () => Effect.Effect<number, DatabaseQueryError>

  /**
   * Update an embedding by ID
   * @param id - Database ID of the embedding
   * @param text - New text content
   * @param embedding - New embedding vector
   * @param originalContent - Optional original content before conversion
   * @param convertedFormat - Optional format after conversion (e.g., "markdown")
   * @returns Effect containing boolean indicating success
   */
  readonly updateById: (
    id: number,
    text: string,
    embedding: number[],
    originalContent?: string,
    convertedFormat?: string
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
    embedding: number[],
    originalContent?: string,
    convertedFormat?: string
  ): Effect.Effect<SaveEmbeddingResult, DatabaseQueryError> =>
    Effect.gen(function* () {
      // Convert embedding array to libSQL F32_BLOB format using vector() function
      const embeddingVector = JSON.stringify(embedding)

      // Insert or update embedding in database using parameterized query
      const result = yield* Effect.tryPromise({
        try: async () => {
          const insertResult = await client.execute({
            sql: EMBEDDING_QUERIES.INSERT_OR_UPDATE,
            args: [uri, text, modelName, embeddingVector, originalContent ?? null, convertedFormat ?? null],
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
        original_content: row.originalContent,
        converted_format: row.convertedFormat,
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
        // Enable partial match search for URI using SQL LIKE with wildcards
        whereConditions.push(like(embeddings.uri, `%${options.uri}%`))
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
              original_content: row.originalContent,
              converted_format: row.convertedFormat,
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
        total: totalCount,
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

  const deleteAll = (): Effect.Effect<number, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => db.delete(embeddings),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to delete all embeddings from database",
            cause: error,
          }),
      })

      return result.rowsAffected
    })

  const updateById = (
    id: number,
    text: string,
    embedding: number[],
    originalContent?: string,
    convertedFormat?: string
  ): Effect.Effect<boolean, DatabaseQueryError> =>
    Effect.gen(function* () {
      const embeddingVector = JSON.stringify(embedding)

      const result = yield* Effect.tryPromise({
        try: async () => {
          const updateResult = await client.execute({
            sql: `
              UPDATE embeddings
              SET text = ?, embedding = vector(?), original_content = ?, converted_format = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [text, embeddingVector, originalContent ?? null, convertedFormat ?? null, id],
          })
          return updateResult.rowsAffected
        },
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to update embedding in database",
            cause: error,
          }),
      })

      return result > 0
    })

  const searchSimilar = (
    options: SearchSimilarOptions
  ): Effect.Effect<SimilarEmbedding[], DatabaseQueryError> =>
    Effect.gen(function* () {
      const { queryEmbedding, modelName, limit, threshold, metric } = options

      // Convert embedding vector to JSON string for libSQL vector functions
      // libSQL expects vectors in JSON array format for vector operations
      const queryVector = JSON.stringify(queryEmbedding)

      // Build the search query based on similarity metric
      // Different metrics require different libSQL vector functions and query structures
      let vectorSearchQuery: string

      if (metric === "cosine") {
        // Cosine similarity: measures angular distance between vectors (0 to 1)
        // Uses libSQL's native vector_distance_cos() for efficient computation
        // Formula: similarity = 1.0 - cosine_distance
        // Higher similarity = more similar (1.0 = identical, 0.0 = orthogonal)
        vectorSearchQuery = threshold
          // With threshold: filter results using WHERE clause
          ? EMBEDDING_QUERIES.VECTOR_SEARCH_COSINE
          // Without threshold: return top K most similar results
          : EMBEDDING_QUERIES.VECTOR_SEARCH_COSINE_NO_THRESHOLD
      } else if (metric === "euclidean") {
        // Euclidean distance (L2): measures straight-line distance between vectors
        // Uses libSQL's native vector_distance_l2() function
        // Lower distance = more similar (0 = identical vectors)
        // Threshold filtering is done in application layer after converting distance to similarity
        vectorSearchQuery = EMBEDDING_QUERIES.VECTOR_SEARCH_EUCLIDEAN
      } else {
        // Dot product: measures both angle and magnitude similarity
        // libSQL doesn't have native dot product function, so compute in application layer
        // Retrieves all embeddings and calculates dot product similarity in memory
        vectorSearchQuery = EMBEDDING_QUERIES.VECTOR_SEARCH_DOT_PRODUCT
      }

      const searchResults = yield* Effect.tryPromise({
        try: async () => {
          // Build query parameters array based on metric and threshold
          // Parameter order must match placeholders (?) in the SQL query
          let args: (string | number)[]

          if (metric === "cosine") {
            args = threshold
              // With threshold: [queryVector, modelName, queryVector, threshold, limit]
              // First queryVector: for similarity calculation in SELECT
              // modelName: filter by model
              // Second queryVector: for similarity comparison in WHERE clause
              // threshold: minimum similarity value
              // limit: maximum number of results
              ? [queryVector, modelName, queryVector, threshold, limit]
              // Without threshold: [queryVector, modelName, limit]
              // Simpler query without threshold filtering
              : [queryVector, modelName, limit]
          } else if (metric === "euclidean") {
            // Euclidean: [queryVector, modelName, limit]
            // Threshold filtering is done in application layer after similarity conversion
            args = [queryVector, modelName, limit]
          } else {
            // Dot product: [modelName] only
            // Retrieves all embeddings for in-memory calculation
            args = [modelName]
          }

          // Execute the vector search query using libSQL client
          // Using raw SQL execute for better control over vector operations
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

      // Transform raw database rows into typed SimilarEmbedding objects
      // Handles type conversion and similarity score normalization
      let results: SimilarEmbedding[]

      if (metric === "dot_product") {
        // Dot product calculation in application layer
        // libSQL doesn't provide native dot product distance function
        const parsedResults = yield* Effect.all(
          searchResults.map((row) =>
            Effect.gen(function* () {
              // Parse the embedding from database storage format
              // Handles both F32_BLOB (ArrayBuffer/Uint8Array) and legacy JSON string formats
              const embeddingData = row["embedding"]
              const embedding = yield* parseStoredEmbeddingData(embeddingData)

              // Calculate dot product: sum of element-wise multiplication
              // Dot product measures both angle and magnitude similarity
              const dotProduct = queryEmbedding.reduce(
                (sum, val, idx) => sum + val * (embedding[idx] ?? 0),
                0
              )

              return {
                id: Number(row["id"] ?? 0),
                uri: String(row["uri"] ?? ""),
                text: String(row["text"] ?? ""),
                model_name: String(row["model_name"] ?? ""),
                // Dot product as similarity: higher values = more similar
                // Note: Only valid for normalized vectors
                similarity: dotProduct,
                created_at: row["created_at"] ? String(row["created_at"]) : null,
                updated_at: row["updated_at"] ? String(row["updated_at"]) : null,
              }
            }).pipe(
              Effect.catchAll(() => Effect.succeed(null))
            )
          )
        )

        results = parsedResults
          .filter((result): result is SimilarEmbedding => result !== null)
          .filter((result) => !threshold || result.similarity >= threshold)
          // Sort by similarity descending (higher dot product = more similar)
          .sort((a, b) => b.similarity - a.similarity)
          // Take top K results
          .slice(0, limit)
      } else {
        // Cosine and Euclidean: use pre-calculated values from SQL
        results = searchResults
          .map((row) => ({
            id: Number(row["id"] ?? 0),
            uri: String(row["uri"] ?? ""),
            text: String(row["text"] ?? ""),
            model_name: String(row["model_name"] ?? ""),
            // Similarity score calculation varies by metric:
            // - Cosine: pre-calculated in SQL (0-1 range, higher = more similar)
            // - Euclidean: convert distance to similarity (lower distance = higher similarity)
            //   For Euclidean, we invert: similarity = 1 / (1 + distance)
            //   This ensures 0 distance = 1.0 similarity, and larger distances approach 0
            similarity:
              metric === "cosine"
                ? Number(row["similarity"] ?? 0)
                : 1.0 / (1.0 + Number(row["distance"] ?? 0)),
            created_at: row["created_at"] ? String(row["created_at"]) : null,
            updated_at: row["updated_at"] ? String(row["updated_at"]) : null,
          }))
          .filter(
            (result) =>
              // Apply threshold filter for Euclidean if not filtered in SQL
              // Cosine metric already filters in SQL for better performance
              !threshold || result.similarity >= threshold
          )
      }

      return results
    })

  const repository = {
    save,
    findByUri,
    findAll,
    deleteById,
    deleteAll,
    updateById,
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
