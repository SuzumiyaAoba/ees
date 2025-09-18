/**
 * Simplified CLI Tests for Application Service Layer
 * Tests the core functionality that the CLI depends on
 */

import { mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EmbeddingService } from "@/entities/embedding/api/embedding"
import type {
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingResponse,
} from "@/entities/embedding/model/embedding"
import {
  EmbeddingApplicationService,
  EmbeddingApplicationServiceLive,
} from "@/shared/application/embedding-application"
import { DatabaseService } from "@/shared/database/connection"

describe("CLI Application Service Layer", () => {
  let testDir: string
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
  let mockLayer: Layer.Layer<EmbeddingApplicationService>

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ees-cli-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    // Mock the database service
    mockDatabaseService = {
      db: {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
      },
    }

    // Mock the Embedding service with proper return values
    mockEmbeddingService = {
      createEmbedding: vi.fn(),
      createBatchEmbedding: vi.fn(),
      searchEmbeddings: vi.fn(),
      getEmbedding: vi.fn(),
      getAllEmbeddings: vi.fn(),
      deleteEmbedding: vi.fn(),
    }

    // Create comprehensive test layer that provides all dependencies
    // First provide the base services, then build the application service on top
    const baseLayer = Layer.mergeAll(
      Layer.succeed(DatabaseService, mockDatabaseService),
      Layer.succeed(EmbeddingService, mockEmbeddingService)
    )

    mockLayer = Layer.provide(EmbeddingApplicationServiceLive, baseLayer)
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks()
  })

  describe("createEmbedding", () => {
    it("should create embedding successfully", async () => {
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
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toEqual(mockResponse)
      expect(mockEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        "test-doc",
        "Test content",
        "test-model"
      )
    })
  })

  describe("createBatchEmbeddings", () => {
    it("should create batch embeddings successfully", async () => {
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
          return yield* appService.createBatchEmbeddings({
            texts: [
              { uri: "doc1", text: "Content 1" },
              { uri: "doc2", text: "Content 2" },
            ],
            model_name: "test-model",
          })
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toEqual(mockResponse)
      expect(mockEmbeddingService.createBatchEmbedding).toHaveBeenCalledWith({
        texts: [
          { uri: "doc1", text: "Content 1" },
          { uri: "doc2", text: "Content 2" },
        ],
        model_name: "test-model",
      })
    })
  })

  describe("searchEmbeddings", () => {
    it("should search embeddings successfully", async () => {
      const mockResponse: SearchEmbeddingResponse = {
        results: [
          { uri: "doc1", similarity: 0.95 },
          { uri: "doc2", similarity: 0.87 },
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
          return yield* appService.searchEmbeddings({
            query: "test query",
            model_name: "test-model",
            limit: 5,
            threshold: 0.8,
            metric: "cosine",
          })
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toEqual(mockResponse)
      expect(mockEmbeddingService.searchEmbeddings).toHaveBeenCalledWith({
        query: "test query",
        model_name: "test-model",
        limit: 5,
        threshold: 0.8,
        metric: "cosine",
      })
    })
  })

  describe("getEmbeddingByUri", () => {
    it("should get embedding by URI successfully", async () => {
      const mockEmbedding: Embedding = {
        id: 1,
        uri: "test-doc",
        text: "Test content for embedding",
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
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toEqual(mockEmbedding)
      expect(mockEmbeddingService.getEmbedding).toHaveBeenCalledWith("test-doc")
    })
  })

  describe("listEmbeddings", () => {
    it("should list embeddings successfully", async () => {
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
        ],
        count: 1,
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
          return yield* appService.listEmbeddings({
            uri: "doc*",
            modelName: "model1",
            page: 1,
            limit: 10,
          })
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toEqual(mockResponse)
      expect(mockEmbeddingService.getAllEmbeddings).toHaveBeenCalledWith({
        uri: "doc*",
        model_name: "model1",
        page: 1,
        limit: 10,
      })
    })
  })

  describe("deleteEmbedding", () => {
    it("should delete embedding successfully", async () => {
      mockEmbeddingService.deleteEmbedding.mockReturnValue(Effect.succeed(true))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const appService = yield* EmbeddingApplicationService
          return yield* appService.deleteEmbedding(123)
        }).pipe(Effect.provide(mockLayer))
      )

      expect(result).toBe(true)
      expect(mockEmbeddingService.deleteEmbedding).toHaveBeenCalledWith(123)
    })
  })
})
