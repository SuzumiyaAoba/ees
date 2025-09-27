import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { EmbeddingRequest, EmbeddingResponse, OllamaConfig } from "../types"
import { ProviderModelError } from "../types"
import {
  createMockEmbeddingResponse,
  setupMockFetch,
  setupMockFetchError,
  setupMockFetchJsonError,
  expectEmbeddingResult,
  expectProviderError,
  expectFetchCall,
  createTestRequest,
  createTestEnvironment,
  createProviderInstance,
  testProviderEmbedding,
  setupSuccessTest,
  TEST_EMBEDDINGS,
  TEST_MODELS,
} from "./test-helpers"

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
  let testEnv: ReturnType<typeof createTestEnvironment>

  beforeEach(() => {
    testEnv = createTestEnvironment()
    config = {
      baseUrl: "http://localhost:11434",
      defaultModel: "nomic-embed-text",
    }
  })

  afterEach(() => {
    testEnv.cleanup()
  })

  describe("generateEmbedding", () => {
    it("should generate embedding with default model", async () => {
      await testProviderEmbedding({
        providerFactory: createMockOllamaProvider,
        providerArgs: [config],
        text: "Hello world",
        embedding: TEST_EMBEDDINGS.SMALL,
        expectedModel: "nomic-embed-text",
        expectedProvider: "ollama",
        mockOptions: {
          total_duration: 1000000,
          load_duration: 500000,
        },
      })

      expectFetchCall("http://localhost:11434/api/embed", {
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
      const customEmbedding = [0.5, 0.4, 0.3, 0.2, 0.1]

      await testProviderEmbedding({
        providerFactory: createMockOllamaProvider,
        providerArgs: [config],
        text: "Custom model test",
        modelName: TEST_MODELS.OLLAMA.MXBAI,
        embedding: customEmbedding,
        expectedModel: TEST_MODELS.OLLAMA.MXBAI,
        expectedProvider: "ollama",
      })

      expectFetchCall("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.OLLAMA.MXBAI,
          input: ["Custom model test"],
        }),
      })
    })

    it("should use custom base URL", async () => {
      const customConfig: OllamaConfig = {
        baseUrl: "http://custom-ollama:11434",
        defaultModel: "nomic-embed-text",
      }

      await testProviderEmbedding({
        providerFactory: createMockOllamaProvider,
        providerArgs: [customConfig],
        text: "Test text",
        embedding: [0.1, 0.2, 0.3],
        expectedModel: "nomic-embed-text",
        expectedProvider: "ollama",
      })

      expectFetchCall("http://custom-ollama:11434/api/embed", {
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

    it("should handle HTTP errors", async () => {
      setupMockFetch({
        ok: false,
        status: 404,
        error: "Model not found",
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("Test text", "nonexistent-model")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("ollama")
      expect(error.modelName).toBe("nonexistent-model")
      expect(error.message).toContain("HTTP 404")
    })

    it("should handle network errors", async () => {
      const networkError = new Error("Network is unreachable")
      setupMockFetchError(networkError)

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("Test text")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.message).toContain("Failed to generate embedding")
      expect(error.cause).toBe(networkError)
    })

    it("should handle invalid response format", async () => {
      const mockResponse = {
        // Missing embeddings array
        model: "nomic-embed-text",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("Test text")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.message).toContain("Invalid response format")
    })

    it("should handle empty embeddings array", async () => {
      const mockResponse = {
        embeddings: [], // Empty array
        model: "nomic-embed-text",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("Test text")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.message).toContain("Invalid response format")
    })

    it("should handle malformed JSON response", async () => {
      const jsonError = new Error("Invalid JSON")
      setupMockFetchJsonError(jsonError)

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("Test text")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error).toBeInstanceOf(ProviderModelError)
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

      const mockResponse = createMockEmbeddingResponse(
        [0.1, 0.2, 0.3],
        "nomic-embed-text"
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(configWithoutUrl))
      const request = createTestRequest("Test text")

      await Effect.runPromise(provider.generateEmbedding(request))

      expectFetchCall("http://localhost:11434/api/embed", {
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

    it("should use default model when not specified in request", async () => {
      const customConfig: OllamaConfig = {
        baseUrl: "http://localhost:11434",
        defaultModel: TEST_MODELS.OLLAMA.MXBAI,
      }

      const mockResponse = createMockEmbeddingResponse(
        [0.1, 0.2, 0.3],
        TEST_MODELS.OLLAMA.MXBAI
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(customConfig))
      const request = createTestRequest("Test text")
      // No modelName specified

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.model).toBe(TEST_MODELS.OLLAMA.MXBAI)
      expectFetchCall("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.OLLAMA.MXBAI,
          input: ["Test text"],
        }),
      })
    })

    it("should fallback to nomic-embed-text when no config default", async () => {
      const minimalConfig: OllamaConfig = {}

      const mockResponse = createMockEmbeddingResponse(
        [0.1, 0.2, 0.3],
        TEST_MODELS.OLLAMA.NOMIC
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(minimalConfig))
      const request = createTestRequest("Test text")

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.model).toBe(TEST_MODELS.OLLAMA.NOMIC)
      expectFetchCall("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.OLLAMA.NOMIC,
          input: ["Test text"],
        }),
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle large text input", async () => {
      const largeText = "A".repeat(10000)
      const mockResponse = createMockEmbeddingResponse(
        [0.1, 0.2, 0.3],
        TEST_MODELS.OLLAMA.NOMIC
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest(largeText)

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.1, 0.2, 0.3])
      expectFetchCall("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.OLLAMA.NOMIC,
          input: [largeText],
        }),
      })
    })

    it("should handle empty text input", async () => {
      const mockResponse = createMockEmbeddingResponse(
        [0.0, 0.0, 0.0],
        TEST_MODELS.OLLAMA.NOMIC
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest("")

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.0, 0.0, 0.0])
    })

    it("should handle special characters in text", async () => {
      const specialText = "Hello 世界! 🌍 ñ á ü @#$%^&*()"
      const mockResponse = createMockEmbeddingResponse(
        [0.1, 0.2, 0.3],
        TEST_MODELS.OLLAMA.NOMIC
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: mockResponse,
      })

      const provider = await Effect.runPromise(createMockOllamaProvider(config))
      const request = createTestRequest(specialText)

      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expect(result.embedding).toEqual([0.1, 0.2, 0.3])
      expectFetchCall("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.OLLAMA.NOMIC,
          input: [specialText],
        }),
      })
    })
  })
})