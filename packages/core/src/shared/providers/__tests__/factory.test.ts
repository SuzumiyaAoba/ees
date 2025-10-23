/**
 * Tests for provider factory functionality
 */

import { describe, expect, it } from "vitest"
import {
  createMultiProviderConfig,
  createOllamaConfig,
  createProviderLayer,
} from "@/shared/providers/factory"

describe("Provider Factory", () => {
  describe("createOllamaConfig", () => {
    it("should create default Ollama configuration", () => {
      const config = createOllamaConfig()

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://localhost:11434",
        defaultModel: "embeddinggemma",
      })
    })

    it("should create custom Ollama configuration", () => {
      const config = createOllamaConfig({
        baseUrl: "http://custom-ollama:8080",
        defaultModel: "custom-embedding-model",
      })

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://custom-ollama:8080",
        defaultModel: "custom-embedding-model",
      })
    })

    it("should override only specified options", () => {
      const config = createOllamaConfig({
        baseUrl: "http://custom:9999",
      })

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://custom:9999",
        defaultModel: "embeddinggemma",
      })
    })
  })



  describe("createMultiProviderConfig", () => {
    it("should create configuration with default provider only", () => {
      const defaultProvider = createOllamaConfig()
      const config = createMultiProviderConfig(defaultProvider)

      expect(config).toEqual({
        defaultProvider,
        availableProviders: [defaultProvider],
      })
    })

    it("should handle empty additional providers", () => {
      const defaultProvider = createOllamaConfig()
      const config = createMultiProviderConfig(defaultProvider, [])

      expect(config).toEqual({
        defaultProvider,
        availableProviders: [defaultProvider],
      })
    })
  })

  describe("createProviderLayer", () => {
    it("should create Ollama provider layer", () => {
      const config = createOllamaConfig()
      const layer = createProviderLayer(config)

      expect(layer).toBeDefined()
      // Layer is an Effect construct, so we can't easily test its internals
      // but we can verify it was created without throwing
    })


    it("should throw error for unsupported provider type", () => {
      const config = {
        type: "unsupported" as never,
        apiKey: "test",
      }

      expect(() => createProviderLayer(config)).toThrow(
        "Unsupported provider type: unsupported"
      )
    })
  })

  describe("Type Safety", () => {
    it("should maintain correct configuration types", () => {
      const ollamaConfig = createOllamaConfig()

      // TypeScript should enforce these types at compile time
      expect(ollamaConfig.type).toBe("ollama")
    })

    it("should prevent invalid configuration mixing", () => {
      // This would fail at TypeScript compile time:
      // const invalidConfig = createOllamaConfig({ apiKey: "test" })

      // We can verify the correct types are maintained
      const ollamaConfig = createOllamaConfig()
      expect("apiKey" in ollamaConfig).toBe(false)
      expect("baseUrl" in ollamaConfig).toBe(true)
    })
  })

  describe("Configuration Validation", () => {
    it("should create valid provider configurations", () => {
      const configs = [
        createOllamaConfig(),
      ]

      configs.forEach((config) => {
        expect(config.type).toBe("ollama")
      })
    })

    it("should maintain default model consistency", () => {
      const ollamaConfig = createOllamaConfig()

      expect(ollamaConfig.defaultModel).toBe("embeddinggemma")
    })
  })
})
