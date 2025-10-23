/**
 * Tests for provider configuration management
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getAvailableProviders,
  getDefaultProvider,
  getOllamaConfig,
  getProviderConfigSummary,
  validateProviderConfig,
} from "@/shared/config/providers"
import { ENV_KEYS } from "@/shared/config/env-keys"

describe("Provider Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe("getOllamaConfig", () => {
    it("should return default Ollama configuration", () => {
      const config = getOllamaConfig()

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://localhost:11434",
        defaultModel: "embeddinggemma",
      })
    })

    it("should use environment variables when provided", () => {
      process.env[ENV_KEYS.OLLAMA_BASE_URL] = "http://custom-ollama:8080"
      process.env[ENV_KEYS.OLLAMA_DEFAULT_MODEL] = "custom-model"

      const config = getOllamaConfig()

      expect(config).toEqual({
        type: "ollama",
        baseUrl: "http://custom-ollama:8080",
        defaultModel: "custom-model",
      })
    })
  })



  describe("getAvailableProviders", () => {
    it("should return only Ollama when no API keys are provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = undefined
      process.env[ENV_KEYS.GOOGLE_API_KEY] = undefined

      const providers = getAvailableProviders()

      expect(providers).toHaveLength(1)
      expect(providers[0].type).toBe("ollama")
    })

    it("should return only Ollama when API keys are provided (but Ollama doesn't need API keys)", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai-key"
      process.env[ENV_KEYS.GOOGLE_API_KEY] = "google-key"

      const providers = getAvailableProviders()

      expect(providers).toHaveLength(1)
      expect(providers.map((p) => p.type)).toEqual(["ollama"])
    })
  })

  describe("getDefaultProvider", () => {
    it("should return Ollama as default when no preference is set", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = undefined

      const provider = getDefaultProvider()

      expect(provider.type).toBe("ollama")
    })

    it("should return Ollama as default (only provider available)", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "openai"
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai-key"

      const provider = getDefaultProvider()

      expect(provider.type).toBe("ollama")
    })

    it("should fallback to Ollama when preferred provider is not available", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "openai"
      process.env[ENV_KEYS.OPENAI_API_KEY] = undefined

      const provider = getDefaultProvider()

      expect(provider.type).toBe("ollama")
    })

    it("should fallback to Ollama for invalid provider type", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "invalid-provider"

      const provider = getDefaultProvider()

      expect(provider.type).toBe("ollama")
    })
  })

  describe("validateProviderConfig", () => {
    it("should validate Ollama configuration", () => {
      const config = {
        type: "ollama" as const,
        baseUrl: "http://localhost:11434",
        defaultModel: "nomic-embed-text",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toHaveLength(0)
    })

    it("should reject invalid provider type", () => {
      const config = {
        type: "invalid" as never,
        apiKey: "test",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toEqual(["Unsupported provider type: invalid"])
    })

    it("should reject Ollama configuration without base URL", () => {
      const config = {
        type: "ollama" as const,
        baseUrl: "",
        defaultModel: "nomic-embed-text",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toEqual(["Ollama base URL is required"])
    })
  })

  describe("getProviderConfigSummary", () => {
    it("should return configuration summary", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "openai"
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-test-key"
      process.env[ENV_KEYS.GOOGLE_API_KEY] = undefined
      process.env[ENV_KEYS.OLLAMA_BASE_URL] = "http://custom:11434"

      const summary = getProviderConfigSummary()

      expect(summary).toEqual({
        defaultProvider: "openai",
        ollama: {
          baseUrl: "http://custom:11434",
          defaultModel: "embeddinggemma",
        },
      })
    })

    it("should handle all environment variables for Ollama only", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "google"
      process.env[ENV_KEYS.OLLAMA_BASE_URL] = "http://custom-ollama:11434"

      const summary = getProviderConfigSummary()

      expect(summary.defaultProvider).toBe("google")
      expect(summary.ollama).toEqual({
        baseUrl: "http://custom-ollama:11434",
        defaultModel: "embeddinggemma",
      })
    })
  })

  describe("ENV_KEYS constants", () => {
    it("should have correct environment variable keys", () => {
      expect(ENV_KEYS.DEFAULT_PROVIDER).toBe("EES_DEFAULT_PROVIDER")
      expect(ENV_KEYS.OLLAMA_BASE_URL).toBe("EES_OLLAMA_BASE_URL")
      expect(ENV_KEYS.OPENAI_API_KEY).toBe("EES_OPENAI_API_KEY")
      expect(ENV_KEYS.GOOGLE_API_KEY).toBe("EES_GOOGLE_API_KEY")
    })
  })
})
