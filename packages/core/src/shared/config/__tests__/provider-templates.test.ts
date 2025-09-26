import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import {
  AZURE_CONFIG_TEMPLATE,
  COHERE_CONFIG_TEMPLATE,
  GOOGLE_CONFIG_TEMPLATE,
  MISTRAL_CONFIG_TEMPLATE,
  OLLAMA_CONFIG_TEMPLATE,
  OPENAI_CONFIG_TEMPLATE,
  ALL_PROVIDER_TEMPLATES,
} from "../provider-templates"
import { createProviderConfig, createSimpleProviderConfig } from "../provider-factory"
import { ENV_KEYS } from "../env-keys"

// Mock the env module
vi.mock("../../lib/env", () => ({
  getEnv: vi.fn(),
  getEnvWithDefault: vi.fn(),
}))

import { getEnv, getEnvWithDefault } from "../../lib/env"

const mockGetEnv = vi.mocked(getEnv)
const mockGetEnvWithDefault = vi.mocked(getEnvWithDefault)

describe("Provider Configuration Templates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("Template Structure Validation", () => {
    it("should have correct structure for OpenAI template", () => {
      expect(OPENAI_CONFIG_TEMPLATE).toEqual({
        type: "openai",
        requiredEnvKeys: {
          apiKey: ENV_KEYS.OPENAI_API_KEY,
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.OPENAI_BASE_URL,
          organization: ENV_KEYS.OPENAI_ORGANIZATION,
          defaultModel: ENV_KEYS.OPENAI_DEFAULT_MODEL,
        },
        defaults: {
          model: "text-embedding-3-small",
        },
      })
    })

    it("should have correct structure for Google template", () => {
      expect(GOOGLE_CONFIG_TEMPLATE).toEqual({
        type: "google",
        requiredEnvKeys: {
          apiKey: ENV_KEYS.GOOGLE_API_KEY,
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.GOOGLE_BASE_URL,
          defaultModel: ENV_KEYS.GOOGLE_DEFAULT_MODEL,
        },
        defaults: {
          model: "embedding-001",
        },
      })
    })

    it("should have correct structure for Azure template", () => {
      expect(AZURE_CONFIG_TEMPLATE).toEqual({
        type: "azure",
        requiredEnvKeys: {
          apiKey: ENV_KEYS.AZURE_API_KEY,
          baseUrl: ENV_KEYS.AZURE_BASE_URL,
        },
        optionalEnvKeys: {
          apiVersion: ENV_KEYS.AZURE_API_VERSION,
          defaultModel: ENV_KEYS.AZURE_DEFAULT_MODEL,
        },
        defaults: {
          model: "text-embedding-ada-002",
        },
      })
    })

    it("should have correct structure for Cohere template", () => {
      expect(COHERE_CONFIG_TEMPLATE).toEqual({
        type: "cohere",
        requiredEnvKeys: {
          apiKey: ENV_KEYS.COHERE_API_KEY,
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.COHERE_BASE_URL,
          defaultModel: ENV_KEYS.COHERE_DEFAULT_MODEL,
        },
        defaults: {
          model: "embed-english-v3.0",
        },
      })
    })

    it("should have correct structure for Mistral template", () => {
      expect(MISTRAL_CONFIG_TEMPLATE).toEqual({
        type: "mistral",
        requiredEnvKeys: {
          apiKey: ENV_KEYS.MISTRAL_API_KEY,
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.MISTRAL_BASE_URL,
          defaultModel: ENV_KEYS.MISTRAL_DEFAULT_MODEL,
        },
        defaults: {
          model: "mistral-embed",
        },
      })
    })

    it("should have correct structure for Ollama template", () => {
      expect(OLLAMA_CONFIG_TEMPLATE).toEqual({
        type: "ollama",
        defaults: {
          model: "nomic-embed-text",
          baseUrl: "http://localhost:11434",
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.OLLAMA_BASE_URL,
        },
      })
    })
  })

  describe("Template Integration with Factory", () => {
    it("should create valid OpenAI config using template", () => {
      mockGetEnv.mockImplementation((key: string) => {
        if (key === ENV_KEYS.OPENAI_API_KEY) {
          return "test-openai-key"
        }
        return undefined
      })
      mockGetEnvWithDefault.mockReturnValue("text-embedding-3-small")

      const config = createProviderConfig(OPENAI_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "openai",
        apiKey: "test-openai-key",
        defaultModel: "text-embedding-3-small",
      })
    })

    it("should create valid Google config using template", () => {
      mockGetEnv.mockImplementation((key: string) => {
        switch (key) {
          case ENV_KEYS.GOOGLE_API_KEY:
            return "test-google-key"
          case ENV_KEYS.GOOGLE_BASE_URL:
            return "https://custom.googleapis.com"
          default:
            return undefined
        }
      })
      mockGetEnvWithDefault.mockReturnValue("embedding-001")

      const config = createProviderConfig(GOOGLE_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "google",
        apiKey: "test-google-key",
        baseUrl: "https://custom.googleapis.com",
        defaultModel: "embedding-001",
      })
    })

    it("should create valid Azure config using template", () => {
      mockGetEnv.mockImplementation((key: string) => {
        switch (key) {
          case ENV_KEYS.AZURE_API_KEY:
            return "test-azure-key"
          case ENV_KEYS.AZURE_BASE_URL:
            return "https://test.openai.azure.com"
          case ENV_KEYS.AZURE_API_VERSION:
            return "2023-05-15"
          default:
            return undefined
        }
      })
      mockGetEnvWithDefault.mockReturnValue("text-embedding-ada-002")

      const config = createProviderConfig(AZURE_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "azure",
        apiKey: "test-azure-key",
        baseUrl: "https://test.openai.azure.com",
        apiVersion: "2023-05-15",
        defaultModel: "text-embedding-ada-002",
      })
    })

    it("should create valid Cohere config using template", () => {
      mockGetEnv.mockImplementation((key: string) => {
        if (key === ENV_KEYS.COHERE_API_KEY) {
          return "test-cohere-key"
        }
        return undefined
      })
      mockGetEnvWithDefault.mockReturnValue("embed-english-v3.0")

      const config = createProviderConfig(COHERE_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "cohere",
        apiKey: "test-cohere-key",
        defaultModel: "embed-english-v3.0",
      })
    })

    it("should create valid Mistral config using template", () => {
      mockGetEnv.mockImplementation((key: string) => {
        if (key === ENV_KEYS.MISTRAL_API_KEY) {
          return "test-mistral-key"
        }
        return undefined
      })
      mockGetEnvWithDefault.mockReturnValue("mistral-embed")

      const config = createProviderConfig(MISTRAL_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "mistral",
        apiKey: "test-mistral-key",
        defaultModel: "mistral-embed",
      })
    })

    it("should create valid Ollama config using template", () => {
      mockGetEnvWithDefault.mockImplementation((key: string, defaultValue: string) => {
        switch (key) {
          case "EES_OLLAMA_DEFAULT_MODEL":
            return "nomic-embed-text"
          case "EES_OLLAMA_BASE_URL":
            return "http://localhost:11434"
          default:
            return defaultValue
        }
      })

      const config = createSimpleProviderConfig(OLLAMA_CONFIG_TEMPLATE)

      expect(config).toEqual({
        type: "ollama",
        defaultModel: "nomic-embed-text",
        baseUrl: "http://localhost:11434",
      })
    })
  })

  describe("ALL_PROVIDER_TEMPLATES", () => {
    it("should contain all provider templates", () => {
      expect(ALL_PROVIDER_TEMPLATES).toEqual({
        ollama: OLLAMA_CONFIG_TEMPLATE,
        openai: OPENAI_CONFIG_TEMPLATE,
        google: GOOGLE_CONFIG_TEMPLATE,
        azure: AZURE_CONFIG_TEMPLATE,
        cohere: COHERE_CONFIG_TEMPLATE,
        mistral: MISTRAL_CONFIG_TEMPLATE,
      })
    })

    it("should have consistent provider type keys", () => {
      const keys = Object.keys(ALL_PROVIDER_TEMPLATES)
      const expectedTypes = ["ollama", "openai", "google", "azure", "cohere", "mistral"]

      expect(keys.sort()).toEqual(expectedTypes.sort())
    })

    it("should have templates with matching type property", () => {
      Object.entries(ALL_PROVIDER_TEMPLATES).forEach(([key, template]) => {
        expect(template.type).toBe(key)
      })
    })
  })

  describe("Template Return Types", () => {
    it("should return null for templates with missing required keys", () => {
      mockGetEnv.mockReturnValue(undefined) // No API keys
      mockGetEnvWithDefault.mockReturnValue("default-model")

      // Test all API key required providers
      expect(createProviderConfig(OPENAI_CONFIG_TEMPLATE)).toBeNull()
      expect(createProviderConfig(GOOGLE_CONFIG_TEMPLATE)).toBeNull()
      expect(createProviderConfig(AZURE_CONFIG_TEMPLATE)).toBeNull()
      expect(createProviderConfig(COHERE_CONFIG_TEMPLATE)).toBeNull()
      expect(createProviderConfig(MISTRAL_CONFIG_TEMPLATE)).toBeNull()
    })

    it("should always return config for Ollama (no API key required)", () => {
      mockGetEnvWithDefault.mockReturnValue("default-value")

      const config = createSimpleProviderConfig(OLLAMA_CONFIG_TEMPLATE)

      expect(config).not.toBeNull()
      expect(config.type).toBe("ollama")
    })
  })
})