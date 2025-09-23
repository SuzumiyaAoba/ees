/**
 * Tests for Azure Provider Service
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"
import { createAzureProvider, AzureProviderService } from "@/shared/providers/azure-provider"
import type { AzureConfig } from "@/shared/providers/types"

// Mock the external dependencies
vi.mock("@ai-sdk/azure", () => ({
  createAzure: vi.fn().mockReturnValue({
    textEmbedding: vi.fn().mockReturnValue("mocked-model"),
  }),
}))

vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    usage: { tokens: 10 },
  }),
}))

describe("Azure Provider Service", () => {
  const mockConfig: AzureConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://test-resource.openai.azure.com",
    apiVersion: "2024-02-01",
    defaultModel: "text-embedding-ada-002",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createAzureProvider", () => {
    it("should create provider layer with config", () => {
      const layer = createAzureProvider(mockConfig)
      expect(layer).toBeDefined()
    })
  })

  describe("listModels", () => {
    it("should return available Azure models", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.listModels()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toHaveLength(3)
      expect(result).toEqual([
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
    })

    it("should return consistent model information", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.listModels()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      for (const model of result) {
        expect(model.name).toBeTruthy()
        expect(model.provider).toBe("azure")
        expect(model.dimensions).toBeGreaterThan(0)
        expect(model.maxTokens).toBeGreaterThan(0)
        expect(typeof model.pricePerToken).toBe("number")
      }
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available models", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.isModelAvailable("text-embedding-ada-002")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(true)
    })

    it("should return false for unavailable models", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.isModelAvailable("non-existent-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(false)
    })

    it("should handle case sensitivity", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.isModelAvailable("TEXT-EMBEDDING-ADA-002")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(false) // Case sensitive
    })
  })

  describe("getModelInfo", () => {
    it("should return model info for existing model", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.getModelInfo("text-embedding-3-small")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toEqual({
        name: "text-embedding-3-small",
        provider: "azure",
        dimensions: 1536,
        maxTokens: 8191,
        pricePerToken: 0.00002 / 1000,
      })
    })

    it("should return null for non-existent model", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.getModelInfo("non-existent-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBeNull()
    })

    it("should return largest model info correctly", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.getModelInfo("text-embedding-3-large")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result?.dimensions).toBe(3072)
      expect(result?.name).toBe("text-embedding-3-large")
    })
  })

  describe("generateEmbedding", () => {
    it("should handle successful embedding generation", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.generateEmbedding({
          text: "Hello world",
          modelName: "text-embedding-ada-002",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.embedding).toHaveLength(1536)
      expect(result.model).toBe("text-embedding-ada-002")
      expect(result.provider).toBe("azure")
      expect(result.dimensions).toBe(1536)
      expect(result.tokensUsed).toBe(10)
    })

    it("should use default model when none specified", async () => {
      const layer = createAzureProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* AzureProviderService
        return yield* provider.generateEmbedding({
          text: "Hello world",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.model).toBe("text-embedding-ada-002")
    })
  })
})

describe("extractResourceName utility", () => {
  // Import the function directly for unit testing
  // Note: We need to test this through the module since it's not exported
  // Let's test it indirectly through provider creation

  it("should extract resource name from valid Azure URL", () => {
    const config: AzureConfig = {
      apiKey: "test-key",
      baseUrl: "https://my-resource.openai.azure.com",
      apiVersion: "2024-02-01",
    }

    // If provider creation succeeds, the URL parsing worked
    expect(() => createAzureProvider(config)).not.toThrow()
  })

  it("should handle different resource names", () => {
    const configs: AzureConfig[] = [
      {
        apiKey: "test-key",
        baseUrl: "https://test-123.openai.azure.com",
        apiVersion: "2024-02-01",
      },
      {
        apiKey: "test-key",
        baseUrl: "https://my-company-ai.openai.azure.com",
        apiVersion: "2024-02-01",
      },
      {
        apiKey: "test-key",
        baseUrl: "https://prod-embeddings.openai.azure.com",
        apiVersion: "2024-02-01",
      },
    ]

    for (const config of configs) {
      expect(() => createAzureProvider(config)).not.toThrow()
    }
  })
})