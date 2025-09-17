/**
 * Tests for provider factory functionality
 */

import { describe, expect, it } from "vitest"
import {
  createGoogleConfig,
  createMultiProviderConfig,
  createOllamaConfig,
  createOpenAIConfig,
  createProviderLayer,
} from "../factory"

describe("Provider Factory", () => {
  describe("createOllamaConfig", () => {
    it("should create default Ollama configuration", () => {
      const config = createOllamaConfig()

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://localhost:11434",
        defaultModel: "embeddinggemma:300m",
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
        defaultModel: "embeddinggemma:300m",
      })
    })
  })

  describe("createOpenAIConfig", () => {
    it("should create OpenAI configuration with API key", () => {
      const config = createOpenAIConfig("sk-test-key")

      expect(config).toEqual({
        type: "openai",
        apiKey: "sk-test-key",
        baseUrl: "https://api.openai.com/v1",
        defaultModel: "text-embedding-3-small",
      })
    })

    it("should create custom OpenAI configuration", () => {
      const config = createOpenAIConfig("sk-custom-key", {
        baseUrl: "https://custom-openai.com/v1",
        defaultModel: "text-embedding-3-large",
        organization: "org-123",
      })

      expect(config).toEqual({
        type: "openai",
        apiKey: "sk-custom-key",
        baseUrl: "https://custom-openai.com/v1",
        defaultModel: "text-embedding-3-large",
        organization: "org-123",
      })
    })

    it("should override only specified options", () => {
      const config = createOpenAIConfig("sk-key", {
        organization: "my-org",
      })

      expect(config).toEqual({
        type: "openai",
        apiKey: "sk-key",
        baseUrl: "https://api.openai.com/v1",
        defaultModel: "text-embedding-3-small",
        organization: "my-org",
      })
    })
  })

  describe("createGoogleConfig", () => {
    it("should create Google configuration with API key", () => {
      const config = createGoogleConfig("google-api-key")

      expect(config).toEqual({
        type: "google",
        apiKey: "google-api-key",
        defaultModel: "text-embedding-004",
      })
    })

    it("should create custom Google configuration", () => {
      const config = createGoogleConfig("custom-google-key", {
        baseUrl: "https://custom-google.com",
        defaultModel: "embedding-001",
      })

      expect(config).toEqual({
        type: "google",
        apiKey: "custom-google-key",
        baseUrl: "https://custom-google.com",
        defaultModel: "embedding-001",
      })
    })

    it("should override only specified options", () => {
      const config = createGoogleConfig("google-key", {
        defaultModel: "custom-model",
      })

      expect(config).toEqual({
        type: "google",
        apiKey: "google-key",
        defaultModel: "custom-model",
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

    it("should create configuration with multiple providers", () => {
      const ollamaConfig = createOllamaConfig()
      const openaiConfig = createOpenAIConfig("sk-key")
      const googleConfig = createGoogleConfig("google-key")

      const config = createMultiProviderConfig(ollamaConfig, [
        openaiConfig,
        googleConfig,
      ])

      expect(config).toEqual({
        defaultProvider: ollamaConfig,
        availableProviders: [ollamaConfig, openaiConfig, googleConfig],
      })
    })

    it("should handle empty additional providers", () => {
      const defaultProvider = createOpenAIConfig("sk-key")
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

    it("should create OpenAI provider layer", () => {
      const config = createOpenAIConfig("sk-test-key")
      const layer = createProviderLayer(config)

      expect(layer).toBeDefined()
    })

    it("should create Google provider layer", () => {
      const config = createGoogleConfig("google-key")
      const layer = createProviderLayer(config)

      expect(layer).toBeDefined()
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
      const openaiConfig = createOpenAIConfig("sk-key")
      const googleConfig = createGoogleConfig("google-key")

      // TypeScript should enforce these types at compile time
      expect(ollamaConfig.type).toBe("ollama")
      expect(openaiConfig.type).toBe("openai")
      expect(googleConfig.type).toBe("google")

      expect(openaiConfig.apiKey).toBe("sk-key")
      expect(googleConfig.apiKey).toBe("google-key")
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
        createOpenAIConfig("sk-valid-key"),
        createGoogleConfig("valid-google-key"),
      ]

      configs.forEach((config) => {
        expect(config.type).toMatch(/^(ollama|openai|google)$/)
        if (config.type === "openai" || config.type === "google") {
          expect(
            "apiKey" in config && (config as { apiKey: string }).apiKey
          ).toBeTruthy()
        }
      })
    })

    it("should maintain default model consistency", () => {
      const ollamaConfig = createOllamaConfig()
      const openaiConfig = createOpenAIConfig("sk-key")
      const googleConfig = createGoogleConfig("google-key")

      expect(ollamaConfig.defaultModel).toBe("embeddinggemma:300m")
      expect(openaiConfig.defaultModel).toBe("text-embedding-3-small")
      expect(googleConfig.defaultModel).toBe("text-embedding-004")
    })
  })
})
