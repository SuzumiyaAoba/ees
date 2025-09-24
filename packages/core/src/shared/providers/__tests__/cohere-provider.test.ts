/**
 * Tests for Cohere Provider Service
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import { createCohereProvider, CohereProviderService } from "../cohere-provider"
import type { CohereConfig } from "../types"

// Mock the external dependencies
vi.mock("@ai-sdk/cohere", () => ({
  createCohere: vi.fn().mockReturnValue({
    textEmbeddingModel: vi.fn().mockReturnValue("mocked-model"),
  }),
}))

vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({
    embedding: new Array(1024).fill(0.1),
    usage: { tokens: 15 },
  }),
}))

describe("Cohere Provider Service", () => {
  const mockConfig: CohereConfig = {
    apiKey: "test-cohere-key",
    baseUrl: "https://api.cohere.ai",
    defaultModel: "embed-english-v3.0",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createCohereProvider", () => {
    it("should create provider layer with config", () => {
      const layer = createCohereProvider(mockConfig)
      expect(layer).toBeDefined()
    })
  })

  describe("listModels", () => {
    it("should return available Cohere models", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.listModels()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toHaveLength(4)
      expect(result).toEqual([
        {
          name: "embed-english-v3.0",
          provider: "cohere",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000,
        },
        {
          name: "embed-multilingual-v3.0",
          provider: "cohere",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000,
        },
        {
          name: "embed-english-light-v3.0",
          provider: "cohere",
          dimensions: 384,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000,
        },
        {
          name: "embed-multilingual-light-v3.0",
          provider: "cohere",
          dimensions: 384,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000,
        },
      ])
    })

    it("should return models with consistent structure", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.listModels()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      for (const model of result) {
        expect(model.name).toBeTruthy()
        expect(model.provider).toBe("cohere")
        expect(model.dimensions).toBeGreaterThan(0)
        expect(model.maxTokens).toBeGreaterThan(0)
        expect(typeof model.pricePerToken).toBe("number")
      }
    })
  })

  describe("isModelAvailable", () => {
    it("should return true for available models", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.isModelAvailable("embed-english-v3.0")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(true)
    })

    it("should return false for unavailable models", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.isModelAvailable("non-existent-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(false)
    })

    it("should support multilingual model", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.isModelAvailable("embed-multilingual-v3.0")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBe(true)
    })
  })

  describe("getModelInfo", () => {
    it("should return model info for existing model", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.getModelInfo("embed-english-v3.0")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toEqual({
        name: "embed-english-v3.0",
        provider: "cohere",
        dimensions: 1024,
        maxTokens: 512,
        pricePerToken: 0.0001 / 1000,
      })
    })

    it("should return null for non-existent model", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.getModelInfo("non-existent-model")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result).toBeNull()
    })

    it("should return multilingual model info correctly", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.getModelInfo("embed-multilingual-v3.0")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result?.name).toBe("embed-multilingual-v3.0")
      expect(result?.dimensions).toBe(1024)
    })
  })

  describe("generateEmbedding", () => {
    it("should handle successful embedding generation", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.generateEmbedding({
          text: "Hello world",
          modelName: "embed-english-v3.0",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.embedding).toHaveLength(1024)
      expect(result.model).toBe("embed-english-v3.0")
      expect(result.provider).toBe("cohere")
      expect(result.dimensions).toBe(1024)
      expect(result.tokensUsed).toBe(15)
    })

    it("should use default model when none specified", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.generateEmbedding({
          text: "Hello world",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.model).toBe("embed-english-v3.0")
    })

    it("should handle multilingual text", async () => {
      const layer = createCohereProvider(mockConfig)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.generateEmbedding({
          text: "Hola mundo",
          modelName: "embed-multilingual-v3.0",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.model).toBe("embed-multilingual-v3.0")
      expect(result.provider).toBe("cohere")
    })
  })

  describe("configuration handling", () => {
    it("should handle config without baseUrl", () => {
      const configWithoutBaseUrl: CohereConfig = {
        apiKey: "test-key",
        defaultModel: "embed-english-v3.0",
      }

      expect(() => createCohereProvider(configWithoutBaseUrl)).not.toThrow()
    })

    it("should handle config with custom baseUrl", () => {
      const configWithCustomBase: CohereConfig = {
        apiKey: "test-key",
        baseUrl: "https://custom.cohere.com",
        defaultModel: "embed-english-v3.0",
      }

      expect(() => createCohereProvider(configWithCustomBase)).not.toThrow()
    })

    it("should use fallback model when none specified", async () => {
      const configWithoutModel: CohereConfig = {
        apiKey: "test-key",
      }

      const layer = createCohereProvider(configWithoutModel)

      const program = Effect.gen(function* () {
        const provider = yield* CohereProviderService
        return yield* provider.generateEmbedding({
          text: "Test",
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      )

      expect(result.model).toBe("embed-english-v3.0") // fallback default
    })
  })
})