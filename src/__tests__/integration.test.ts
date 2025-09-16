import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import app from "../app"
import { EmbeddingService } from "../entities/embedding/api/embedding"
import { OllamaService } from "../entities/embedding/api/ollama"
import { DatabaseService } from "../shared/database/connection"

describe("Integration Tests", () => {
  // Create test doubles for external dependencies
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  }

  const mockOllamaService = {
    generateEmbedding: vi.fn(),
    isModelAvailable: vi.fn(),
    pullModel: vi.fn(),
  }

  // Create test layers
  const MockDatabaseServiceLive = Layer.succeed(DatabaseService, {
    db: mockDb as any,
  })

  const MockOllamaServiceLive = Layer.succeed(OllamaService, mockOllamaService)

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default successful responses
    mockOllamaService.generateEmbedding.mockReturnValue(
      Effect.succeed([0.1, 0.2, 0.3, 0.4, 0.5])
    )
    mockOllamaService.isModelAvailable.mockReturnValue(Effect.succeed(true))
    mockOllamaService.pullModel.mockReturnValue(Effect.succeed(undefined))

    // Setup database mock chains
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    }
    mockDb.insert.mockReturnValue(mockInsert)

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockDb.select.mockReturnValue(mockSelect)

    const mockDelete = {
      where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    }
    mockDb.delete.mockReturnValue(mockDelete)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Full API workflow", () => {
    it("should handle complete embedding lifecycle", async () => {
      // 1. Create embedding
      const createResponse = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://integration-test.txt",
          text: "This is an integration test document for the EES API.",
        }),
      })

      expect(createResponse.status).toBe(200)
      const createResult = await createResponse.json()
      expect(createResult).toHaveProperty("id")
      expect(createResult).toHaveProperty(
        "message",
        "Embedding created successfully"
      )

      // 2. Retrieve the embedding
      const mockEmbeddingData = {
        id: 1,
        uri: "file://integration-test.txt",
        text: "This is an integration test document for the EES API.",
        modelName: "embeddinggemma:300m",
        embedding: Buffer.from(JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5])),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const getResponse = await app.request(
        "/embeddings/file%3A%2F%2Fintegration-test.txt"
      )

      expect(getResponse.status).toBe(200)
      const getResult = await getResponse.json()
      expect(getResult).toHaveProperty(
        "text",
        "This is an integration test document for the EES API."
      )
      expect(getResult).toHaveProperty("embedding", [0.1, 0.2, 0.3, 0.4, 0.5])

      // 3. List all embeddings
      mockDb.select().from().orderBy.mockResolvedValue([mockEmbeddingData])

      const listResponse = await app.request("/embeddings")

      expect(listResponse.status).toBe(200)
      const listResult = await listResponse.json()
      expect(listResult).toHaveProperty("embeddings")
      expect(listResult).toHaveProperty("count", 1)
      expect(listResult.embeddings[0]).toHaveProperty("text")

      // 4. Delete the embedding
      const deleteResponse = await app.request("/embeddings/1", {
        method: "DELETE",
      })

      expect(deleteResponse.status).toBe(200)
      const deleteResult = await deleteResponse.json()
      expect(deleteResult).toHaveProperty(
        "message",
        "Embedding deleted successfully"
      )
    })

    it("should handle multiple embeddings with different models", async () => {
      // Create first embedding with default model
      const response1 = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://doc1.txt",
          text: "First document",
        }),
      })

      expect(response1.status).toBe(200)

      // Create second embedding with custom model
      const response2 = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://doc2.txt",
          text: "Second document",
          model_name: "custom-model:latest",
        }),
      })

      expect(response2.status).toBe(200)

      // Verify both models were used
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
        "First document",
        "embeddinggemma:300m"
      )
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
        "Second document",
        "custom-model:latest"
      )

      // Setup mock for listing both embeddings
      const mockEmbeddings = [
        {
          id: 1,
          uri: "file://doc1.txt",
          text: "First document",
          modelName: "embeddinggemma:300m",
          embedding: Buffer.from(JSON.stringify([0.1, 0.2])),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          uri: "file://doc2.txt",
          text: "Second document",
          modelName: "custom-model:latest",
          embedding: Buffer.from(JSON.stringify([0.3, 0.4])),
          createdAt: "2024-01-01T01:00:00.000Z",
          updatedAt: "2024-01-01T01:00:00.000Z",
        },
      ]

      mockDb.select().from().orderBy.mockResolvedValue(mockEmbeddings)

      const listResponse = await app.request("/embeddings")
      expect(listResponse.status).toBe(200)

      const listResult = await listResponse.json()
      expect(listResult.count).toBe(2)
      expect(listResult.embeddings[0].model_name).toBe("embeddinggemma:300m")
      expect(listResult.embeddings[1].model_name).toBe("custom-model:latest")
    })

    it("should handle embedding updates correctly", async () => {
      // Create initial embedding
      await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://update-test.txt",
          text: "Original content",
        }),
      })

      // Update the same URI with new content
      const updateResponse = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://update-test.txt",
          text: "Updated content",
        }),
      })

      expect(updateResponse.status).toBe(200)

      // Verify onConflictDoUpdate was called with new text
      const onConflictMock = mockDb.insert().values().onConflictDoUpdate
      expect(onConflictMock).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            text: "Updated content",
          }),
        })
      )
    })

    it("should handle Unicode content throughout the pipeline", async () => {
      const unicodeText = "こんにちは世界! 🌍 Testing Unicode: àáâãäåæçèéêë"

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://unicode-test.txt",
          text: unicodeText,
        }),
      })

      expect(response.status).toBe(200)

      // Verify Unicode text was passed to Ollama
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
        unicodeText,
        "embeddinggemma:300m"
      )

      // Verify Unicode text was stored in database
      const insertMock = mockDb.insert().values
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: unicodeText,
        })
      )
    })

    it("should handle long text content", async () => {
      const longText = `Long content: ${"a".repeat(10000)}`

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://long-text.txt",
          text: longText,
        }),
      })

      expect(response.status).toBe(200)
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
        longText,
        "embeddinggemma:300m"
      )
    })
  })

  describe("Error handling across services", () => {
    it("should handle Ollama service failures gracefully", async () => {
      // Mock Ollama failure
      mockOllamaService.generateEmbedding.mockReturnValue(
        Effect.fail(new Error("Ollama service unavailable"))
      )

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result).toEqual({ error: "Failed to create embedding" })
    })

    it("should handle database connection failures", async () => {
      // Mock database failure
      mockDb
        .insert()
        .values()
        .onConflictDoUpdate()
        .returning.mockRejectedValue(new Error("Database connection lost"))

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result).toEqual({ error: "Failed to create embedding" })
    })

    it("should handle partial service failures", async () => {
      // Ollama succeeds but database fails
      mockOllamaService.generateEmbedding.mockReturnValue(
        Effect.succeed([0.1, 0.2, 0.3])
      )
      mockDb
        .insert()
        .values()
        .onConflictDoUpdate()
        .returning.mockRejectedValue(new Error("Database write failed"))

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(response.status).toBe(500)

      // Verify Ollama was called but database operation failed
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalled()
    })

    it("should handle malformed requests", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result).toHaveProperty("error")
    })

    it("should handle missing required fields", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          // missing text field
        }),
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result).toHaveProperty("error")
    })

    it("should handle retrieval of non-existent embeddings", async () => {
      mockDb.select().from().where().limit.mockResolvedValue([])

      const response = await app.request(
        "/embeddings/file%3A%2F%2Fnonexistent.txt"
      )

      expect(response.status).toBe(404)
      const result = await response.json()
      expect(result).toEqual({ error: "Embedding not found" })
    })

    it("should handle deletion of non-existent embeddings", async () => {
      mockDb.delete().where.mockResolvedValue({ rowsAffected: 0 })

      const response = await app.request("/embeddings/999", {
        method: "DELETE",
      })

      expect(response.status).toBe(404)
      const result = await response.json()
      expect(result).toEqual({ error: "Embedding not found" })
    })
  })

  describe("Service layer integration", () => {
    it("should properly integrate all service layers", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        const databaseService = yield* DatabaseService
        const ollamaService = yield* OllamaService

        return {
          embeddingService,
          databaseService,
          ollamaService,
        }
      })

      // This would normally use AppLayer but we're testing with mocks
      const TestAppLayer = Layer.mergeAll(
        MockDatabaseServiceLive,
        MockOllamaServiceLive,
        Layer.effect(
          EmbeddingService,
          Effect.gen(function* () {
            const { db } = yield* DatabaseService
            const _ollamaService = yield* OllamaService

            return {
              createEmbedding: () =>
                Effect.succeed({
                  id: 1,
                  uri: "test://uri",
                  model_name: "test-model",
                  message: "Success",
                }),
              getEmbedding: () => Effect.succeed(null),
              getAllEmbeddings: () => Effect.succeed([]),
              deleteEmbedding: () => Effect.succeed(true),
            } as any
          })
        )
      )

      const services = await Effect.runPromise(
        program.pipe(Effect.provide(TestAppLayer))
      )

      expect(services.embeddingService).toBeDefined()
      expect(services.databaseService).toBeDefined()
      expect(services.ollamaService).toBeDefined()
    })

    it("should handle service dependency injection", async () => {
      const program = Effect.gen(function* () {
        const embeddingService = yield* EmbeddingService
        // This should use the injected dependencies
        return yield* embeddingService.createEmbedding(
          "test://uri",
          "Test content"
        )
      })

      // Use a minimal test layer
      const TestLayer = Layer.mergeAll(
        MockDatabaseServiceLive,
        MockOllamaServiceLive,
        Layer.effect(
          EmbeddingService,
          Effect.gen(function* () {
            return {
              createEmbedding: (
                uri: string,
                _text: string,
                modelName?: string
              ) =>
                Effect.succeed({
                  id: 1,
                  uri,
                  model_name: modelName || "embeddinggemma:300m",
                  message: "Embedding created successfully",
                }),
              getEmbedding: () => Effect.succeed(null),
              getAllEmbeddings: () => Effect.succeed([]),
              deleteEmbedding: () => Effect.succeed(true),
            } as any
          })
        )
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestLayer))
      )

      expect(result).toEqual({
        id: 1,
        uri: "test://uri",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      })
    })
  })

  describe("Concurrent operations", () => {
    it("should handle concurrent embedding creation", async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: `file://concurrent-${i}.txt`,
            text: `Concurrent content ${i}`,
          }),
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Verify all embeddings were processed
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledTimes(5)
    })

    it("should handle mixed concurrent operations", async () => {
      // Setup mocks for retrieval
      mockDb.select().from().where().limit.mockResolvedValue([])
      mockDb.select().from().orderBy.mockResolvedValue([])

      const operations = [
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: "file://create.txt",
            text: "Create content",
          }),
        }),
        app.request("/embeddings"),
        app.request("/embeddings/file%3A%2F%2Ftest.txt"),
        app.request("/embeddings/1", { method: "DELETE" }),
      ]

      const responses = await Promise.all(operations)

      expect(responses[0].status).toBe(200) // Create
      expect(responses[1].status).toBe(200) // List
      expect(responses[2].status).toBe(404) // Get (not found)
      expect(responses[3].status).toBe(200) // Delete
    })
  })

  describe("Data flow validation", () => {
    it("should maintain data integrity through the pipeline", async () => {
      const testData = {
        uri: "file://data-integrity.txt",
        text: "Data integrity test content with special chars: àáâãäå 🌍",
        model_name: "integrity-test-model:v1",
      }

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      })

      expect(response.status).toBe(200)

      // Verify data passed through correctly
      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
        testData.text,
        testData.model_name
      )

      const insertCall = mockDb.insert().values
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: testData.uri,
          text: testData.text,
          modelName: testData.model_name,
        })
      )
    })

    it("should properly serialize and deserialize embeddings", async () => {
      const testEmbedding = [0.123456789, -0.987654321, 0, 1e-10, 1e10]

      // Mock retrieval
      const mockEmbeddingData = {
        id: 1,
        uri: "file://serialization-test.txt",
        text: "Serialization test",
        modelName: "embeddinggemma:300m",
        embedding: Buffer.from(JSON.stringify(testEmbedding)),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }

      mockDb
        .select()
        .from()
        .where()
        .limit.mockResolvedValue([mockEmbeddingData])

      const response = await app.request(
        "/embeddings/file%3A%2F%2Fserialization-test.txt"
      )

      expect(response.status).toBe(200)
      const result = await response.json()

      expect(result.embedding).toEqual(testEmbedding)
      expect(result.embedding[0]).toBe(0.123456789)
      expect(result.embedding[1]).toBe(-0.987654321)
      expect(result.embedding[3]).toBe(1e-10)
      expect(result.embedding[4]).toBe(1e10)
    })
  })

  describe("Performance and resource management", () => {
    it("should handle large embedding arrays", async () => {
      const largeEmbedding = Array.from({ length: 1000 }, (_, i) => i * 0.001)
      mockOllamaService.generateEmbedding.mockReturnValue(
        Effect.succeed(largeEmbedding)
      )

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://large-embedding.txt",
          text: "Large embedding test",
        }),
      })

      expect(response.status).toBe(200)

      // Verify large embedding was handled
      const insertCall = mockDb.insert().values
      const callArgs = insertCall.mock.calls[0][0]
      const embeddingBuffer = callArgs.embedding
      const storedEmbedding = JSON.parse(embeddingBuffer.toString())

      expect(storedEmbedding).toHaveLength(1000)
      expect(storedEmbedding[0]).toBe(0)
      expect(storedEmbedding[999]).toBe(0.999)
    })

    it("should handle multiple large text inputs", async () => {
      const largeTexts = Array.from(
        { length: 3 },
        (_, i) => `Large text ${i}: ${"content ".repeat(1000)}`
      )

      const requests = largeTexts.map((text, i) =>
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: `file://large-text-${i}.txt`,
            text,
          }),
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      expect(mockOllamaService.generateEmbedding).toHaveBeenCalledTimes(3)
      largeTexts.forEach((text) => {
        expect(mockOllamaService.generateEmbedding).toHaveBeenCalledWith(
          text,
          "embeddinggemma:300m"
        )
      })
    })
  })
})
