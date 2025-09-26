/**
 * Tests for shared test helper utilities
 * Ensures test helpers work correctly before using them in provider tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { Effect, Either } from "effect"
import {
  createMockEmbeddingResponse,
  setupMockFetch,
  expectEmbeddingResult,
  expectProviderError,
  expectFetchCall,
  createTestRequest,
  setupErrorScenarios,
  createTestEnvironment,
  expectModelListStructure,
  TEST_EMBEDDINGS,
  TEST_MODELS,
  type MockFetchConfig,
} from "./test-helpers"
import type { EmbeddingResponse } from "../types"
import { ProviderModelError } from "../types"

describe("Test Helpers", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>

  beforeEach(() => {
    testEnv = createTestEnvironment()
  })

  afterEach(() => {
    testEnv.cleanup()
  })

  describe("createMockEmbeddingResponse", () => {
    it("should create response with single embedding", () => {
      const embedding = [0.1, 0.2, 0.3]
      const model = "test-model"

      const response = createMockEmbeddingResponse(embedding, model)

      expect(response).toEqual({
        embeddings: [embedding],
        embedding,
        model,
        provider: undefined,
        total_duration: undefined,
        load_duration: undefined,
        usage: undefined,
      })
    })

    it("should create response with multiple embeddings", () => {
      const embeddings = [[0.1, 0.2], [0.3, 0.4]]
      const model = "test-model"

      const response = createMockEmbeddingResponse(embeddings, model)

      expect(response).toEqual({
        embeddings,
        embedding: embeddings[0],
        model,
        provider: undefined,
        total_duration: undefined,
        load_duration: undefined,
        usage: undefined,
      })
    })

    it("should create response with optional parameters", () => {
      const embedding = [0.1, 0.2, 0.3]
      const model = "test-model"
      const options = {
        provider: "test-provider",
        usage: { tokens: 10 },
        total_duration: 1000,
        load_duration: 500,
      }

      const response = createMockEmbeddingResponse(embedding, model, options)

      expect(response).toEqual({
        embeddings: [embedding],
        embedding,
        model,
        provider: "test-provider",
        total_duration: 1000,
        load_duration: 500,
        usage: { tokens: 10 },
      })
    })
  })

  describe("setupMockFetch", () => {
    it("should setup successful mock fetch", async () => {
      const data = { test: "data" }
      const config: MockFetchConfig = {
        ok: true,
        status: 200,
        data,
      }

      setupMockFetch(config)

      // Actually call fetch to verify the mock works
      const response = await fetch("http://test.com")
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const jsonData = await response.json()
      expect(jsonData).toEqual(data)
    })

    it("should setup error mock fetch", async () => {
      const config: MockFetchConfig = {
        ok: false,
        status: 404,
        error: "Not found",
      }

      setupMockFetch(config)

      // Actually call fetch to verify the mock works
      const response = await fetch("http://test.com")
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)

      const errorText = await response.text()
      expect(errorText).toBe("Not found")
    })

    it("should setup mock fetch with custom headers", async () => {
      const config: MockFetchConfig = {
        ok: true,
        status: 200,
        headers: { "Content-Type": "application/json" },
      }

      setupMockFetch(config)

      // Actually call fetch to verify the mock works
      const response = await fetch("http://test.com")
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("application/json")
    })
  })

  describe("expectEmbeddingResult", () => {
    it("should validate all embedding result properties", () => {
      const result: EmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        model: "test-model",
        provider: "test-provider",
        dimensions: 3,
        tokensUsed: 10,
      }

      const expected: Partial<EmbeddingResponse> = {
        embedding: [0.1, 0.2, 0.3],
        model: "test-model",
        provider: "test-provider",
        dimensions: 3,
        tokensUsed: 10,
      }

      // Should not throw
      expectEmbeddingResult(result, expected)
    })

    it("should validate partial embedding result properties", () => {
      const result: EmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        model: "test-model",
        provider: "test-provider",
        dimensions: 3,
        tokensUsed: 10,
      }

      const expected: Partial<EmbeddingResponse> = {
        model: "test-model",
        dimensions: 3,
      }

      // Should not throw when checking only specified properties
      expectEmbeddingResult(result, expected)
    })

    it("should fail when embedding result doesn't match", () => {
      const result: EmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        model: "test-model",
        provider: "test-provider",
        dimensions: 3,
        tokensUsed: 10,
      }

      const expected: Partial<EmbeddingResponse> = {
        model: "wrong-model",
      }

      expect(() => expectEmbeddingResult(result, expected)).toThrow()
    })
  })

  describe("expectProviderError", () => {
    it("should validate error type correctly", async () => {
      const errorEffect = Effect.fail(
        new ProviderModelError({
          provider: "test",
          modelName: "test-model",
          message: "Test error",
        })
      )

      const error = await expectProviderError(ProviderModelError, errorEffect)

      expect(error).toBeInstanceOf(ProviderModelError)
      expect(error.provider).toBe("test")
      expect(error.modelName).toBe("test-model")
      expect(error.message).toBe("Test error")
    })

    it("should fail when operation succeeds unexpectedly", async () => {
      const successEffect = Effect.succeed("success")

      await expect(async () => {
        await expectProviderError(ProviderModelError, successEffect)
      }).rejects.toThrow("Expected operation to fail but it succeeded")
    })

    it("should fail when error type doesn't match", async () => {
      const errorEffect = Effect.fail(new Error("Generic error"))

      await expect(
        expectProviderError(ProviderModelError, errorEffect)
      ).rejects.toThrow()
    })
  })

  describe("expectFetchCall", () => {
    it("should validate fetch call parameters", () => {
      const url = "https://api.example.com/embed"
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test" }),
      }

      // Setup mock call
      testEnv.mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as any)

      // Make the call
      fetch(url, options)

      // Validate it was called correctly
      expectFetchCall(url, options)
    })
  })

  describe("createTestRequest", () => {
    it("should create request with text only", () => {
      const request = createTestRequest("test text")

      expect(request).toEqual({
        text: "test text",
      })
    })

    it("should create request with text and model", () => {
      const request = createTestRequest("test text", "test-model")

      expect(request).toEqual({
        text: "test text",
        modelName: "test-model",
      })
    })
  })

  describe("TEST_EMBEDDINGS constants", () => {
    it("should have correct embedding dimensions", () => {
      expect(TEST_EMBEDDINGS.SMALL).toHaveLength(5)
      expect(TEST_EMBEDDINGS.MEDIUM).toHaveLength(384)
      expect(TEST_EMBEDDINGS.LARGE).toHaveLength(1024)
      expect(TEST_EMBEDDINGS.OPENAI_SMALL).toHaveLength(1536)
      expect(TEST_EMBEDDINGS.OPENAI_LARGE).toHaveLength(3072)
      expect(TEST_EMBEDDINGS.COHERE).toHaveLength(1024)
      expect(TEST_EMBEDDINGS.GOOGLE).toHaveLength(768)
      expect(TEST_EMBEDDINGS.OLLAMA).toHaveLength(5)
    })

    it("should have numeric values", () => {
      Object.values(TEST_EMBEDDINGS).forEach((embedding) => {
        expect(Array.isArray(embedding)).toBe(true)
        embedding.forEach((value) => {
          expect(typeof value).toBe("number")
        })
      })
    })
  })

  describe("TEST_MODELS constants", () => {
    it("should have expected model names", () => {
      expect(TEST_MODELS.OPENAI.SMALL).toBe("text-embedding-3-small")
      expect(TEST_MODELS.OPENAI.LARGE).toBe("text-embedding-3-large")
      expect(TEST_MODELS.GOOGLE.EMBEDDING_001).toBe("embedding-001")
      expect(TEST_MODELS.COHERE.ENGLISH).toBe("embed-english-v3.0")
      expect(TEST_MODELS.OLLAMA.NOMIC).toBe("nomic-embed-text")
      expect(TEST_MODELS.MISTRAL.EMBED).toBe("mistral-embed")
    })
  })

  describe("setupErrorScenarios", () => {
    it("should setup different error scenarios", () => {
      const scenarios = setupErrorScenarios()

      expect(typeof scenarios.networkError).toBe("function")
      expect(typeof scenarios.unauthorized).toBe("function")
      expect(typeof scenarios.rateLimited).toBe("function")
      expect(typeof scenarios.modelNotFound).toBe("function")
      expect(typeof scenarios.invalidRequest).toBe("function")
      expect(typeof scenarios.serverError).toBe("function")
    })

    it("should create network error scenario", async () => {
      const scenarios = setupErrorScenarios()

      // Setup the scenario
      scenarios.networkError()

      // Test that fetch was configured with network error
      const response = await fetch("http://test.com")
      expect(response.ok).toBe(false)
      expect(response.status).toBe(0)
    })
  })

  describe("expectModelListStructure", () => {
    it("should validate correct model list structure", () => {
      const models = [
        {
          name: "test-model-1",
          provider: "test-provider",
          dimensions: 768,
          maxTokens: 8192,
        },
        {
          name: "test-model-2",
          provider: "test-provider",
          dimensions: 1024,
          maxTokens: 4096,
        },
      ]

      // Should not throw
      expectModelListStructure(models, "test-provider")
    })

    it("should fail for empty model list", () => {
      const models: any[] = []

      expect(() => expectModelListStructure(models, "test-provider")).toThrow()
    })

    it("should fail for invalid model structure", () => {
      const models = [
        {
          name: "test-model",
          // Missing provider
          dimensions: 768,
        },
      ]

      expect(() => expectModelListStructure(models, "test-provider")).toThrow()
    })

    it("should fail for wrong provider", () => {
      const models = [
        {
          name: "test-model",
          provider: "wrong-provider",
          dimensions: 768,
        },
      ]

      expect(() => expectModelListStructure(models, "test-provider")).toThrow()
    })
  })

  describe("createTestEnvironment", () => {
    it("should create test environment with cleanup", () => {
      const env = createTestEnvironment()

      expect(env.mockFetch).toBeDefined()
      expect(typeof env.cleanup).toBe("function")
      expect(global.fetch).toBe(env.mockFetch)

      // Cleanup should restore mocks
      env.cleanup()
    })
  })
})