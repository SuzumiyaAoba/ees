import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { EmbeddingRequest, EmbeddingResponse, OllamaConfig } from "../types"
import { ProviderModelError } from "../types"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the Ollama provider factory function
const createMockOllamaProvider = (config: OllamaConfig) =>
  Effect.gen(function* () {
    const baseUrl = config.baseUrl ?? "http://localhost:11434"

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "nomic-embed-text"

          const response = await fetch(`${baseUrl}/api/embed`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              input: [request.text],
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const result = await response.json() as {
            embeddings: number[][]
            model: string
            total_duration?: number
            load_duration?: number
            prompt_eval_count?: number
          }

          if (!result.embeddings || !Array.isArray(result.embeddings) || result.embeddings.length === 0) {
            throw new Error("Invalid response format from Ollama API")
          }

          const embedding = result.embeddings[0]

          return {
            embedding,
            model: modelName,
            provider: "ollama",
            dimensions: embedding.length,
            tokensUsed: undefined, // Ollama doesn't provide token usage in embed API
          } satisfies EmbeddingResponse
        },
        catch: (error) =>
          new ProviderModelError({
            provider: "ollama",
            modelName:
              request.modelName ?? config.defaultModel ?? "nomic-embed-text",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          }),
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "nomic-embed-text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
          pricePerToken: 0,
        },
        {
          name: "mxbai-embed-large",
          provider: "ollama",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0,
        },
        {
          name: "snowflake-arctic-embed",
          provider: "ollama",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0,
        },
      ])

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        return models.some((model) => model.name.includes(modelName))
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const model = models.find((m) => m.name.includes(modelName))
        return model ?? null
      })

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

describe("Ollama Provider", () => {
  let config: OllamaConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = {
      baseUrl: "http://localhost:11434",
      defaultModel: "nomic-embed-text",
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("generateEmbedding", () => {
    it("should generate embedding with default model", async () => {
      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
        model: "nomic-embed-text",
        total_duration: 1000000,
        load_duration: 500000,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Hello world",
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
      expect(result.model).toBe("nomic-embed-text")
      expect(result.provider).toBe("ollama")
      expect(result.dimensions).toBe(5)
      expect(result.tokensUsed).toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: ["Hello world"],
        }),
      })
    })

    it("should generate embedding with custom model", async () => {
      const mockResponse = {
        embeddings: [[0.5, 0.4, 0.3, 0.2, 0.1]],
        model: "mxbai-embed-large",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Custom model test",
        modelName: "mxbai-embed-large",
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.5, 0.4, 0.3, 0.2, 0.1])
      expect(result.model).toBe("mxbai-embed-large")
      expect(result.dimensions).toBe(5)

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mxbai-embed-large",
          input: ["Custom model test"],
        }),
      })
    })

    it("should use custom base URL", async () => {
      const customConfig: OllamaConfig = {
        baseUrl: "http://custom-ollama:11434",
        defaultModel: "nomic-embed-text",
      }

      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(customConfig))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      await Effect.runPromise(provider.generateEmbedding(request))

      expect(mockFetch).toHaveBeenCalledWith("http://custom-ollama:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      })
    })

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue("Model not found"),
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Test text",
        modelName: "nonexistent-model",
      }

      const result = await Effect.runPromiseExit(provider.generateEmbedding(request))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: ProviderModelError }).error
        expect(error).toBeInstanceOf(ProviderModelError)
        expect(error.provider).toBe("ollama")
        expect(error.modelName).toBe("nonexistent-model")
        expect(error.message).toContain("HTTP 404")
      }
    })

    it("should handle network errors", async () => {
      const networkError = new Error("Network is unreachable")
      mockFetch.mockRejectedValue(networkError)

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      const result = await Effect.runPromiseExit(provider.generateEmbedding(request))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: ProviderModelError }).error
        expect(error).toBeInstanceOf(ProviderModelError)
        expect(error.message).toContain("Failed to generate embedding")
        expect(error.cause).toBe(networkError)
      }
    })

    it("should handle invalid response format", async () => {
      const mockResponse = {
        // Missing embeddings array
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      const result = await Effect.runPromiseExit(provider.generateEmbedding(request))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: ProviderModelError }).error
        expect(error).toBeInstanceOf(ProviderModelError)
        expect(error.message).toContain("Invalid response format")
      }
    })

    it("should handle empty embeddings array", async () => {
      const mockResponse = {
        embeddings: [], // Empty array
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      const result = await Effect.runPromiseExit(provider.generateEmbedding(request))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: ProviderModelError }).error
        expect(error.message).toContain("Invalid response format")
      }
    })

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      const result = await Effect.runPromiseExit(provider.generateEmbedding(request))

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: ProviderModelError }).error
        expect(error).toBeInstanceOf(ProviderModelError)
      }
    })
  })

  describe("listModels", () => {
    it("should return list of available models", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      expect(models).toHaveLength(3)
      expect(models[0]).toEqual({
        name: "nomic-embed-text",
        provider: "ollama",
        dimensions: 768,
        maxTokens: 8192,
        pricePerToken: 0,
      })
      expect(models[1]).toEqual({
        name: "mxbai-embed-large",
        provider: "ollama",
        dimensions: 1024,
        maxTokens: 512,
        pricePerToken: 0,
      })
      expect(models[2]).toEqual({
        name: "snowflake-arctic-embed",
        provider: "ollama",
        dimensions: 1024,
        maxTokens: 512,
        pricePerToken: 0,
      })
    })

    it("should return models with zero price (local/free)", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      models.forEach(model => {
        expect(model.pricePerToken).toBe(0)
        expect(model.provider).toBe("ollama")
      })
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available models", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const nomicAvailable = await Effect.runPromise(provider.isModelAvailable("nomic-embed-text"))
      const mxbaiAvailable = await Effect.runPromise(provider.isModelAvailable("mxbai-embed-large"))
      const snowflakeAvailable = await Effect.runPromise(provider.isModelAvailable("snowflake-arctic-embed"))

      expect(nomicAvailable).toBe(true)
      expect(mxbaiAvailable).toBe(true)
      expect(snowflakeAvailable).toBe(true)
    })

    it("should return true for partial model name matches", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const nomicPartial = await Effect.runPromise(provider.isModelAvailable("nomic"))
      const mxbaiPartial = await Effect.runPromise(provider.isModelAvailable("mxbai"))
      const snowflakePartial = await Effect.runPromise(provider.isModelAvailable("snowflake"))

      expect(nomicPartial).toBe(true)
      expect(mxbaiPartial).toBe(true)
      expect(snowflakePartial).toBe(true)
    })

    it("should return false for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const unavailable = await Effect.runPromise(provider.isModelAvailable("gpt-4"))
      const nonexistent = await Effect.runPromise(provider.isModelAvailable("nonexistent-model"))

      expect(unavailable).toBe(false)
      expect(nonexistent).toBe(false)
    })
  })

  describe("getModelInfo", () => {
    it("should return model info for available models", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const nomicInfo = await Effect.runPromise(provider.getModelInfo("nomic-embed-text"))
      const mxbaiInfo = await Effect.runPromise(provider.getModelInfo("mxbai-embed-large"))

      expect(nomicInfo).toEqual({
        name: "nomic-embed-text",
        provider: "ollama",
        dimensions: 768,
        maxTokens: 8192,
        pricePerToken: 0,
      })

      expect(mxbaiInfo).toEqual({
        name: "mxbai-embed-large",
        provider: "ollama",
        dimensions: 1024,
        maxTokens: 512,
        pricePerToken: 0,
      })
    })

    it("should return model info for partial name matches", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const nomicPartial = await Effect.runPromise(provider.getModelInfo("nomic"))
      const snowflakePartial = await Effect.runPromise(provider.getModelInfo("arctic"))

      expect(nomicPartial?.name).toBe("nomic-embed-text")
      expect(snowflakePartial?.name).toBe("snowflake-arctic-embed")
    })

    it("should return null for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockOllamaProvider(config))

      const unavailable = await Effect.runPromise(provider.getModelInfo("gpt-4"))
      const nonexistent = await Effect.runPromise(provider.getModelInfo("nonexistent-model"))

      expect(unavailable).toBeNull()
      expect(nonexistent).toBeNull()
    })
  })

  describe("Configuration", () => {
    it("should use default base URL when not specified", async () => {
      const configWithoutUrl: OllamaConfig = {
        defaultModel: "nomic-embed-text",
      }

      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(configWithoutUrl))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      await Effect.runPromise(provider.generateEmbedding(request))

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      })
    })

    it("should use default model when not specified in request", async () => {
      const customConfig: OllamaConfig = {
        baseUrl: "http://localhost:11434",
        defaultModel: "mxbai-embed-large",
      }

      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "mxbai-embed-large",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(customConfig))
      const request: EmbeddingRequest = {
        text: "Test text",
        // No modelName specified
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.model).toBe("mxbai-embed-large")
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mxbai-embed-large",
          input: ["Test text"],
        }),
      })
    })

    it("should fallback to nomic-embed-text when no config default", async () => {
      const minimalConfig: OllamaConfig = {}

      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(minimalConfig))
      const request: EmbeddingRequest = {
        text: "Test text",
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.model).toBe("nomic-embed-text")
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: ["Test text"],
        }),
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle large text input", async () => {
      const largeText = "A".repeat(10000)
      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: largeText,
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.1, 0.2, 0.3])
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: [largeText],
        }),
      })
    })

    it("should handle empty text input", async () => {
      const mockResponse = {
        embeddings: [[0.0, 0.0, 0.0]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: "",
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.0, 0.0, 0.0])
    })

    it("should handle special characters in text", async () => {
      const specialText = "Hello 世界! 🌍 ñ á ü @#$%^&*()"
      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "nomic-embed-text",
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
        text: vi.fn().mockResolvedValue(""),
        status: 200,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request: EmbeddingRequest = {
        text: specialText,
      }

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.1, 0.2, 0.3])
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: [specialText],
        }),
      })
    })
  })
})