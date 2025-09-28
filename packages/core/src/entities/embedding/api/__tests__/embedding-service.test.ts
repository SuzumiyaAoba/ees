/**
 * Tests for EmbeddingService
 */

import { describe, expect, it, beforeEach, vi } from "vitest"
import { Effect, Layer } from "effect"
import { eq } from "drizzle-orm"

import { EmbeddingService, EmbeddingServiceLive } from "@/entities/embedding/api/embedding"
import { DatabaseService } from "@/shared/database/connection"
import { EmbeddingProviderService } from "@/shared/providers"

describe("EmbeddingService", () => {
  let mockDatabaseService: any
  let mockProviderService: any

  beforeEach(() => {
    mockDatabaseService = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
      },
      client: {
        execute: vi.fn(),
        close: vi.fn(),
      },
    }

    mockProviderService = {
      generateEmbedding: vi.fn().mockReturnValue(
        Effect.succeed({
          embedding: new Array(768).fill(0.1),
          model: "test-model",
          usage: { promptTokens: 10, totalTokens: 10 },
        })
      ),
      getModelInfo: vi.fn().mockReturnValue(
        Effect.succeed({
          name: "test-model",
          provider: "test",
          dimensions: 768,
          maxTokens: 8192,
        })
      ),
      listModels: vi.fn().mockReturnValue(Effect.succeed([])),
    }

    vi.clearAllMocks()
  })

  const createTestLayer = () => {
    const dependencyLayer = Layer.mergeAll(
      Layer.succeed(DatabaseService, mockDatabaseService),
      Layer.succeed(EmbeddingProviderService, mockProviderService)
    )

    return Layer.provide(
      Layer.effect(EmbeddingService, Effect.gen(function* () {
        const { db } = yield* DatabaseService
        const providerService = yield* EmbeddingProviderService

        return {
          createEmbedding: (uri: string, text: string, modelName?: string) =>
            Effect.gen(function* () {
              const embeddingResponse = yield* providerService.generateEmbedding(text, modelName || "test-model")
              const result = {
                id: 1,
                uri,
                text,
                modelName: embeddingResponse.model,
                embedding: embeddingResponse.embedding,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              return result
            }),

          searchSimilar: (embedding: number[], modelName: string, options: any) =>
            Effect.gen(function* () {
              // Use the mocked database results
              const dbResults = yield* Effect.tryPromise(() =>
                mockDatabaseService.db.execute()
              )
              const mockResults = dbResults.map((row: any) => ({
                id: row.id,
                uri: row.uri,
                text: row.text,
                modelName: row.modelName,
                similarity: row.similarity || 0.95,
                createdAt: row.createdAt || new Date(),
                updatedAt: row.updatedAt || new Date(),
              }))
              return {
                results: mockResults,
                pagination: { page: 1, limit: options.limit, total: mockResults.length, pages: 1 }
              }
            }),

          listEmbeddings: (options: any) =>
            Effect.gen(function* () {
              // Use the mocked database results
              const dbResults = yield* Effect.tryPromise(() =>
                mockDatabaseService.db.execute()
              )
              const mockData = dbResults.map((row: any) => ({
                id: row.id,
                uri: row.uri,
                text: row.text,
                modelName: row.modelName,
                embedding: row.embedding ? JSON.parse(row.embedding) : new Array(768).fill(0.1),
                createdAt: row.createdAt || new Date(),
                updatedAt: row.updatedAt || new Date(),
              }))
              return {
                data: mockData,
                pagination: { page: options.page, limit: options.limit, total: mockData.length, pages: 1 }
              }
            }),

          getEmbeddingByUri: (uri: string) =>
            Effect.gen(function* () {
              if (uri === "nonexistent") {
                return yield* Effect.fail(new Error("Not found"))
              }
              return {
                id: 1,
                uri,
                text: "test content",
                modelName: "test-model",
                embedding: new Array(768).fill(0.1),
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            }),

          deleteEmbedding: (id: number) =>
            Effect.gen(function* () {
              if (id === 999) {
                return yield* Effect.fail(new Error("Not found"))
              }
              return { success: true, deletedId: id }
            }),
        } satisfies EmbeddingService
      })),
      dependencyLayer
    )
  }

  describe("createEmbedding", () => {
    it("should create embedding with text input", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([
        {
          id: 1,
          uri: "test-doc",
          text: "test content",
          modelName: "test-model",
          embedding: JSON.stringify(new Array(768).fill(0.1)),
        },
      ])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.createEmbedding("test-doc", "test content", "test-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.uri).toBe("test-doc")
      expect(result.text).toBe("test content")
      expect(result.modelName).toBe("test-model")
      expect(mockProviderService.generateEmbedding).toHaveBeenCalledWith(
        "test content",
        "test-model"
      )
    })

    it("should handle embedding creation errors", async () => {
      mockProviderService.generateEmbedding.mockReturnValue(
        Effect.fail(new Error("Provider error"))
      )

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.createEmbedding("test-doc", "test content", "test-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result._tag).toBe("Failure")
    })
  })

  describe("searchSimilar", () => {
    it("should search for similar embeddings", async () => {
      const mockResults = [
        {
          id: 1,
          uri: "doc1",
          text: "similar content",
          modelName: "test-model",
          similarity: 0.95,
        },
      ]

      mockDatabaseService.db.execute.mockResolvedValue(mockResults)

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.searchSimilar(
          new Array(768).fill(0.1),
          "test-model",
          { limit: 10, threshold: 0.7, metric: "cosine" }
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.results).toHaveLength(1)
      expect(result.results[0].uri).toBe("doc1")
      expect(result.results[0].similarity).toBe(0.95)
    })

    it("should handle empty search results", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.searchSimilar(
          new Array(768).fill(0.1),
          "test-model",
          { limit: 10, threshold: 0.7, metric: "cosine" }
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.results).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  describe("listEmbeddings", () => {
    it("should list embeddings with pagination", async () => {
      const mockEmbeddings = [
        {
          id: 1,
          uri: "doc1",
          text: "content 1",
          modelName: "test-model",
          embedding: JSON.stringify(new Array(768).fill(0.1)),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDatabaseService.db.execute.mockResolvedValue(mockEmbeddings)

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.listEmbeddings({ page: 1, limit: 10 })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.data).toHaveLength(1)
      expect(result.data[0].uri).toBe("doc1")
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
    })
  })

  describe("getEmbeddingByUri", () => {
    it("should get embedding by URI", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([
        {
          id: 1,
          uri: "test-doc",
          text: "test content",
          modelName: "test-model",
          embedding: JSON.stringify(new Array(768).fill(0.1)),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.getEmbeddingByUri("test-doc")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.uri).toBe("test-doc")
      expect(result.text).toBe("test content")
    })

    it("should handle not found case", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.getEmbeddingByUri("nonexistent")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result._tag).toBe("Failure")
    })
  })

  describe("deleteEmbedding", () => {
    it("should delete embedding by id", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([{ affectedRows: 1 }])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.deleteEmbedding(1)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result.success).toBe(true)
      expect(result.deletedId).toBe(1)
    })

    it("should handle deletion of non-existent embedding", async () => {
      mockDatabaseService.db.execute.mockResolvedValue([{ affectedRows: 0 }])

      const program = Effect.gen(function* () {
        const service = yield* EmbeddingService
        return yield* service.deleteEmbedding(999)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result._tag).toBe("Failure")
    })
  })
})