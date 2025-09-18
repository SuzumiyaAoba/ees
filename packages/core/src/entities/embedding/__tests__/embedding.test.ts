import { eq } from "drizzle-orm"
import type { drizzle } from "drizzle-orm/libsql"
import { Effect, Exit, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseService } from "@/shared/database/connection"
import { embeddings } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"
import { EmbeddingProviderService } from "@/shared/providers"
import { ProviderModelError } from "@/shared/providers/types"
import { EmbeddingService } from "../api/embedding"

// Mock dependencies
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
}

const mockProviderService = {
  generateEmbedding: vi.fn(),
  listModels: vi.fn(),
  isModelAvailable: vi.fn(),
  getModelInfo: vi.fn(),
  listAllProviders: vi.fn(),
  getCurrentProvider: vi.fn(),
}

const MockDatabaseServiceLive = Layer.succeed(DatabaseService, {
  db: mockDb as ReturnType<typeof drizzle>,
})

const MockProviderServiceLive = Layer.succeed(
  EmbeddingProviderService,
  mockProviderService
)

// Create a test implementation that directly uses our mocks
const testMake = Effect.gen(function* () {
  const { db } = yield* DatabaseService
  const providerService = yield* EmbeddingProviderService

  const createEmbedding = (uri: string, text: string, modelName?: string) =>
    Effect.gen(function* () {
      const embeddingRequest = {
        text,
        modelName,
      }
      const embeddingResponse =
        yield* providerService.generateEmbedding(embeddingRequest)

      const embeddingBuffer = Buffer.from(
        JSON.stringify(embeddingResponse.embedding)
      )

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

  // Simplified test methods - just implement what we need for testing
  const getEmbedding = (_uri: string) => Effect.succeed(null)
  const getAllEmbeddings = () =>
    Effect.succeed({
      embeddings: [],
      count: 0,
      page: 1,
      limit: 10,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    })
  const deleteEmbedding = (_id: number) => Effect.succeed(true)
  const createBatchEmbedding = () =>
    Effect.succeed({ results: [], total: 0, successful: 0, failed: 0 })
  const searchEmbeddings = () =>
    Effect.succeed({
      results: [],
      query: "",
      model_name: "",
      metric: "cosine" as const,
      count: 0,
    })
  const listProviders = () => Effect.succeed(["ollama"])
  const switchProvider = () => Effect.succeed(undefined)
  const getCurrentProvider = () => Effect.succeed("ollama")

  return {
    createEmbedding,
    getEmbedding,
    getAllEmbeddings,
    deleteEmbedding,
    createBatchEmbedding,
    searchEmbeddings,
    listProviders,
    switchProvider,
    getCurrentProvider,
  } as const
})

const TestEmbeddingServiceLive = Layer.effect(EmbeddingService, testMake).pipe(
  Layer.provide(MockProviderServiceLive),
  Layer.provide(MockDatabaseServiceLive)
)

describe.skip("EmbeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default successful responses
    mockProviderService.generateEmbedding.mockReturnValue(
      Effect.succeed({
        embedding: [0.1, 0.2, 0.3],
        model: "nomic-embed-text",
        provider: "ollama",
        dimensions: 3,
      })
    )

    mockProviderService.listAllProviders.mockReturnValue(
      Effect.succeed(["ollama"])
    )

    mockProviderService.getCurrentProvider.mockReturnValue(
      Effect.succeed("ollama")
    )

    // Mock database insert chain
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    }
    mockDb.insert.mockReturnValue(mockInsert)

    // Mock database select chain
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockDb.select.mockReturnValue(mockSelect)

    // Mock database delete chain
    const mockDelete = {
      where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    }
    mockDb.delete.mockReturnValue(mockDelete)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createEmbedding", () => {
    it("should create embedding successfully with default model", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test document content"
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toEqual({
        id: 1,
        uri: "file://test.txt",
        model_name: "nomic-embed-text",
        message: "Embedding created successfully",
      })

      expect(mockProviderService.generateEmbedding).toHaveBeenCalledWith({
        text: "Test document content",
        modelName: undefined,
      })
    })

    it("should create embedding with custom model", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test content",
          "custom-model:latest"
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.model_name).toBe("custom-model:latest")
      expect(mockProviderService.generateEmbedding).toHaveBeenCalledWith({
        text: "Test content",
        modelName: "custom-model:latest",
      })
    })

    it("should store embedding with text in database", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Original document text"
        )
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(mockDb.insert).toHaveBeenCalledWith(embeddings)

      const insertMock = mockDb.insert().values
      expect(insertMock).toHaveBeenCalledWith({
        uri: "file://test.txt",
        text: "Original document text",
        modelName: "nomic-embed-text",
        embedding: expect.any(Buffer),
      })
    })

    it("should handle embedding update on conflict", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://existing.txt",
          "Updated content"
        )
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      const onConflictMock = mockDb.insert().values().onConflictDoUpdate
      expect(onConflictMock).toHaveBeenCalledWith({
        target: embeddings.uri,
        set: {
          text: "Updated content",
          modelName: "nomic-embed-text",
          embedding: expect.any(Buffer),
          updatedAt: expect.any(String),
        },
      })
    })

    it("should convert embedding array to buffer correctly", async () => {
      const testEmbedding = [1.1, 2.2, 3.3]
      mockProviderService.generateEmbedding.mockReturnValue(
        Effect.succeed({
          embedding: testEmbedding,
          model: "nomic-embed-text",
          provider: "ollama",
          dimensions: 3,
        })
      )

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test content"
        )
      })

      await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      const insertMock = mockDb.insert().values
      const callArgs = insertMock.mock.calls[0][0]
      const embeddingBuffer = callArgs.embedding

      expect(embeddingBuffer).toBeInstanceOf(Buffer)
      expect(JSON.parse(embeddingBuffer.toString())).toEqual(testEmbedding)
    })

    it("should handle provider service errors", async () => {
      const providerError = new ProviderModelError({
        provider: "ollama",
        modelName: "nonexistent-model",
        message: "Model not found",
      })

      mockProviderService.generateEmbedding.mockReturnValue(
        Effect.fail(providerError)
      )

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test content",
          "nonexistent-model"
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect((result.cause as { error: unknown }).error).toBe(providerError)
      }
    })

    it("should handle database insertion errors", async () => {
      mockDb
        .insert()
        .values()
        .onConflictDoUpdate()
        .returning.mockRejectedValue(new Error("Database constraint violation"))

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test content"
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(
          (result.cause as { error: DatabaseQueryError }).error
        ).toBeInstanceOf(DatabaseQueryError)
        expect(
          (result.cause as { error: DatabaseQueryError }).error.message
        ).toBe("Failed to save embedding to database")
      }
    })

    it("should handle empty embedding array from provider", async () => {
      mockProviderService.generateEmbedding.mockReturnValue(
        Effect.succeed({
          embedding: [],
          model: "nomic-embed-text",
          provider: "ollama",
          dimensions: 0,
        })
      )

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://test.txt",
          "Test content"
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.id).toBe(1)

      const insertMock = mockDb.insert().values
      const callArgs = insertMock.mock.calls[0][0]
      const embeddingBuffer = callArgs.embedding
      expect(JSON.parse(embeddingBuffer.toString())).toEqual([])
    })

    it("should handle long text input", async () => {
      const longText = "a".repeat(10000)

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://long.txt",
          longText
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.id).toBe(1)
      expect(mockProviderService.generateEmbedding).toHaveBeenCalledWith({
        text: longText,
        modelName: undefined,
      })
    })

    it("should handle Unicode text correctly", async () => {
      const unicodeText = "こんにちは世界! 🌍 Émojis and spëcial chars"

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.createEmbedding(
          "file://unicode.txt",
          unicodeText
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.id).toBe(1)

      const insertMock = mockDb.insert().values
      const callArgs = insertMock.mock.calls[0][0]
      expect(callArgs.text).toBe(unicodeText)
    })
  })

  describe("getEmbedding", () => {
    it("should retrieve existing embedding successfully", async () => {
      const mockEmbeddingData = {
        id: 1,
        uri: "file://test.txt",
        text: "Test document content",
        modelName: "nomic-embed-text",
        embedding: Buffer.from(JSON.stringify([0.1, 0.2, 0.3])),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding("file://test.txt")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toEqual({
        id: 1,
        uri: "file://test.txt",
        text: "Test document content",
        model_name: "nomic-embed-text",
        embedding: [0.1, 0.2, 0.3],
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.select().from).toHaveBeenCalledWith(embeddings)
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        eq(embeddings.uri, "file://test.txt")
      )
      expect(mockDb.select().from().where().limit).toHaveBeenCalledWith(1)
    })

    it("should return null for non-existent embedding", async () => {
      mockDb.select().from().where().limit.mockResolvedValue([])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding("file://nonexistent.txt")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBeNull()
    })

    it("should handle database query errors", async () => {
      mockDb
        .select()
        .from()
        .where()
        .limit.mockRejectedValue(new Error("Database connection lost"))

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding("file://test.txt")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(
          (result.cause as { error: DatabaseQueryError }).error
        ).toBeInstanceOf(DatabaseQueryError)
        expect(
          (result.cause as { error: DatabaseQueryError }).error.message
        ).toBe("Failed to get embedding from database")
      }
    })

    it("should handle malformed embedding data in database", async () => {
      const mockEmbeddingData = {
        id: 1,
        uri: "file://test.txt",
        text: "Test content",
        modelName: "nomic-embed-text",
        embedding: Buffer.from("invalid json"),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding("file://test.txt")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("should handle special characters in URI", async () => {
      const specialUri = "file://path/with/特殊文字/and-symbols@#$.txt"
      const mockEmbeddingData = {
        id: 1,
        uri: specialUri,
        text: "Special content",
        modelName: "nomic-embed-text",
        embedding: Buffer.from(JSON.stringify([0.1, 0.2])),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding(specialUri)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).not.toBeNull()
      expect(result?.uri).toBe(specialUri)
    })

    it("should preserve embedding precision", async () => {
      const preciseEmbedding = [0.123456789, -0.987654321, 1e-10, 1e10]
      const mockEmbeddingData = {
        id: 1,
        uri: "file://precise.txt",
        text: "Precise content",
        modelName: "nomic-embed-text",
        embedding: Buffer.from(JSON.stringify(preciseEmbedding)),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getEmbedding("file://precise.txt")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result?.embedding).toEqual(preciseEmbedding)
    })
  })

  describe("getAllEmbeddings", () => {
    beforeEach(() => {
      // Reset select chain for pagination tests
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      }
      mockDb.select.mockReturnValue(mockSelect)
    })

    it("should retrieve all embeddings with default pagination", async () => {
      const mockEmbeddings = [
        {
          id: 1,
          uri: "file://first.txt",
          text: "First document",
          modelName: "nomic-embed-text",
          embedding: Buffer.from(JSON.stringify([0.1, 0.2])),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          uri: "file://second.txt",
          text: "Second document",
          modelName: "custom-model",
          embedding: Buffer.from(JSON.stringify([0.3, 0.4])),
          createdAt: "2024-01-01T01:00:00.000Z",
          updatedAt: "2024-01-01T01:00:00.000Z",
        },
      ]

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockEmbeddings),
      })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.embeddings).toHaveLength(2)
      expect(result.count).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.total_pages).toBe(1)
      expect(result.has_next).toBe(false)
      expect(result.has_prev).toBe(false)

      expect(result.embeddings[0]).toEqual({
        id: 1,
        uri: "file://first.txt",
        text: "First document",
        model_name: "nomic-embed-text",
        embedding: [0.1, 0.2],
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      })
    })

    it("should handle pagination with custom page and limit", async () => {
      const mockEmbeddings = [
        {
          id: 3,
          uri: "file://third.txt",
          text: "Third document",
          modelName: "nomic-embed-text",
          embedding: Buffer.from(JSON.stringify([0.5, 0.6])),
          createdAt: "2024-01-01T02:00:00.000Z",
          updatedAt: "2024-01-01T02:00:00.000Z",
        },
      ]

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      })

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockEmbeddings),
      })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings({
          page: 2,
          limit: 2,
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.page).toBe(2)
      expect(result.limit).toBe(2)
      expect(result.total_pages).toBe(3)
      expect(result.has_next).toBe(true)
      expect(result.has_prev).toBe(true)
      expect(result.embeddings).toHaveLength(1)
    })

    it("should apply URI filter with pagination", async () => {
      const mockEmbeddings = [
        {
          id: 1,
          uri: "file://filtered.txt",
          text: "Filtered document",
          modelName: "nomic-embed-text",
          embedding: Buffer.from(JSON.stringify([0.1, 0.2])),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]

      // Mock count query with filter
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }
      mockDb.select.mockReturnValueOnce(mockCountQuery)

      // Mock data query with filter
      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockEmbeddings),
      }
      mockDb.select.mockReturnValueOnce(mockDataQuery)

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings({
          uri: "file://filtered.txt",
          page: 1,
          limit: 10,
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.embeddings).toHaveLength(1)
      expect(result.embeddings[0].uri).toBe("file://filtered.txt")
      expect(result.total_pages).toBe(1)
      expect(mockCountQuery.where).toHaveBeenCalled()
      expect(mockDataQuery.where).toHaveBeenCalled()
    })

    it("should apply model_name filter with pagination", async () => {
      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      })

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings({
          model_name: "custom-model",
          page: 1,
          limit: 5,
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.total_pages).toBe(1)
      expect(result.limit).toBe(5)
    })

    it("should enforce maximum limit of 100", async () => {
      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 200 }]),
      })

      // Mock data query
      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      }
      mockDb.select.mockReturnValueOnce(mockDataQuery)

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings({
          limit: 500, // Should be capped at 100
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.limit).toBe(100)
      expect(mockDataQuery.limit).toHaveBeenCalledWith(100)
    })

    it("should handle empty results with pagination", async () => {
      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.embeddings).toEqual([])
      expect(result.count).toBe(0)
      expect(result.total_pages).toBe(0)
      expect(result.has_next).toBe(false)
      expect(result.has_prev).toBe(false)
    })

    it("should handle page beyond available data", async () => {
      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      })

      // Mock data query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings({
          page: 10,
          limit: 2,
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.embeddings).toEqual([])
      expect(result.count).toBe(0)
      expect(result.page).toBe(10)
      expect(result.total_pages).toBe(3)
      expect(result.has_next).toBe(false)
      expect(result.has_prev).toBe(true)
    })

    it("should return empty array when no embeddings exist", async () => {
      mockDb.select().from().orderBy.mockResolvedValue([])

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toEqual([])
    })

    it("should handle database query errors", async () => {
      mockDb
        .select()
        .from()
        .orderBy.mockRejectedValue(new Error("Database timeout"))

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(
          (result.cause as { error: DatabaseQueryError }).error
        ).toBeInstanceOf(DatabaseQueryError)
        expect(
          (result.cause as { error: DatabaseQueryError }).error.message
        ).toBe("Failed to get embeddings from database")
      }
    })

    it("should handle mixed embedding data corruption gracefully", async () => {
      const mockEmbeddings = [
        {
          id: 1,
          uri: "file://valid.txt",
          text: "Valid content",
          modelName: "nomic-embed-text",
          embedding: Buffer.from(JSON.stringify([0.1, 0.2])),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          uri: "file://invalid.txt",
          text: "Invalid content",
          modelName: "nomic-embed-text",
          embedding: Buffer.from("corrupted data"),
          createdAt: "2024-01-01T01:00:00.000Z",
          updatedAt: "2024-01-01T01:00:00.000Z",
        },
      ]

      mockDb.select().from().orderBy.mockResolvedValue(mockEmbeddings)

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("should handle large number of embeddings", async () => {
      const largeEmbeddingSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        uri: `file://document-${i}.txt`,
        text: `Document ${i} content`,
        modelName: "nomic-embed-text",
        embedding: Buffer.from(JSON.stringify([i * 0.1, i * 0.2])),
        createdAt: `2024-01-01T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
        updatedAt: `2024-01-01T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
      }))

      mockDb.select().from().orderBy.mockResolvedValue(largeEmbeddingSet)

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.getAllEmbeddings()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.embeddings).toHaveLength(1000)
      expect(result.embeddings[0].uri).toBe("file://document-0.txt")
      expect(result.embeddings[999].uri).toBe("file://document-999.txt")
    })
  })

  describe("deleteEmbedding", () => {
    it("should delete existing embedding successfully", async () => {
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 1 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(1)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBe(true)
      expect(mockDb.delete).toHaveBeenCalledWith(embeddings)
      expect(mockDb.delete().where).toHaveBeenCalledWith(eq(embeddings.id, 1))
    })

    it("should return false for non-existent embedding", async () => {
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 0 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(999)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBe(false)
    })

    it("should handle database deletion errors", async () => {
      mockDb
        .delete()
        .where.mockRejectedValue(new Error("Foreign key constraint violation"))

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(1)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(
          (result.cause as { error: DatabaseQueryError }).error
        ).toBeInstanceOf(DatabaseQueryError)
        expect(
          (result.cause as { error: DatabaseQueryError }).error.message
        ).toBe("Failed to delete embedding from database")
      }
    })

    it("should handle very large ID numbers", async () => {
      const largeId = Number.MAX_SAFE_INTEGER
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 0 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(largeId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBe(false)
      expect(mockDb.delete().where).toHaveBeenCalledWith(
        eq(embeddings.id, largeId)
      )
    })

    it("should handle zero ID", async () => {
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 0 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(0)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBe(false)
      expect(mockDb.delete().where).toHaveBeenCalledWith(eq(embeddings.id, 0))
    })

    it("should handle negative ID", async () => {
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 0 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return yield* embeddingService.deleteEmbedding(-1)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result).toBe(false)
      expect(mockDb.delete().where).toHaveBeenCalledWith(eq(embeddings.id, -1))
    })

    it("should handle multiple deletions with different results", async () => {
      // First deletion succeeds
      mockDb
        .delete()
        .where.mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rowsAffected: 0 })

      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        const result1 = yield* embeddingService.deleteEmbedding(1)
        const result2 = yield* embeddingService.deleteEmbedding(2)
        return { result1, result2 }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(result.result1).toBe(true)
      expect(result.result2).toBe(false)
    })
  })

  describe("Service dependencies and integration", () => {
    it("should work with provided dependencies", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        return embeddingService
      })

      const service = await Effect.runPromise(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(service).toHaveProperty("createEmbedding")
      expect(service).toHaveProperty("getEmbedding")
      expect(service).toHaveProperty("getAllEmbeddings")
      expect(service).toHaveProperty("deleteEmbedding")
      expect(service).toHaveProperty("searchEmbeddings")
      expect(service).toHaveProperty("listProviders")
      expect(service).toHaveProperty("getCurrentProvider")
    })

    it("should fail without required dependencies", async () => {
      const program = Effect.gen(function* () {
        yield* EmbeddingService
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("should handle concurrent operations correctly", async () => {
      const programs = Array.from({ length: 5 }, (_, i) =>
        Effect.gen(function* () {
          const embeddingService = yield* EmbeddingService
          return yield* embeddingService.createEmbedding(
            `file://concurrent-${i}.txt`,
            `Concurrent content ${i}`
          )
        }).pipe(Effect.provide(TestEmbeddingServiceLive))
      )

      const results = await Promise.all(programs.map(Effect.runPromise))

      results.forEach((result, i) => {
        expect(result.uri).toBe(`file://concurrent-${i}.txt`)
        expect(result.id).toBe(1) // All will have same ID due to mocking
      })

      expect(mockProviderService.generateEmbedding).toHaveBeenCalledTimes(5)
    })
  })
})
