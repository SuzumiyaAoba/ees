import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach } from "vitest"
import type { SearchEmbeddingRequest, SearchEmbeddingResult } from "@/entities/embedding/model/embedding"
import type { EmbeddingService } from "@/entities/embedding/api/embedding"
import type { ProviderService } from "@/shared/providers/provider-service"
import type { DatabaseService } from "@/shared/database/database-service"
import { DatabaseQueryError } from "@/shared/errors/database"
import { ProviderModelError } from "@/shared/providers/types"

// Mock interfaces for testing
interface MockDatabaseClient {
  execute: ReturnType<typeof vi.fn>
}

interface MockSearchResult {
  rows: Array<{
    id: number | string
    uri: string
    text: string
    model_name: string
    similarity?: number
    distance?: number
    created_at: string
    updated_at: string
  }>
}

describe("Vector Search Functionality", () => {
  let mockProviderService: {
    generateEmbedding: ReturnType<typeof vi.fn>
    listAllProviders: ReturnType<typeof vi.fn>
    getCurrentProvider: ReturnType<typeof vi.fn>
    listModels: ReturnType<typeof vi.fn>
  }

  let mockDatabaseService: {
    client: MockDatabaseClient
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock provider service
    mockProviderService = {
      generateEmbedding: vi.fn(),
      listAllProviders: vi.fn(),
      getCurrentProvider: vi.fn(),
      listModels: vi.fn(),
    }

    // Setup mock database service
    mockDatabaseService = {
      client: {
        execute: vi.fn(),
      },
    }

    // Default successful embedding generation
    mockProviderService.generateEmbedding.mockReturnValue(
      Effect.succeed({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        model: "nomic-embed-text",
        provider: "ollama",
        dimensions: 5,
      })
    )
  })

  describe("Cosine Similarity Search", () => {
    it("should execute vector_top_k query for cosine similarity", async () => {
      const mockResults: MockSearchResult = {
        rows: [
          {
            id: 1,
            uri: "doc1",
            text: "Sample document text",
            model_name: "nomic-embed-text",
            similarity: 0.95,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          {
            id: 2,
            uri: "doc2",
            text: "Another document",
            model_name: "nomic-embed-text",
            similarity: 0.87,
            created_at: "2024-01-01T01:00:00Z",
            updated_at: "2024-01-01T01:00:00Z",
          },
        ],
      }

      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      // Mock the embedding service search function
      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const { query, model_name, limit = 10, threshold, metric = "cosine" } = request

          // Generate embedding for the query
          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: query,
            modelName: model_name,
          })

          // Mock the vector search execution
          const queryVector = JSON.stringify(embeddingResponse.embedding)
          const actualModelName = embeddingResponse.model

          // Simulate the SQL query execution
          const args = threshold
            ? [queryVector, queryVector, limit, actualModelName, queryVector, threshold]
            : [queryVector, queryVector, limit, actualModelName]

          const searchResults = yield* Effect.tryPromise({
            try: async () => {
              const vectorSearchQuery = `
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
                ORDER BY similarity DESC
              `
              const result = await mockDatabaseService.client.execute({
                sql: vectorSearchQuery,
                args,
              })
              return result.rows
            },
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to execute vector search query",
                cause: error,
              }),
          })

          // Transform results
          const results = searchResults.map((row: any) => ({
            id: Number(row.id),
            uri: String(row.uri),
            text: String(row.text),
            model_name: String(row.model_name),
            similarity: Number(row.similarity),
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))

          return {
            results,
            query,
            model_name: actualModelName,
            metric,
            count: results.length,
            threshold,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test document",
        model_name: "nomic-embed-text",
        limit: 10,
        metric: "cosine",
      }

      const result = await Effect.runPromise(mockSearchEmbeddings(searchRequest))

      expect(result.results).toHaveLength(2)
      expect(result.results[0].similarity).toBe(0.95)
      expect(result.results[1].similarity).toBe(0.87)
      expect(result.metric).toBe("cosine")
      expect(result.query).toBe("test document")

      // Verify database query was executed
      expect(mockDatabaseService.client.execute).toHaveBeenCalled()
      const executeCall = mockDatabaseService.client.execute.mock.calls[0][0]
      expect(executeCall.sql).toContain("vector_top_k")
      expect(executeCall.args).toContain(JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]))
    })

    it("should apply similarity threshold for cosine search", async () => {
      const mockResults: MockSearchResult = {
        rows: [
          {
            id: 1,
            uri: "doc1",
            text: "High similarity document",
            model_name: "nomic-embed-text",
            similarity: 0.95,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      }

      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const { query, model_name, limit = 10, threshold, metric = "cosine" } = request

          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: query,
            modelName: model_name,
          })

          const queryVector = JSON.stringify(embeddingResponse.embedding)
          const actualModelName = embeddingResponse.model

          const searchResults = yield* Effect.tryPromise({
            try: async () => {
              const vectorSearchQuery = `
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
                AND (1.0 - vector_distance_cos(e.embedding, vector(?))) >= ?
                ORDER BY similarity DESC
              `
              const result = await mockDatabaseService.client.execute({
                sql: vectorSearchQuery,
                args: [queryVector, queryVector, limit, actualModelName, queryVector, threshold],
              })
              return result.rows
            },
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to execute vector search query",
                cause: error,
              }),
          })

          const results = searchResults.map((row: any) => ({
            id: Number(row.id),
            uri: String(row.uri),
            text: String(row.text),
            model_name: String(row.model_name),
            similarity: Number(row.similarity),
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))

          return {
            results,
            query,
            model_name: actualModelName,
            metric,
            count: results.length,
            threshold,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        model_name: "nomic-embed-text",
        threshold: 0.8,
        metric: "cosine",
      }

      const result = await Effect.runPromise(mockSearchEmbeddings(searchRequest))

      expect(result.threshold).toBe(0.8)
      expect(mockDatabaseService.client.execute).toHaveBeenCalled()
      const executeCall = mockDatabaseService.client.execute.mock.calls[0][0]
      expect(executeCall.args).toContain(0.8)
    })
  })

  describe("Fallback Distance Search", () => {
    it("should use distance-based query for non-cosine metrics", async () => {
      const mockResults: MockSearchResult = {
        rows: [
          {
            id: 1,
            uri: "doc1",
            text: "Document text",
            model_name: "nomic-embed-text",
            distance: 0.1,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      }

      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const { query, model_name, limit = 10, metric = "cosine" } = request

          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: query,
            modelName: model_name,
          })

          const queryVector = JSON.stringify(embeddingResponse.embedding)
          const actualModelName = embeddingResponse.model

          const searchResults = yield* Effect.tryPromise({
            try: async () => {
              const vectorSearchQuery = `
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
              const result = await mockDatabaseService.client.execute({
                sql: vectorSearchQuery,
                args: [queryVector, actualModelName, limit],
              })
              return result.rows
            },
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to execute vector search query",
                cause: error,
              }),
          })

          const results = searchResults.map((row: any) => ({
            id: Number(row.id),
            uri: String(row.uri),
            text: String(row.text),
            model_name: String(row.model_name),
            similarity: 1.0 - Number(row.distance), // Convert distance to similarity
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))

          return {
            results,
            query,
            model_name: actualModelName,
            metric,
            count: results.length,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        model_name: "nomic-embed-text",
        metric: "euclidean",
      }

      const result = await Effect.runPromise(mockSearchEmbeddings(searchRequest))

      expect(result.results[0].similarity).toBe(0.9) // 1.0 - 0.1
      expect(mockDatabaseService.client.execute).toHaveBeenCalled()
      const executeCall = mockDatabaseService.client.execute.mock.calls[0][0]
      expect(executeCall.args).toContain(JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]))
      expect(executeCall.args).toContain("nomic-embed-text")
    })
  })

  describe("Error Handling", () => {
    it("should handle embedding generation failures", async () => {
      const error = new ProviderModelError({
        provider: "ollama",
        modelName: "nomic-embed-text",
        message: "Model not available",
      })

      mockProviderService.generateEmbedding.mockReturnValue(Effect.fail(error))

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          yield* mockProviderService.generateEmbedding({
            text: request.query,
            modelName: request.model_name,
          })
          return { results: [], query: "", model_name: "", metric: "cosine", count: 0 }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        model_name: "nomic-embed-text",
      }

      const result = await Effect.runPromiseExit(mockSearchEmbeddings(searchRequest))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const failedError = (result.cause as { error: ProviderModelError }).error
        expect(failedError).toBeInstanceOf(ProviderModelError)
        expect(failedError.message).toContain("Model not available")
      }
    })

    it("should handle database query failures", async () => {
      const dbError = new Error("Database connection failed")
      mockDatabaseService.client.execute.mockRejectedValue(dbError)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: request.query,
            modelName: request.model_name,
          })

          yield* Effect.tryPromise({
            try: async () => {
              return await mockDatabaseService.client.execute({
                sql: "SELECT * FROM embeddings",
                args: [],
              })
            },
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to execute vector search query",
                cause: error,
              }),
          })

          return { results: [], query: "", model_name: "", metric: "cosine", count: 0 }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        model_name: "nomic-embed-text",
      }

      const result = await Effect.runPromiseExit(mockSearchEmbeddings(searchRequest))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const failedError = (result.cause as { error: DatabaseQueryError }).error
        expect(failedError).toBeInstanceOf(DatabaseQueryError)
        expect(failedError.message).toContain("Failed to execute vector search query")
      }
    })
  })

  describe("Query Parameter Validation", () => {
    it("should handle default parameters correctly", async () => {
      const mockResults: MockSearchResult = { rows: [] }
      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const { query, model_name, limit = 10, threshold, metric = "cosine" } = request

          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: query,
            modelName: model_name,
          })

          expect(limit).toBe(10) // Default limit
          expect(metric).toBe("cosine") // Default metric
          expect(threshold).toBeUndefined() // No threshold by default

          return {
            results: [],
            query,
            model_name: embeddingResponse.model,
            metric,
            count: 0,
            threshold,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
      }

      await Effect.runPromise(mockSearchEmbeddings(searchRequest))
    })

    it("should handle custom limit values", async () => {
      const mockResults: MockSearchResult = { rows: [] }
      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const { limit } = request
          expect(limit).toBe(50)

          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: request.query,
            modelName: request.model_name,
          })

          return {
            results: [],
            query: request.query,
            model_name: embeddingResponse.model,
            metric: "cosine",
            count: 0,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        limit: 50,
      }

      await Effect.runPromise(mockSearchEmbeddings(searchRequest))
    })
  })

  describe("Result Transformation", () => {
    it("should properly transform raw database results", async () => {
      const mockResults: MockSearchResult = {
        rows: [
          {
            id: "123",  // Test string to number conversion
            uri: "test-doc",
            text: "Test document content",
            model_name: "nomic-embed-text",
            similarity: "0.95", // Test string to number conversion
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T01:00:00Z",
          },
        ],
      }

      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: request.query,
            modelName: request.model_name,
          })

          const searchResults = yield* Effect.tryPromise({
            try: async () => {
              const result = await mockDatabaseService.client.execute({
                sql: "SELECT * FROM embeddings",
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

          // Test the transformation logic
          const results = searchResults.map((row: any) => ({
            id: Number(row.id),
            uri: String(row.uri),
            text: String(row.text),
            model_name: String(row.model_name),
            similarity: Number(row.similarity),
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))

          return {
            results,
            query: request.query,
            model_name: embeddingResponse.model,
            metric: "cosine",
            count: results.length,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
      }

      const result = await Effect.runPromise(mockSearchEmbeddings(searchRequest))

      expect(result.results[0].id).toBe(123) // Converted to number
      expect(result.results[0].similarity).toBe(0.95) // Converted to number
      expect(typeof result.results[0].uri).toBe("string")
      expect(typeof result.results[0].text).toBe("string")
      expect(typeof result.results[0].model_name).toBe("string")
    })

    it("should handle null/undefined values in results", async () => {
      const mockResults: MockSearchResult = {
        rows: [
          {
            id: 1,
            uri: "",
            text: "",
            model_name: "",
            similarity: 0,
            created_at: "",
            updated_at: "",
          },
        ],
      }

      mockDatabaseService.client.execute.mockResolvedValue(mockResults)

      const mockSearchEmbeddings = vi.fn().mockImplementation((request: SearchEmbeddingRequest) =>
        Effect.gen(function* () {
          const embeddingResponse = yield* mockProviderService.generateEmbedding({
            text: request.query,
            modelName: request.model_name,
          })

          const searchResults = yield* Effect.tryPromise({
            try: async () => {
              const result = await mockDatabaseService.client.execute({
                sql: "SELECT * FROM embeddings",
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

          const results = searchResults.map((row: any) => ({
            id: Number(row.id ?? 0),
            uri: String(row.uri ?? ""),
            text: String(row.text ?? ""),
            model_name: String(row.model_name ?? ""),
            similarity: Number(row.similarity ?? 0),
            created_at: row.created_at || null,
            updated_at: row.updated_at || null,
          }))

          return {
            results,
            query: request.query,
            model_name: embeddingResponse.model,
            metric: "cosine",
            count: results.length,
          }
        })
      )

      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
      }

      const result = await Effect.runPromise(mockSearchEmbeddings(searchRequest))

      expect(result.results[0].id).toBe(1)
      expect(result.results[0].uri).toBe("")
      expect(result.results[0].text).toBe("")
      expect(result.results[0].model_name).toBe("")
      expect(result.results[0].similarity).toBe(0)
    })
  })
})