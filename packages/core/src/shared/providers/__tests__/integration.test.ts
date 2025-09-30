/**
 * Integration tests for provider system
 * Tests the full provider stack without external dependencies
 */

import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createEmbeddingProviderService,
  createMultiProviderConfig,
  createOllamaConfig,
  EmbeddingProviderService,
} from "@/shared/providers/factory"
import { createOllamaProvider } from "@/shared/providers/ollama-provider"

describe("Provider System Integration", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("Ollama Provider Integration", () => {
    it("should create provider service with Ollama configuration", async () => {
      const config = createOllamaConfig({
        baseUrl: "http://test-ollama:11434",
        defaultModel: "test-model",
      })

      const providerLayer = createOllamaProvider(config)
      expect(providerLayer).toBeDefined()
    })

    it("should handle provider service creation with multi-provider config", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)

      const serviceLayer = createEmbeddingProviderService(factoryConfig)
      expect(serviceLayer).toBeDefined()
    })
  })

  describe("Provider Service Interface", () => {
    it("should provide correct service interface", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)
      const serviceLayer = createEmbeddingProviderService(factoryConfig)

      // Create a minimal test program
      const testProgram = Effect.gen(function* () {
        const service = yield* EmbeddingProviderService

        // Test interface availability without calling external services
        expect(typeof service.generateEmbedding).toBe("function")
        expect(typeof service.listModels).toBe("function")
        expect(typeof service.isModelAvailable).toBe("function")
        expect(typeof service.getModelInfo).toBe("function")
        expect(typeof service.switchProvider).toBe("function")
        expect(typeof service.getCurrentProvider).toBe("function")
        expect(typeof service.listAllProviders).toBe("function")

        return "success"
      })

      // This should work without external dependencies
      const result = await Effect.runPromise(
        testProgram.pipe(Effect.provide(serviceLayer))
      )

      expect(result).toBe("success")
    })

    it("should report current provider correctly", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)
      const serviceLayer = createEmbeddingProviderService(factoryConfig)

      const testProgram = Effect.gen(function* () {
        const service = yield* EmbeddingProviderService
        const currentProvider = yield* service.getCurrentProvider()
        return currentProvider
      })

      const provider = await Effect.runPromise(
        testProgram.pipe(Effect.provide(serviceLayer))
      )

      expect(provider).toBe("ollama")
    })

    it("should list available providers", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)
      const serviceLayer = createEmbeddingProviderService(factoryConfig)

      const testProgram = Effect.gen(function* () {
        const service = yield* EmbeddingProviderService
        const providers = yield* service.listAllProviders()
        return providers
      })

      const providers = await Effect.runPromise(
        testProgram.pipe(Effect.provide(serviceLayer))
      )

      expect(providers).toEqual(["ollama"])
    })
  })

  describe("Configuration Validation", () => {
    it("should handle valid configuration objects", () => {
      const configs = [
        createOllamaConfig(),
        createOllamaConfig({ baseUrl: "http://custom:11434" }),
        createOllamaConfig({ defaultModel: "custom-model" }),
      ]

      configs.forEach((config) => {
        expect(() => createMultiProviderConfig(config)).not.toThrow()
      })
    })

    it("should maintain provider type consistency", () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)

      expect(factoryConfig.defaultProvider.type).toBe("ollama")
      expect(factoryConfig.availableProviders?.[0]?.type).toBe("ollama")
    })
  })

  describe("Error Handling", () => {
    it("should handle provider switching errors gracefully", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)
      const serviceLayer = createEmbeddingProviderService(factoryConfig)

      const testProgram = Effect.gen(function* () {
        const service = yield* EmbeddingProviderService
        // This should fail since switchProvider is not fully implemented
        return yield* service.switchProvider("nonexistent")
      })

      await expect(
        Effect.runPromise(testProgram.pipe(Effect.provide(serviceLayer)))
      ).rejects.toThrow()
    })
  })

  describe("Layer Composition", () => {
    it("should compose with other Effect layers", async () => {
      const ollamaConfig = createOllamaConfig()
      const providerLayer = createOllamaProvider(ollamaConfig)

      // Test that the layer can be used in Effect compositions
      const testLayer = Layer.mergeAll(providerLayer)
      expect(testLayer).toBeDefined()
    })

    it("should provide correct service dependencies", async () => {
      const ollamaConfig = createOllamaConfig()
      const factoryConfig = createMultiProviderConfig(ollamaConfig)
      const serviceLayer = createEmbeddingProviderService(factoryConfig)

      // Verify the layer provides the expected service
      const dependencies = await Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* EmbeddingProviderService
          return typeof service
        }).pipe(Effect.provide(serviceLayer))
      )

      expect(dependencies).toBe("object")
    })
  })
})
