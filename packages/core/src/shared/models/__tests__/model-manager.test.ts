/**
 * Tests for ModelManager service
 * Following TDD approach - these tests should fail initially
 */

import { Effect, Exit, Layer } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  EmbeddingProviderService,
  type EmbeddingResponse,
  ProviderConnectionError,
  ProviderModelError,
} from "@/shared/providers"
import { DatabaseService } from "@/shared/database"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  ModelManagerTag as ModelManager,
  ModelManagerLive,
  type ModelManagerInfo,
  type ModelCompatibility,
  type MigrationResult,
  ModelNotFoundError,
  ModelIncompatibleError,
  MigrationError,
} from "@/shared/models"

describe("ModelManager", () => {
  let mockProviderService: typeof EmbeddingProviderService.Service
  let mockDatabaseService: typeof DatabaseService.Service

  beforeEach(() => {
    // Mock provider service
    mockProviderService = {
      generateEmbedding: vi.fn(),
      getModelInfo: vi.fn(),
      listModels: vi.fn(),
    } as unknown as typeof EmbeddingProviderService.Service

    // Mock database service
    mockDatabaseService = {
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn()
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn()
          })
        })
      },
      client: {} as unknown as typeof DatabaseService.Service["client"],
    } as unknown as typeof DatabaseService.Service
  })

  const createTestLayer = () => {
    const providerLayer = Layer.succeed(EmbeddingProviderService, mockProviderService)
    const databaseLayer = Layer.succeed(DatabaseService, mockDatabaseService)

    return Layer.provide(
      ModelManagerLive,
      Layer.mergeAll(providerLayer, databaseLayer)
    )
  }

  describe("listAvailableModels", () => {
    it("should return list of available models from all providers", async () => {
      // Setup mock to return model information
      vi.mocked(mockProviderService.listModels).mockReturnValue(
        Effect.succeed([
          {
            name: "nomic-embed-text",
            displayName: "Nomic Embed Text",
            provider: "ollama",
            dimensions: 768,
            maxTokens: 8192,
            available: true,
          },
          {
            name: "text-embedding-3-small",
            displayName: "OpenAI Text Embedding 3 Small",
            provider: "openai",
            dimensions: 1536,
            maxTokens: 8191,
            available: true,
          },
        ])
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.listAvailableModels()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].name).toBe("nomic-embed-text")
        expect(result.value[1].name).toBe("text-embedding-3-small")
      }
    })

    it("should handle provider connection errors", async () => {
      vi.mocked(mockProviderService.listModels).mockReturnValue(
        Effect.fail(new ProviderConnectionError("Connection failed", "ollama"))
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.listAvailableModels()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = result.cause._tag === "Fail" ? result.cause.error : null
        expect(error).toBeInstanceOf(ProviderConnectionError)
      }
    })
  })

  describe("getModelInfo", () => {
    it("should return detailed model information for valid model", async () => {
      const expectedModel: ModelManagerInfo = {
        name: "nomic-embed-text",
        displayName: "Nomic Embed Text",
        provider: "ollama",
        dimensions: 768,
        maxTokens: 8192,
        available: true,
        version: "1.0",
        languages: ["en"],
      }

      // Mock provider returns ProviderModelInfo format
      vi.mocked(mockProviderService.getModelInfo).mockReturnValue(
        Effect.succeed({
          name: "nomic-embed-text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
        })
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.getModelInfo("nomic-embed-text")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value.name).toBe("nomic-embed-text")
        expect(result.value.dimensions).toBe(768)
        expect(result.value.provider).toBe("ollama")
      }
    })

    it("should return ModelNotFoundError for invalid model", async () => {
      vi.mocked(mockProviderService.getModelInfo).mockReturnValue(
        Effect.fail(new ProviderModelError("Model not found", "invalid-model"))
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.getModelInfo("invalid-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = result.cause._tag === "Fail" ? result.cause.error : null
        expect(error).toBeInstanceOf(ModelNotFoundError)
        if (error instanceof ModelNotFoundError) {
          expect(error.modelName).toBe("invalid-model")
        }
      }
    })
  })

  describe("validateModelCompatibility", () => {
    it("should return compatible for models with same dimensions", async () => {
      vi.mocked(mockProviderService.getModelInfo)
        .mockReturnValueOnce(
          Effect.succeed({
            name: "model-a",
            displayName: "Model A",
            provider: "ollama",
            dimensions: 768,
            maxTokens: 8192,
            available: true,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            name: "model-b",
            displayName: "Model B",
            provider: "openai",
            dimensions: 768,
            maxTokens: 8191,
            available: true,
          })
        )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.validateModelCompatibility("model-a", "model-b")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value.compatible).toBe(true)
        expect(result.value.similarityScore).toBeGreaterThan(0.8)
      }
    })

    it("should return incompatible for models with different dimensions", async () => {
      vi.mocked(mockProviderService.getModelInfo)
        .mockReturnValueOnce(
          Effect.succeed({
            name: "model-a",
            displayName: "Model A",
            provider: "ollama",
            dimensions: 768,
            maxTokens: 8192,
            available: true,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            name: "model-b",
            displayName: "Model B",
            provider: "openai",
            dimensions: 1536,
            maxTokens: 8191,
            available: true,
          })
        )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.validateModelCompatibility("model-a", "model-b")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value.compatible).toBe(false)
        expect(result.value.reason).toContain("Different vector dimensions")
      }
    })
  })

  describe("getModelDimensions", () => {
    it("should return correct dimensions for valid model", async () => {
      vi.mocked(mockProviderService.getModelInfo).mockReturnValue(
        Effect.succeed({
          name: "nomic-embed-text",
          displayName: "Nomic Embed Text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
          available: true,
        })
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.getModelDimensions("nomic-embed-text")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value).toBe(768)
      }
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available model", async () => {
      vi.mocked(mockProviderService.getModelInfo).mockReturnValue(
        Effect.succeed({
          name: "nomic-embed-text",
          displayName: "Nomic Embed Text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
          available: true,
        })
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.isModelAvailable("nomic-embed-text")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value).toBe(true)
      }
    })

    it("should return false for unavailable model", async () => {
      vi.mocked(mockProviderService.getModelInfo).mockReturnValue(
        Effect.fail(new ProviderModelError("Model not available", "unavailable-model"))
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.isModelAvailable("unavailable-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value).toBe(false)
      }
    })
  })

  describe("migrateEmbeddings", () => {
    it("should successfully migrate compatible embeddings", async () => {
      // Mock model compatibility check
      vi.mocked(mockProviderService.getModelInfo)
        .mockReturnValueOnce(
          Effect.succeed({
            name: "source-model",
            displayName: "Source Model",
            provider: "ollama",
            dimensions: 768,
            maxTokens: 8192,
            available: true,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            name: "target-model",
            displayName: "Target Model",
            provider: "openai",
            dimensions: 768,
            maxTokens: 8191,
            available: true,
          })
        )

      // Mock database operations - create the full query chain that resolves to a promise
      const mockEmbeddings = [
        {
          id: 1,
          uri: "test1",
          text: "test text 1",
          modelName: "source-model",
          embedding: new Uint8Array(),
          createdAt: "2023-01-01",
          updatedAt: "2023-01-01",
        },
        {
          id: 2,
          uri: "test2",
          text: "test text 2",
          modelName: "source-model",
          embedding: new Uint8Array(),
          createdAt: "2023-01-01",
          updatedAt: "2023-01-01",
        },
      ]

      // Set up database chain mock - each method returns an object with the next method
      const mockWhere = vi.fn().mockResolvedValue(mockEmbeddings)
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
      mockDatabaseService.db.select = mockSelect

      // Mock database update chain
      const mockUpdateWhere = vi.fn().mockResolvedValue({})
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
      const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet })
      mockDatabaseService.db.update = mockUpdate

      // Mock new embedding generation
      vi.mocked(mockProviderService.generateEmbedding).mockReturnValue(
        Effect.succeed({
          embedding: [0.1, 0.2, 0.3],
          model: "target-model",
          usage: { total_tokens: 10 },
        })
      )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.migrateEmbeddings("source-model", "target-model", {
          batchSize: 10,
          preserveOriginal: false,
        })
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value.totalProcessed).toBe(2)
        expect(result.value.successful).toBe(2)
        expect(result.value.failed).toBe(0)
      }
    })

    it("should fail migration for incompatible models", async () => {
      vi.mocked(mockProviderService.getModelInfo)
        .mockReturnValueOnce(
          Effect.succeed({
            name: "source-model",
            displayName: "Source Model",
            provider: "ollama",
            dimensions: 768,
            maxTokens: 8192,
            available: true,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            name: "target-model",
            displayName: "Target Model",
            provider: "openai",
            dimensions: 1536,
            maxTokens: 8191,
            available: true,
          })
        )

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.migrateEmbeddings("source-model", "target-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = result.cause._tag === "Fail" ? result.cause.error : null
        expect(error).toBeInstanceOf(ModelIncompatibleError)
      }
    })
  })

  describe("getModelUsageStats", () => {
    it("should return usage statistics for all models", async () => {
      const mockStats = [
        { model_name: "nomic-embed-text", count: 150 },
        { model_name: "text-embedding-3-small", count: 75 },
      ]

      // Set up database chain mock for stats
      const mockGroupBy = vi.fn().mockResolvedValue(mockStats)
      const mockFrom = vi.fn().mockReturnValue({ groupBy: mockGroupBy })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
      mockDatabaseService.db.select = mockSelect

      const program = Effect.gen(function* () {
        const modelManager = yield* ModelManager
        return yield* modelManager.getModelUsageStats()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(Exit.isSuccess(result)).toBe(true)
      if (Exit.isSuccess(result)) {
        expect(result.value["nomic-embed-text"]).toBe(150)
        expect(result.value["text-embedding-3-small"]).toBe(75)
      }
    })
  })
})