/**
 * Tests for EmbeddingApplicationService
 */

import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { EmbeddingService } from "@/entities/embedding/api/embedding"
import type {
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
} from "@/entities/embedding/model/embedding"
import { DatabaseService } from "../../database/connection"
import {
  EmbeddingApplicationService,
  EmbeddingApplicationServiceLive,
} from "../embedding-application"

describe("EmbeddingApplicationService", () => {
  let mockEmbeddingService: {
    createEmbedding: ReturnType<typeof vi.fn>
    createBatchEmbedding: ReturnType<typeof vi.fn>
    searchEmbeddings: ReturnType<typeof vi.fn>
    getEmbedding: ReturnType<typeof vi.fn>
    getAllEmbeddings: ReturnType<typeof vi.fn>
    deleteEmbedding: ReturnType<typeof vi.fn>
  }
  let mockDatabaseService: {
    db: {
      insert: ReturnType<typeof vi.fn>
      select: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    // Mock the database service
    mockDatabaseService = {
      db: {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
      },
    }

    // Mock the Embedding service
    mockEmbeddingService = {
      createEmbedding: vi.fn(),
      createBatchEmbedding: vi.fn(),
      searchEmbeddings: vi.fn(),
      getEmbedding: vi.fn(),
      getAllEmbeddings: vi.fn(),
      deleteEmbedding: vi.fn(),
    }
  })

  const createTestLayer = () => {
    const baseLayer = Layer.mergeAll(
      Layer.succeed(DatabaseService, mockDatabaseService),
      Layer.succeed(EmbeddingService, mockEmbeddingService)
    )
    return Layer.provide(EmbeddingApplicationServiceLive, baseLayer)
  }

  describe("createEmbedding", () => {
    it("should create embedding with all parameters", async () => {
      const mockResponse: CreateEmbeddingResponse = {
        id: 1,
        uri: "test-doc",
        model_name: "test-model",
        message: "Created successfully",
      }
      mockEmbeddingService.createEmbedding.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.createEmbedding({
            uri: "test-doc",
            text: "Test content",
            modelName: "test-model",
          })
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        "test-doc",
        "Test content",
        "test-model"
      )
      expect(result).toEqual(mockResponse)
    })

    it("should create embedding without model name", async () => {
      const mockResponse: CreateEmbeddingResponse = {
        id: 2,
        uri: "test-doc-2",
        model_name: "default-model",
        message: "Created successfully",
      }
      mockEmbeddingService.createEmbedding.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.createEmbedding({
            uri: "test-doc-2",
            text: "Test content without model",
          })
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        "test-doc-2",
        "Test content without model",
        undefined
      )
      expect(result).toEqual(mockResponse)
    })

    it("should propagate errors from embedding service", async () => {
      const error = new Error("Embedding creation failed")
      mockEmbeddingService.createEmbedding.mockReturnValue(Effect.fail(error))

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.createEmbedding({
              uri: "test-doc",
              text: "Test content",
            })
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("Embedding creation failed")

      expect(mockEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        "test-doc",
        "Test content",
        undefined
      )
    })
  })

  describe("createBatchEmbeddings", () => {
    it("should create batch embeddings", async () => {
      const batchRequest: BatchCreateEmbeddingRequest = {
        texts: [
          { uri: "doc1", text: "Content 1" },
          { uri: "doc2", text: "Content 2" },
        ],
        model_name: "test-model",
      }

      const mockResponse: BatchCreateEmbeddingResponse = {
        successful: 2,
        failed: 0,
        total: 2,
        results: [],
      }
      mockEmbeddingService.createBatchEmbedding.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.createBatchEmbeddings(batchRequest)
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.createBatchEmbedding).toHaveBeenCalledWith(
        batchRequest
      )
      expect(result).toEqual(mockResponse)
    })

    it("should handle batch creation errors", async () => {
      const batchRequest: BatchCreateEmbeddingRequest = {
        texts: [{ uri: "doc1", text: "Content 1" }],
        model_name: "test-model",
      }

      const error = new Error("Batch creation failed")
      mockEmbeddingService.createBatchEmbedding.mockReturnValue(
        Effect.fail(error)
      )

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.createBatchEmbeddings(batchRequest)
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("Batch creation failed")
    })
  })

  describe("searchEmbeddings", () => {
    it("should search embeddings with all parameters", async () => {
      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
        model_name: "test-model",
        limit: 10,
        threshold: 0.8,
        metric: "cosine",
      }

      const mockResponse: SearchEmbeddingResponse = {
        results: [
          { uri: "doc1", similarity: 0.95 },
          { uri: "doc2", similarity: 0.85 },
        ],
        count: 2,
        query: "test query",
      }
      mockEmbeddingService.searchEmbeddings.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.searchEmbeddings(searchRequest)
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.searchEmbeddings).toHaveBeenCalledWith(
        searchRequest
      )
      expect(result).toEqual(mockResponse)
    })

    it("should handle search errors", async () => {
      const searchRequest: SearchEmbeddingRequest = {
        query: "test query",
      }

      const error = new Error("Search failed")
      mockEmbeddingService.searchEmbeddings.mockReturnValue(Effect.fail(error))

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.searchEmbeddings(searchRequest)
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("Search failed")
    })
  })

  describe("getEmbeddingByUri", () => {
    it("should get embedding by URI", async () => {
      const mockEmbedding: Embedding = {
        id: 1,
        uri: "test-doc",
        text: "Test content",
        model_name: "test-model",
        embedding: [0.1, 0.2, 0.3],
        created_at: "2023-01-01",
        updated_at: "2023-01-01",
      }
      mockEmbeddingService.getEmbedding.mockReturnValue(
        Effect.succeed(mockEmbedding)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.getEmbeddingByUri("test-doc")
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.getEmbedding).toHaveBeenCalledWith("test-doc")
      expect(result).toEqual(mockEmbedding)
    })

    it("should return null when embedding not found", async () => {
      mockEmbeddingService.getEmbedding.mockReturnValue(Effect.succeed(null))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.getEmbeddingByUri("nonexistent")
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.getEmbedding).toHaveBeenCalledWith(
        "nonexistent"
      )
      expect(result).toBeNull()
    })

    it("should handle database errors", async () => {
      const error = new Error("Database error")
      mockEmbeddingService.getEmbedding.mockReturnValue(Effect.fail(error))

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.getEmbeddingByUri("test-doc")
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("Database error")
    })
  })

  describe("listEmbeddings", () => {
    it("should list embeddings without filters", async () => {
      const mockResponse: EmbeddingsListResponse = {
        embeddings: [
          {
            id: 1,
            uri: "doc1",
            text: "Content 1",
            model_name: "model1",
            embedding: [],
            created_at: "2023-01-01",
            updated_at: "2023-01-01",
          },
          {
            id: 2,
            uri: "doc2",
            text: "Content 2",
            model_name: "model1",
            embedding: [],
            created_at: "2023-01-02",
            updated_at: "2023-01-02",
          },
        ],
        count: 2,
        page: 1,
        limit: 10,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      }
      mockEmbeddingService.getAllEmbeddings.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.listEmbeddings()
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.getAllEmbeddings).toHaveBeenCalledWith(
        undefined
      )
      expect(result).toEqual(mockResponse)
    })

    it("should list embeddings with filters", async () => {
      const filters = {
        uri: "doc*",
        modelName: "test-model",
        page: 2,
        limit: 5,
      }

      const mockResponse: EmbeddingsListResponse = {
        embeddings: [],
        count: 0,
        page: 2,
        limit: 5,
        total_pages: 1,
        has_next: false,
        has_prev: true,
      }
      mockEmbeddingService.getAllEmbeddings.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.listEmbeddings(filters)
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.getAllEmbeddings).toHaveBeenCalledWith({
        uri: "doc*",
        model_name: "test-model",
        page: 2,
        limit: 5,
      })
      expect(result).toEqual(mockResponse)
    })

    it("should handle listing errors", async () => {
      const error = new Error("List failed")
      mockEmbeddingService.getAllEmbeddings.mockReturnValue(Effect.fail(error))

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.listEmbeddings()
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("List failed")
    })
  })

  describe("deleteEmbedding", () => {
    it("should delete embedding successfully", async () => {
      mockEmbeddingService.deleteEmbedding.mockReturnValue(Effect.succeed(true))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.deleteEmbedding(123)
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.deleteEmbedding).toHaveBeenCalledWith(123)
      expect(result).toBe(true)
    })

    it("should return false when embedding not found for deletion", async () => {
      mockEmbeddingService.deleteEmbedding.mockReturnValue(
        Effect.succeed(false)
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.deleteEmbedding(999)
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(mockEmbeddingService.deleteEmbedding).toHaveBeenCalledWith(999)
      expect(result).toBe(false)
    })

    it("should handle deletion errors", async () => {
      const error = new Error("Delete failed")
      mockEmbeddingService.deleteEmbedding.mockReturnValue(Effect.fail(error))

      await expect(
        Effect.runPromise(
          Effect.gen(function* () {
            const appService = yield* EmbeddingApplicationService
            return yield* appService.deleteEmbedding(123)
          }).pipe(Effect.provide(createTestLayer()))
        )
      ).rejects.toThrow("Delete failed")
    })
  })

  describe("Service Layer Integration", () => {
    it("should work with proper dependency injection", async () => {
      const mockResponse: CreateEmbeddingResponse = {
        id: 1,
        uri: "integration-test",
        model_name: "test-model",
        message: "Created successfully",
      }
      mockEmbeddingService.createEmbedding.mockReturnValue(
        Effect.succeed(mockResponse)
      )

      const program = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService
        return yield* appService.createEmbedding({
          uri: "integration-test",
          text: "Integration test content",
          modelName: "test-model",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result).toEqual(mockResponse)
      expect(mockEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        "integration-test",
        "Integration test content",
        "test-model"
      )
    })

    it("should maintain type safety throughout the layer stack", async () => {
      mockEmbeddingService.createEmbedding.mockReturnValue(
        Effect.succeed({
          id: 1,
          uri: "type-test",
          model_name: "test-model",
          message: "Created successfully",
        })
      )

      // This test ensures TypeScript compilation verifies type safety
      const result: CreateEmbeddingResponse = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.createEmbedding({
            uri: "type-test",
            text: "Type safety test",
            modelName: "test-model",
          })
        }).pipe(Effect.provide(createTestLayer()))
      )

      expect(result.id).toBe(1)
      expect(result.uri).toBe("type-test")
      expect(result.model_name).toBe("test-model")
      expect(result.message).toBe("Created successfully")
    })
  })
})
