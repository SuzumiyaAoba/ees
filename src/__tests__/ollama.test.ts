import { Effect, Exit } from "effect"
import { Ollama } from "ollama"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OllamaConnectionError, OllamaModelError } from "../errors/ollama"
import { OllamaService, OllamaServiceLive } from "../services/ollama"

// Mock the Ollama client
vi.mock("ollama", () => ({
  Ollama: vi.fn(),
}))

describe("OllamaService", () => {
  const mockOllama = {
    embeddings: vi.fn(),
    list: vi.fn(),
    pull: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Ollama).mockImplementation(() => mockOllama as any)

    // Setup default successful responses
    mockOllama.embeddings.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    })

    mockOllama.list.mockResolvedValue({
      models: [
        { name: "embeddinggemma:300m" },
        { name: "another-model:latest" },
      ],
    })

    mockOllama.pull.mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Service initialization", () => {
    it("should create Ollama client with correct configuration", async () => {
      const program = Effect.gen(function* () {
        yield* OllamaService
      })

      await Effect.runPromise(program.pipe(Effect.provide(OllamaServiceLive)))

      expect(Ollama).toHaveBeenCalledWith({
        host: "http://localhost:11434",
      })
    })

    it("should provide all required service methods", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OllamaService
        return service
      })

      const service = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(service).toHaveProperty("generateEmbedding")
      expect(service).toHaveProperty("isModelAvailable")
      expect(service).toHaveProperty("pullModel")
      expect(typeof service.generateEmbedding).toBe("function")
      expect(typeof service.isModelAvailable).toBe("function")
      expect(typeof service.pullModel).toBe("function")
    })
  })

  describe("generateEmbedding", () => {
    it("should generate embedding with default model", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Test text")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
        prompt: "Test text",
      })
    })

    it("should generate embedding with custom model", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding(
          "Custom text",
          "custom-model:latest"
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "custom-model:latest",
        prompt: "Custom text",
      })
    })

    it("should handle long text input", async () => {
      const longText = "a".repeat(10000)

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding(longText)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
        prompt: longText,
      })
    })

    it("should handle Unicode and special characters", async () => {
      const unicodeText = 'こんにちは世界! 🌍 Special chars: <>&"'

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding(unicodeText)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
        prompt: unicodeText,
      })
    })

    it("should handle empty text input", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
        prompt: "",
      })
    })

    it("should handle whitespace-only text", async () => {
      const whitespaceText = "   \n\t\r   "

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding(whitespaceText)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(mockOllama.embeddings).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
        prompt: whitespaceText,
      })
    })

    it("should return empty array when Ollama returns empty embedding", async () => {
      mockOllama.embeddings.mockResolvedValue({
        embedding: [],
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Test text")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual([])
    })

    it("should preserve floating point precision", async () => {
      const preciseEmbedding = [
        0.123456789,
        -0.987654321,
        1e-10,
        1e10,
        Math.PI,
        Math.E,
      ]
      mockOllama.embeddings.mockResolvedValue({
        embedding: preciseEmbedding,
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Precise test")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toEqual(preciseEmbedding)
    })

    it("should handle Ollama connection errors", async () => {
      mockOllama.embeddings.mockRejectedValue(new Error("Connection refused"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Test text")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(result.cause.error).toBeInstanceOf(OllamaModelError)
        expect(result.cause.error.message).toBe(
          "Failed to generate embedding using model embeddinggemma:300m"
        )
        expect(result.cause.error.modelName).toBe("embeddinggemma:300m")
      }
    })

    it("should handle model not found errors", async () => {
      mockOllama.embeddings.mockRejectedValue(new Error("Model not found"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding(
          "Test text",
          "nonexistent-model"
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause.error).toBeInstanceOf(OllamaModelError)
        expect(result.cause.error.message).toBe(
          "Failed to generate embedding using model nonexistent-model"
        )
        expect(result.cause.error.modelName).toBe("nonexistent-model")
      }
    })

    it("should handle malformed response from Ollama", async () => {
      mockOllama.embeddings.mockResolvedValue({
        // Missing embedding field
        other_field: "unexpected",
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Test text")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      // Should handle undefined embedding gracefully
      expect(result).toBeUndefined()
    })

    it("should handle timeout errors", async () => {
      mockOllama.embeddings.mockRejectedValue(new Error("Request timeout"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Test text")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause.error).toBeInstanceOf(OllamaModelError)
        expect(result.cause.error.cause).toEqual(new Error("Request timeout"))
      }
    })

    it("should handle very large embeddings", async () => {
      const largeEmbedding = Array.from({ length: 10000 }, (_, i) => i * 0.001)
      mockOllama.embeddings.mockResolvedValue({
        embedding: largeEmbedding,
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.generateEmbedding("Large embedding test")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toHaveLength(10000)
      expect(result[0]).toBe(0)
      expect(result[9999]).toBe(9.999)
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available default model", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(true)
      expect(mockOllama.list).toHaveBeenCalled()
    })

    it("should return true for available custom model", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("another-model:latest")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(true)
    })

    it("should return false for unavailable model", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("nonexistent-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(false)
    })

    it("should handle partial model name matches", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("embeddinggemma")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(true) // Should match "embeddinggemma:300m"
    })

    it("should handle case-sensitive model names", async () => {
      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("EMBEDDINGGEMMA:300M")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(false) // Case sensitive, should not match
    })

    it("should handle empty model list", async () => {
      mockOllama.list.mockResolvedValue({
        models: [],
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(false)
    })

    it("should handle malformed model list response", async () => {
      mockOllama.list.mockResolvedValue({
        models: [
          { name: "valid-model" },
          {
            /* missing name field */
          },
          { name: null },
          { name: "" },
        ],
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("valid-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(true)
    })

    it("should handle Ollama connection errors", async () => {
      mockOllama.list.mockRejectedValue(new Error("Connection failed"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(result.cause.error).toBeInstanceOf(OllamaConnectionError)
        expect(result.cause.error.message).toBe(
          "Failed to check model availability"
        )
      }
    })

    it("should handle very large model lists", async () => {
      const largeModelList = Array.from({ length: 1000 }, (_, i) => ({
        name: `model-${i}:latest`,
      }))
      largeModelList.push({ name: "target-model:latest" })

      mockOllama.list.mockResolvedValue({
        models: largeModelList,
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.isModelAvailable("target-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result).toBe(true)
    })

    it("should handle special characters in model names", async () => {
      mockOllama.list.mockResolvedValue({
        models: [
          { name: "model-with-special@chars:v1.0" },
          { name: "model_with_underscores:latest" },
          { name: "model.with.dots:123" },
        ],
      })

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        const result1 =
          yield* ollamaService.isModelAvailable("model-with-special")
        const result2 = yield* ollamaService.isModelAvailable(
          "model_with_underscores"
        )
        const result3 = yield* ollamaService.isModelAvailable("model.with.dots")
        return { result1, result2, result3 }
      })

      const results = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(results.result1).toBe(true)
      expect(results.result2).toBe(true)
      expect(results.result3).toBe(true)
    })
  })

  describe("pullModel", () => {
    it("should pull default model successfully", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel()
      })

      await Effect.runPromise(program.pipe(Effect.provide(OllamaServiceLive)))

      expect(mockOllama.pull).toHaveBeenCalledWith({
        model: "embeddinggemma:300m",
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        "Pulling model embeddinggemma:300m..."
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        "Model embeddinggemma:300m pulled successfully"
      )

      consoleSpy.mockRestore()
    })

    it("should pull custom model successfully", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel("custom-model:latest")
      })

      await Effect.runPromise(program.pipe(Effect.provide(OllamaServiceLive)))

      expect(mockOllama.pull).toHaveBeenCalledWith({
        model: "custom-model:latest",
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        "Pulling model custom-model:latest..."
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        "Model custom-model:latest pulled successfully"
      )

      consoleSpy.mockRestore()
    })

    it("should handle pull errors", async () => {
      mockOllama.pull.mockRejectedValue(
        new Error("Model not found in registry")
      )

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel("nonexistent-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect(result.cause.error).toBeInstanceOf(OllamaModelError)
        expect(result.cause.error.message).toBe(
          "Failed to pull model nonexistent-model"
        )
        expect(result.cause.error.modelName).toBe("nonexistent-model")
      }
    })

    it("should handle network timeout during pull", async () => {
      mockOllama.pull.mockRejectedValue(new Error("Network timeout"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause.error).toBeInstanceOf(OllamaModelError)
        expect(result.cause.error.cause).toEqual(new Error("Network timeout"))
      }
    })

    it("should handle disk space errors", async () => {
      mockOllama.pull.mockRejectedValue(new Error("No space left on device"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel("large-model:latest")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause.error.message).toBe(
          "Failed to pull model large-model:latest"
        )
      }
    })

    it("should log progress messages", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel("test-model:v1")
      })

      await Effect.runPromise(program.pipe(Effect.provide(OllamaServiceLive)))

      expect(consoleSpy).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "Pulling model test-model:v1..."
      )
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "Model test-model:v1 pulled successfully"
      )

      consoleSpy.mockRestore()
    })

    it("should not log success message on failure", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      mockOllama.pull.mockRejectedValue(new Error("Pull failed"))

      const program = Effect.gen(function* () {
        const ollamaService = yield* OllamaService
        return yield* ollamaService.pullModel("failing-model")
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      expect(consoleSpy).toHaveBeenCalledTimes(1) // Only the initial "Pulling..." message
      expect(consoleSpy).toHaveBeenCalledWith("Pulling model failing-model...")

      consoleSpy.mockRestore()
    })
  })

  describe("Service integration and edge cases", () => {
    it("should work without dependencies", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OllamaService
        return service
      })

      const service = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(service).toBeDefined()
      expect(Ollama).toHaveBeenCalledWith({
        host: "http://localhost:11434",
      })
    })

    it("should handle concurrent operations", async () => {
      const programs = [
        Effect.gen(function* () {
          const service = yield* OllamaService
          return yield* service.generateEmbedding("Text 1")
        }),
        Effect.gen(function* () {
          const service = yield* OllamaService
          return yield* service.generateEmbedding("Text 2")
        }),
        Effect.gen(function* () {
          const service = yield* OllamaService
          return yield* service.isModelAvailable("embeddinggemma:300m")
        }),
      ]

      const results = await Promise.all(
        programs.map((program) =>
          Effect.runPromise(program.pipe(Effect.provide(OllamaServiceLive)))
        )
      )

      expect(results[0]).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(results[1]).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(results[2]).toBe(true)

      expect(mockOllama.embeddings).toHaveBeenCalledTimes(2)
      expect(mockOllama.list).toHaveBeenCalledTimes(1)
    })

    it("should maintain service state across multiple calls", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OllamaService
        const embedding1 = yield* service.generateEmbedding("First call")
        const embedding2 = yield* service.generateEmbedding("Second call")
        const isAvailable = yield* service.isModelAvailable()
        return { embedding1, embedding2, isAvailable }
      })

      const results = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(results.embedding1).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(results.embedding2).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(results.isAvailable).toBe(true)

      // Should reuse the same Ollama instance
      expect(Ollama).toHaveBeenCalledTimes(1)
    })

    it("should handle service reinitialization", async () => {
      // First service instance
      const program1 = Effect.gen(function* () {
        const service = yield* OllamaService
        return yield* service.generateEmbedding("Test 1")
      })

      const result1 = await Effect.runPromise(
        program1.pipe(Effect.provide(OllamaServiceLive))
      )

      // Second service instance (should reuse the layer)
      const program2 = Effect.gen(function* () {
        const service = yield* OllamaService
        return yield* service.generateEmbedding("Test 2")
      })

      const result2 = await Effect.runPromise(
        program2.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(result1).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(result2).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
    })

    it("should handle mixed success and failure scenarios", async () => {
      // Setup mixed responses
      mockOllama.embeddings
        .mockResolvedValueOnce({ embedding: [1, 2, 3] })
        .mockRejectedValueOnce(new Error("Model busy"))
        .mockResolvedValueOnce({ embedding: [4, 5, 6] })

      const program = Effect.gen(function* () {
        const service = yield* OllamaService
        const success1 = yield* service.generateEmbedding("Success 1")
        const failure = yield* Effect.either(
          service.generateEmbedding("Failure")
        )
        const success2 = yield* service.generateEmbedding("Success 2")
        return { success1, failure, success2 }
      })

      const results = await Effect.runPromise(
        program.pipe(Effect.provide(OllamaServiceLive))
      )

      expect(results.success1).toEqual([1, 2, 3])
      expect(results.failure._tag).toBe("Left")
      expect(results.success2).toEqual([4, 5, 6])
    })
  })
})
