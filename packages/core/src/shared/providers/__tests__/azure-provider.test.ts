/**
 * Comprehensive tests for Azure OpenAI provider implementation
 * Tests embedding generation, model management, and error handling using shared helpers
 */

import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { EmbeddingRequest, EmbeddingResponse, AzureConfig } from "@/shared/providers/types"
import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/providers/types"
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

// Mock the Azure provider factory function
const createMockAzureProvider = (config: AzureConfig) =>
  Effect.gen(function* () {
    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "text-embedding-ada-002"

          // Extract resource name from baseUrl for Azure endpoint construction
          const resourceName = config.baseUrl.match(/https:\/\/([^.]+)\.openai\.azure\.com/)?.[1] || "test-resource"

          // Simulate Azure OpenAI API call using Vercel AI SDK
          const response = await fetch(`https://${resourceName}.openai.azure.com/openai/deployments/${modelName}/embeddings?api-version=${config.apiVersion || "2024-02-01"}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": config.apiKey,
            },
            body: JSON.stringify({
              input: [request.text],
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const result = await response.json() as {
            data: Array<{
              embedding: number[]
              index: number
            }>
            model: string
            usage: {
              prompt_tokens: number
              total_tokens: number
            }
          }

          return {
            embedding: result.data[0].embedding,
            model: modelName,
            provider: "azure",
            dimensions: result.data[0].embedding.length,
            tokensUsed: result.usage.total_tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          // Simplified error handling for tests
          if (error instanceof Error) {
            const message = error.message.toLowerCase()

            if (message.includes("401") || message.includes("unauthorized")) {
              return new ProviderAuthenticationError({
                provider: "azure",
                modelName: request.modelName,
                message: "Invalid API key",
              })
            }

            if (message.includes("429") || message.includes("rate limit")) {
              return new ProviderRateLimitError({
                provider: "azure",
                modelName: request.modelName,
                message: "Rate limit exceeded",
                retryAfter: 60,
              })
            }

            if (message.includes("404") || message.includes("not found")) {
              return new ProviderModelError({
                provider: "azure",
                modelName: request.modelName || "unknown",
                message: "Model deployment not found",
              })
            }

            if (message.includes("400") || message.includes("bad request")) {
              return new ProviderModelError({
                provider: "azure",
                modelName: request.modelName,
                message: "Invalid request parameters",
              })
            }
          }

          return new ProviderConnectionError({
            provider: "azure",
            modelName: request.modelName,
            message: String(error),
          })
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "text-embedding-ada-002",
          provider: "azure",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.0001 / 1000,
        },
        {
          name: "text-embedding-3-small",
          provider: "azure",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.00002 / 1000,
        },
        {
          name: "text-embedding-3-large",
          provider: "azure",
          dimensions: 3072,
          maxTokens: 8191,
          pricePerToken: 0.00013 / 1000,
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

describe("Azure Provider", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>
  let config: AzureConfig

  beforeEach(() => {
    testEnv = createTestEnvironment()
    config = {
      apiKey: "test-api-key",
      baseUrl: "https://test-resource.openai.azure.com",
      apiVersion: "2024-02-01",
      defaultModel: "text-embedding-ada-002",
    }
  })

  afterEach(() => {
    testEnv.cleanup()
  })

  describe("generateEmbedding", () => {
    it("should generate embedding successfully with Ada-002 model", async () => {
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.AZURE,
        TEST_MODELS.AZURE.ADA_002,
        { usage: { tokens: 8 } }
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: mockResponse.embedding, index: 0 }],
          model: mockResponse.model,
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE,
        model: TEST_MODELS.AZURE.ADA_002,
        provider: "azure",
        dimensions: 1536,
        tokensUsed: 8,
      })

      expectFetchCall("https://test-resource.openai.azure.com/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "test-api-key",
        },
        body: JSON.stringify({
          input: ["test text"],
        }),
      })
    })

    it("should generate embedding with text-embedding-3-small model", async () => {
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.AZURE,
        TEST_MODELS.AZURE.SMALL
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: mockResponse.embedding, index: 0 }],
          model: mockResponse.model,
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text", TEST_MODELS.AZURE.SMALL)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE,
        model: TEST_MODELS.AZURE.SMALL,
        provider: "azure",
        dimensions: 1536,
      })
    })

    it("should generate embedding with text-embedding-3-large model", async () => {
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.AZURE_LARGE,
        TEST_MODELS.AZURE.LARGE
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: mockResponse.embedding, index: 0 }],
          model: mockResponse.model,
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text", TEST_MODELS.AZURE.LARGE)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE_LARGE,
        model: TEST_MODELS.AZURE.LARGE,
        provider: "azure",
        dimensions: 3072,
      })
    })

    it("should generate embedding for long text", async () => {
      const longText = "word ".repeat(2000).trim() // Azure supports large contexts
      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.AZURE,
        TEST_MODELS.AZURE.ADA_002
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: mockResponse.embedding, index: 0 }],
          model: mockResponse.model,
          usage: { prompt_tokens: 1500, total_tokens: 1500 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest(longText)
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE,
        model: TEST_MODELS.AZURE.ADA_002,
        provider: "azure",
        tokensUsed: 1500,
      })
    })

    it("should handle different resource names in baseUrl", async () => {
      const customConfig = {
        ...config,
        baseUrl: "https://my-company-ai.openai.azure.com",
      }

      const mockResponse = createMockEmbeddingResponse(
        TEST_EMBEDDINGS.AZURE,
        TEST_MODELS.AZURE.ADA_002
      )

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: mockResponse.embedding, index: 0 }],
          model: mockResponse.model,
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(customConfig))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE,
        model: TEST_MODELS.AZURE.ADA_002,
        provider: "azure",
      })
    })
  })

  describe("error handling", () => {
    it("should handle authentication errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.unauthorized()

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderAuthenticationError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.message).toContain("Invalid API key")
    })

    it("should handle rate limit errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.rateLimited()

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderRateLimitError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.retryAfter).toBe(60)
    })

    it("should handle model deployment not found errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.modelNotFound()

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text", "invalid-deployment")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.modelName).toBe("invalid-deployment")
      expect(error.message).toContain("Model deployment not found")
    })

    it("should handle bad request errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.invalidRequest()

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("")

      const error = await expectProviderError(
        ProviderModelError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.message).toContain("Invalid request parameters")
    })

    it("should handle server errors", async () => {
      const scenarios = setupErrorScenarios()
      scenarios.serverError()

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
    })

    it("should handle network errors", async () => {
      setupMockFetchError(new Error("Network timeout"))

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.message).toContain("Network timeout")
    })

    it("should handle JSON parsing errors", async () => {
      setupMockFetch({
        ok: true,
        status: 200,
        data: null, // This will cause JSON parsing issues
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderConnectionError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
    })

    it("should handle Azure-specific quota exceeded errors", async () => {
      setupMockFetch({
        ok: false,
        status: 429,
        error: "Requests to the Operation Under Hostname exceeded call rate limit.",
      })

      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const request = createTestRequest("test text")

      const error = await expectProviderError(
        ProviderRateLimitError,
        provider.generateEmbedding(request)
      )

      expect(error.provider).toBe("azure")
      expect(error.message).toContain("Rate limit exceeded")
    })
  })

  describe("listModels", () => {
    it("should return available Azure OpenAI models", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      expectModelListStructure(models, "azure")
      expect(models).toHaveLength(3)

      const modelNames = models.map((m) => m.name)
      expect(modelNames).toContain("text-embedding-ada-002")
      expect(modelNames).toContain("text-embedding-3-small")
      expect(modelNames).toContain("text-embedding-3-large")
    })

    it("should return models with correct metadata", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      const adaModel = models.find((m) => m.name === "text-embedding-ada-002")
      expect(adaModel).toEqual({
        name: "text-embedding-ada-002",
        provider: "azure",
        dimensions: 1536,
        maxTokens: 8191,
        pricePerToken: 0.0001 / 1000,
      })

      const largeModel = models.find((m) => m.name === "text-embedding-3-large")
      expect(largeModel).toEqual({
        name: "text-embedding-3-large",
        provider: "azure",
        dimensions: 3072,
        maxTokens: 8191,
        pricePerToken: 0.00013 / 1000,
      })
    })

    it("should include models with different dimensions", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))
      const models = await Effect.runPromise(provider.listModels())

      const smallDimensionModels = models.filter((m) => m.dimensions === 1536)
      const largeDimensionModels = models.filter((m) => m.dimensions === 3072)

      expect(smallDimensionModels).toHaveLength(2) // ada-002 and 3-small
      expect(largeDimensionModels).toHaveLength(1) // 3-large
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available models", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const isAdaAvailable = await Effect.runPromise(
        provider.isModelAvailable("text-embedding-ada-002")
      )
      const isSmallAvailable = await Effect.runPromise(
        provider.isModelAvailable("text-embedding-3-small")
      )
      const isLargeAvailable = await Effect.runPromise(
        provider.isModelAvailable("text-embedding-3-large")
      )

      expect(isAdaAvailable).toBe(true)
      expect(isSmallAvailable).toBe(true)
      expect(isLargeAvailable).toBe(true)
    })

    it("should return false for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const isAvailable = await Effect.runPromise(
        provider.isModelAvailable("invalid-model")
      )

      expect(isAvailable).toBe(false)
    })

    it("should be case sensitive", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const isAvailable = await Effect.runPromise(
        provider.isModelAvailable("TEXT-EMBEDDING-ADA-002")
      )

      expect(isAvailable).toBe(false) // Case sensitive
    })
  })

  describe("getModelInfo", () => {
    it("should return model info for available models", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const modelInfo = await Effect.runPromise(
        provider.getModelInfo("text-embedding-3-small")
      )

      expect(modelInfo).toEqual({
        name: "text-embedding-3-small",
        provider: "azure",
        dimensions: 1536,
        maxTokens: 8191,
        pricePerToken: 0.00002 / 1000,
      })
    })

    it("should return null for unavailable models", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const modelInfo = await Effect.runPromise(
        provider.getModelInfo("invalid-model")
      )

      expect(modelInfo).toBeNull()
    })

    it("should return correct info for large model", async () => {
      const provider = await Effect.runPromise(createMockAzureProvider(config))

      const modelInfo = await Effect.runPromise(
        provider.getModelInfo("text-embedding-3-large")
      )

      expect(modelInfo?.dimensions).toBe(3072)
      expect(modelInfo?.name).toBe("text-embedding-3-large")
      expect(modelInfo?.provider).toBe("azure")
    })
  })

  describe("configuration", () => {
    it("should use custom API version when provided", async () => {
      const customConfig = {
        ...config,
        apiVersion: "2023-05-15",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: TEST_EMBEDDINGS.AZURE, index: 0 }],
          model: TEST_MODELS.AZURE.ADA_002,
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(customConfig))
      const request = createTestRequest("test text")
      await Effect.runPromise(provider.generateEmbedding(request))

      // The API version should be used in the URL
      expect(testEnv.mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api-version=2023-05-15"),
        expect.any(Object)
      )
    })

    it("should use custom default model when provided", async () => {
      const customConfig = {
        ...config,
        defaultModel: "text-embedding-3-small",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: TEST_EMBEDDINGS.AZURE, index: 0 }],
          model: "text-embedding-3-small",
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(customConfig))
      const request = createTestRequest("test text") // No model specified
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        model: "text-embedding-3-small",
        provider: "azure",
      })
    })

    it("should work with minimal configuration", async () => {
      const minimalConfig = {
        apiKey: "test-api-key",
        baseUrl: "https://test-resource.openai.azure.com",
      }

      setupMockFetch({
        ok: true,
        status: 200,
        data: {
          data: [{ embedding: TEST_EMBEDDINGS.AZURE, index: 0 }],
          model: "text-embedding-ada-002",
          usage: { prompt_tokens: 5, total_tokens: 8 },
        },
      })

      const provider = await Effect.runPromise(createMockAzureProvider(minimalConfig))
      const request = createTestRequest("test text")
      const result = await Effect.runPromise(provider.generateEmbedding(request))

      expectEmbeddingResult(result, {
        embedding: TEST_EMBEDDINGS.AZURE,
        model: "text-embedding-ada-002", // Default model
        provider: "azure",
      })

      // Should use default API version
      expect(testEnv.mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api-version=2024-02-01"),
        expect.any(Object)
      )
    })

    it("should handle different Azure resource URL formats", async () => {
      const configs = [
        {
          ...config,
          baseUrl: "https://test-123.openai.azure.com",
        },
        {
          ...config,
          baseUrl: "https://my-company-ai.openai.azure.com",
        },
        {
          ...config,
          baseUrl: "https://prod-embeddings.openai.azure.com",
        },
      ]

      for (const testConfig of configs) {
        setupMockFetch({
          ok: true,
          status: 200,
          data: {
            data: [{ embedding: TEST_EMBEDDINGS.AZURE, index: 0 }],
            model: TEST_MODELS.AZURE.ADA_002,
            usage: { prompt_tokens: 5, total_tokens: 8 },
          },
        })

        const provider = await Effect.runPromise(createMockAzureProvider(testConfig))
        const request = createTestRequest("test text")
        const result = await Effect.runPromise(provider.generateEmbedding(request))

        expectEmbeddingResult(result, {
          embedding: TEST_EMBEDDINGS.AZURE,
          model: TEST_MODELS.AZURE.ADA_002,
          provider: "azure",
        })

        testEnv.mockFetch.mockClear()
      }
    })
  })
})