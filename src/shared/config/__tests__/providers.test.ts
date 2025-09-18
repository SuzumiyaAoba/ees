/**
 * Tests for provider configuration management
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  ENV_KEYS,
  getAvailableProviders,
  getDefaultProvider,
  getGoogleConfig,
  getOllamaConfig,
  getOpenAIConfig,
  getProviderConfigSummary,
  validateProviderConfig,
} from "../providers"

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
        defaultModel: "nomic-embed-text",
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

  describe("getOpenAIConfig", () => {
    it("should return null when API key is not provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = undefined

      const config = getOpenAIConfig()

      expect(config).toBeNull()
    })

    it("should return configuration when API key is provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-test-key"

      const config = getOpenAIConfig()

      expect(config).toEqual({
        type: "openai",
        apiKey: "sk-test-key",
        baseUrl: undefined,
        defaultModel: "text-embedding-3-small",
        organization: undefined,
      })
    })

    it("should use all environment variables when provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-custom-key"
      process.env[ENV_KEYS.OPENAI_BASE_URL] = "https://custom-openai.com/v1"
      process.env[ENV_KEYS.OPENAI_DEFAULT_MODEL] = "text-embedding-3-large"
      process.env[ENV_KEYS.OPENAI_ORGANIZATION] = "org-123"

      const config = getOpenAIConfig()

      expect(config).toEqual({
        type: "openai",
        apiKey: "sk-custom-key",
        baseUrl: "https://custom-openai.com/v1",
        defaultModel: "text-embedding-3-large",
        organization: "org-123",
      })
    })
  })

  describe("getGoogleConfig", () => {
    it("should return null when API key is not provided", () => {
      process.env[ENV_KEYS.GOOGLE_API_KEY] = undefined

      const config = getGoogleConfig()

      expect(config).toBeNull()
    })

    it("should return configuration when API key is provided", () => {
      process.env[ENV_KEYS.GOOGLE_API_KEY] = "google-api-key"

      const config = getGoogleConfig()

      expect(config).toEqual({
        type: "google",
        apiKey: "google-api-key",
        baseUrl: undefined,
        defaultModel: "embedding-001",
      })
    })

    it("should use all environment variables when provided", () => {
      process.env[ENV_KEYS.GOOGLE_API_KEY] = "custom-google-key"
      process.env[ENV_KEYS.GOOGLE_BASE_URL] = "https://custom-google.com"
      process.env[ENV_KEYS.GOOGLE_DEFAULT_MODEL] = "embedding-001"

      const config = getGoogleConfig()

      expect(config).toEqual({
        type: "google",
        apiKey: "custom-google-key",
        baseUrl: "https://custom-google.com",
        defaultModel: "embedding-001",
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

    it("should return all providers when API keys are provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai-key"
      process.env[ENV_KEYS.GOOGLE_API_KEY] = "google-key"

      const providers = getAvailableProviders()

      expect(providers).toHaveLength(3)
      expect(providers.map((p) => p.type)).toEqual([
        "ollama",
        "openai",
        "google",
      ])
    })

    it("should return Ollama and OpenAI when only OpenAI key is provided", () => {
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai-key"
      process.env[ENV_KEYS.GOOGLE_API_KEY] = undefined

      const providers = getAvailableProviders()

      expect(providers).toHaveLength(2)
      expect(providers.map((p) => p.type)).toEqual(["ollama", "openai"])
    })
  })

  describe("getDefaultProvider", () => {
    it("should return Ollama as default when no preference is set", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = undefined

      const provider = getDefaultProvider()

      expect(provider.type).toBe("ollama")
    })

    it("should return preferred provider when available", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "openai"
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai-key"

      const provider = getDefaultProvider()

      expect(provider.type).toBe("openai")
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

    it("should validate OpenAI configuration with API key", () => {
      const config = {
        type: "openai" as const,
        apiKey: "sk-test-key",
        defaultModel: "text-embedding-3-small",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toHaveLength(0)
    })

    it("should reject OpenAI configuration without API key", () => {
      const config = {
        type: "openai" as const,
        apiKey: "",
        defaultModel: "text-embedding-3-small",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toEqual(["OpenAI API key is required"])
    })

    it("should validate Google configuration with API key", () => {
      const config = {
        type: "google" as const,
        apiKey: "google-key",
        defaultModel: "embedding-001",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toHaveLength(0)
    })

    it("should reject Google configuration without API key", () => {
      const config = {
        type: "google" as const,
        apiKey: "",
        defaultModel: "embedding-001",
      }

      const errors = validateProviderConfig(config)

      expect(errors).toEqual(["Google AI API key is required"])
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
          defaultModel: "nomic-embed-text",
        },
        openai: {
          hasApiKey: true,
          baseUrl: "default",
          defaultModel: "text-embedding-3-small",
          hasOrganization: false,
        },
        google: {
          hasApiKey: false,
          baseUrl: "default",
          defaultModel: "embedding-001",
        },
      })
    })

    it("should handle all environment variables", () => {
      process.env[ENV_KEYS.DEFAULT_PROVIDER] = "google"
      process.env[ENV_KEYS.OPENAI_API_KEY] = "sk-openai"
      process.env[ENV_KEYS.OPENAI_BASE_URL] = "https://custom-openai.com"
      process.env[ENV_KEYS.OPENAI_ORGANIZATION] = "org-123"
      process.env[ENV_KEYS.GOOGLE_API_KEY] = "google-key"
      process.env[ENV_KEYS.GOOGLE_BASE_URL] = "https://custom-google.com"

      const summary = getProviderConfigSummary()

      expect(summary.defaultProvider).toBe("google")
      expect(summary.openai).toEqual({
        hasApiKey: true,
        baseUrl: "https://custom-openai.com",
        defaultModel: "text-embedding-3-small",
        hasOrganization: true,
      })
      expect(summary.google).toEqual({
        hasApiKey: true,
        baseUrl: "https://custom-google.com",
        defaultModel: "embedding-001",
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
