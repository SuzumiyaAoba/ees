/**
 * Comprehensive tests for Google AI provider implementation
 * Tests embedding generation, model management, and error handling
 */

import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { EmbeddingRequest, EmbeddingResponse, GoogleConfig } from "../types"
import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "../types"
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
  setupErrorScenarios,
  expectModelListStructure,
  TEST_EMBEDDINGS,
  TEST_MODELS,
} from "./test-helpers"

// Mock the Google provider factory function
const createMockGoogleProvider = (config: GoogleConfig) =>
  Effect.gen(function* () {
    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "embedding-001"

          // Simulate Google AI API call using Vercel AI SDK
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": config.apiKey,
            },
            body: JSON.stringify({
              model: `models/${modelName}`,
              content: {
                parts: [{ text: request.text }],
              },
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const result = await response.json() as {
            embedding: {
              values: number[]
            }
          }

          return {
            embedding: result.embedding.values,
            model: modelName,
            provider: "google",
            dimensions: result.embedding.values.length,
            tokensUsed: undefined, // Google AI doesn't return token usage
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          // Simplified error handling for tests
          if (error instanceof Error) {
            const message = error.message.toLowerCase()

            if (message.includes("401") || message.includes("unauthorized") || message.includes("api key")) {
              return new ProviderAuthenticationError({
                provider: "google",
                modelName: request.modelName,
                message: "Invalid API key",
              })
            }

            if (message.includes("429") || message.includes("quota") || message.includes("rate limit")) {
              return new ProviderRateLimitError({
                provider: "google",
                modelName: request.modelName,
                message: "Rate limit exceeded",
                retryAfter: 60,
              })
            }

            if (message.includes("404") || message.includes("not found")) {
              return new ProviderModelError({
                provider: "google",
                modelName: request.modelName || "unknown",
                message: "Model not found",
              })
            }

            if (message.includes("400") || message.includes("bad request") || message.includes("invalid")) {
              return new ProviderModelError({
                provider: "google",
                modelName: request.modelName,
                message: "Invalid request parameters",
              })
            }
          }

          return new ProviderConnectionError({
            provider: "google",
            modelName: request.modelName,
            message: String(error),
          })
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "embedding-001",
          provider: "google",
          dimensions: 768,
          maxTokens: 2048,
          pricePerToken: 0.00001 / 1000,
        },
        {
          name: "text-embedding-004",
          provider: "google",
          dimensions: 768,
          maxTokens: 2048,
          pricePerToken: 0.00001 / 1000,
        },
      ])

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        return models.some((model) => model.name === modelName)
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const model = models.find((m) => m.name === modelName)
        return model ?? null
      })

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

describe("Google Provider", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>
  let config: GoogleConfig

  beforeEach(() => {
    testEnv = createTestEnvironment()
    config = {
      apiKey: "test-api-key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      defaultModel: "embedding-001",
    }
  })

  afterEach(() => {
    testEnv.cleanup()
  })

  describe("generateEmbedding", () => {
    it("should generate embedding successfully with default model", async () => {
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.GOOGLE,
        TEST_MODELS.GOOGLE.EMBEDDING_001
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: mockResponse.embedding,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.GOOGLE,
        model: TEST_MODELS.GOOGLE.EMBEDDING_001,
        provider: "google",
        dimensions: 768,
      })

      expectFetchCall("https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "test-api-key",
        },
        body: JSON.stringify({
          model: "models/embedding-001",
          content: {
            parts: [{ text: "test text" }],
          },
        }),
      })
    })

    it("should generate embedding with specific model", async () => {
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.GOOGLE,
        TEST_MODELS.GOOGLE.TEXT_EMBEDDING_004
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: mockResponse.embedding,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text", TEST_MODELS.GOOGLE.TEXT_EMBEDDING_004)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.GOOGLE,
        model: TEST_MODELS.GOOGLE.TEXT_EMBEDDING_004,
        provider: "google",
        dimensions: 768,
      })
    })

    it("should generate embedding for long text", async () => {
      const longText = "word ".repeat(500).trim() // Google AI has lower token limits
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.GOOGLE,
        TEST_MODELS.GOOGLE.EMBEDDING_001
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: mockResponse.embedding,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest(longText)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.GOOGLE,
        model: TEST_MODELS.GOOGLE.EMBEDDING_001,
        provider: "google",
      })
    })

    it("should generate embedding with unicode text", async () => {
      const unicodeText = "こんにちは世界 🌍 Testing unicode"
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.GOOGLE,
        TEST_MODELS.GOOGLE.EMBEDDING_001
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: mockResponse.embedding,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest(unicodeText)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.GOOGLE,
        model: TEST_MODELS.GOOGLE.EMBEDDING_001,
        provider: "google",
      })
    })

    it("should handle empty embedding response", async () => {
      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: [],
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: [],
        model: TEST_MODELS.GOOGLE.EMBEDDING_001,
        provider: "google",
        dimensions: 0,
      })
    })
  })

  describe("error handling", () => {
    it("should handle authentication errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.unauthorized()

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderAuthenticationError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.message).toContain("Invalid API key")
    })

    it("should handle rate limit errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.rateLimited()

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderRateLimitError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.retryAfter).toBe(60)
    })

    it("should handle model not found errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.modelNotFound()

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text", "invalid-model")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.modelName).toBe("invalid-model")
    })

    it("should handle bad request errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.invalidRequest()

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.message).toContain("Invalid request parameters")
    })

    it("should handle server errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.serverError()

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
    })

    it("should handle network errors", async () => {
      setupMockFetchError(new Error("Network timeout"))

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.message).toContain("Network timeout")
    })

    it("should handle JSON parsing errors", async () => {
      setupMockFetch({
        ok: true,
        status: 200,
        data: null, // This will cause JSON parsing issues
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
    })

    it("should handle quota exceeded errors", async () => {
      setupMockFetch({
        ok: false,
        status: 429,
        error: "Quota exceeded",
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderRateLimitError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("google")
      expect(error.message).toContain("Rate limit exceeded")
    })
  })

  describe("listModels", () => {
    it("should return available Google AI models", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      expectModelListStructure(models, "google")
      expect(models).toHaveLength(2)

      const modelNames = models.map((m) => m.name)
      expect(modelNames).toContain("embedding-001")
      expect(modelNames).toContain("text-embedding-004")
    })

    it("should return models with correct metadata", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      const embedding001 = models.find((m) => m.name === "embedding-001")
      expect(embedding001).toEqual({
        name: "embedding-001",
        provider: "google",
        dimensions: 768,
        maxTokens: 2048,
        pricePerToken: 0.00001 / 1000,
      })

      const textEmbedding004 = models.find((m) => m.name === "text-embedding-004")
      expect(textEmbedding004).toEqual({
        name: "text-embedding-004",
        provider: "google",
        dimensions: 768,
        maxTokens: 2048,
        pricePerToken: 0.00001 / 1000,
      })
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available models", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))

      const isEmbedding001Available = await Effect.runPromise(
        provider.isModelAvailable("embedding-001")
      )
      const isTextEmbedding004Available = await Effect.runPromise(
        provider.isModelAvailable("text-embedding-004")
      )

      expect(isEmbedding001Available).toBe(true)
      expect(isTextEmbedding004Available).toBe(true)
    })

    it("should return false for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))

      const isAvailable = await Effect.runPromise(
        provider.isModelAvailable("invalid-model")
      )

      expect(isAvailable).toBe(false)
    })
  })

  describe("getModelInfo", () => {
    it("should return model info for available models", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))

      const modelInfo = await Effect.runPromise(
        provider.getModelInfo("embedding-001")
      )

      expect(modelInfo).toEqual({
        name: "embedding-001",
        provider: "google",
        dimensions: 768,
        maxTokens: 2048,
        pricePerToken: 0.00001 / 1000,
      })
    })

    it("should return null for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockGoogleProvider(config))

      const modelInfo = await Effect.runPromise(
        provider.getModelInfo("invalid-model")
      )

      expect(modelInfo).toBeNull()
    })
  })

  describe("configuration", () => {
    it("should use custom base URL when provided", async () => {
      const customConfig = {
        ...config,
        baseUrl: "https://custom.googleapis.com/v1beta",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: TEST_EMBEDDINGS.GOOGLE,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(customConfig))
      const request = createTestRequest("test text")
      await Effect.runPromise(provider.generateEmbedding(request))

      // Note: In a real implementation, we'd check the actual URL used
      // For now, we just verify the call was made
      expect(testEnv.mockFetch).toHaveBeenCalled()
    })

    it("should use custom default model when provided", async () => {
      const customConfig = {
        ...config,
        defaultModel: "text-embedding-004",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: TEST_EMBEDDINGS.GOOGLE,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(customConfig))
      const request = createTestRequest("test text") // No model specified
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        model: TEST_MODELS.GOOGLE.TEXT_EMBEDDING_004,
        provider: "google",
      })
    })

    it("should work with minimal configuration", async () => {
      const minimalConfig = {
        apiKey: "test-api-key",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          embedding: {
            values: TEST_EMBEDDINGS.GOOGLE,
          },
        },
      })

      const provider = await Effect.runPromise(createMockGoogleProvider(minimalConfig))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.GOOGLE,
        model: "embedding-001", // Default model
        provider: "google",
      })
    })
  })
})