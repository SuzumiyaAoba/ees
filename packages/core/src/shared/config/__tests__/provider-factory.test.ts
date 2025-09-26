import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { createProviderConfig, createSimpleProviderConfig } from "../provider-factory"
import type { ProviderConfigTemplate } from "../provider-factory"
import type {
  OpenAIConfig,
  GoogleConfig,
  AzureConfig,
  OllamaConfig,
} from "../../providers/types"

// Mock the env module
vi.mock("../../lib/env", () => ({
  getEnv: vi.fn(),
  getEnvWithDefault: vi.fn(),
}))

import { getEnv, getEnvWithDefault } from "../../lib/env"

const mockGetEnv = vi.mocked(getEnv)
const mockGetEnvWithDefault = vi.mocked(getEnvWithDefault)

describe("Provider Configuration Factory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("createProviderConfig", () => {
    it("should create OpenAI config with all required fields", () => {
      // Setup environment variables
      mockGetEnv.mockImplementation((key: string) => {
        switch (key) {
          case "EES_OPENAI_API_KEY":
            return "test-api-key"
          case "EES_OPENAI_BASE_URL":
            return "https://api.openai.com/v1"
          case "EES_OPENAI_ORGANIZATION":
            return "test-org"
          default:
            return undefined
        }
      })

      mockGetEnvWithDefault.mockImplementation((key: string, defaultValue: string) => {
        if (key === "EES_OPENAI_DEFAULT_MODEL") {
          return "text-embedding-3-large"
        }
        return defaultValue
      })

      const template: ProviderConfigTemplate<OpenAIConfig> = {
        type: "openai",
        requiredEnvKeys: {
          apiKey: "EES_OPENAI_API_KEY",
        },
        optionalEnvKeys: {
          baseUrl: "EES_OPENAI_BASE_URL",
          organization: "EES_OPENAI_ORGANIZATION",
          defaultModel: "EES_OPENAI_DEFAULT_MODEL",
        },
        defaults: {
          model: "text-embedding-3-small",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toEqual({
        type: "openai",
        apiKey: "test-api-key",
        baseUrl: "https://api.openai.com/v1",
        organization: "test-org",
        defaultModel: "text-embedding-3-large",
      })
    })

    it("should return null when required API key is missing", () => {
      mockGetEnv.mockReturnValue(undefined)

      const template: ProviderConfigTemplate<OpenAIConfig> = {
        type: "openai",
        requiredEnvKeys: {
          apiKey: "EES_OPENAI_API_KEY",
        },
        optionalEnvKeys: {},
        defaults: {
          model: "text-embedding-3-small",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toBeNull()
      expect(mockGetEnv).toHaveBeenCalledWith("EES_OPENAI_API_KEY")
    })

    it("should create config with only required fields when optional fields are missing", () => {
      mockGetEnv.mockImplementation((key: string) => {
        if (key === "EES_OPENAI_API_KEY") {
          return "test-api-key"
        }
        return undefined
      })

      mockGetEnvWithDefault.mockReturnValue("text-embedding-3-small")

      const template: ProviderConfigTemplate<OpenAIConfig> = {
        type: "openai",
        requiredEnvKeys: {
          apiKey: "EES_OPENAI_API_KEY",
        },
        optionalEnvKeys: {
          baseUrl: "EES_OPENAI_BASE_URL",
          organization: "EES_OPENAI_ORGANIZATION",
        },
        defaults: {
          model: "text-embedding-3-small",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toEqual({
        type: "openai",
        apiKey: "test-api-key",
        defaultModel: "text-embedding-3-small",
      })
    })

    it("should handle Azure config with required base URL", () => {
      mockGetEnv.mockImplementation((key: string) => {
        switch (key) {
          case "EES_AZURE_API_KEY":
            return "test-azure-key"
          case "EES_AZURE_BASE_URL":
            return "https://test.openai.azure.com"
          case "EES_AZURE_API_VERSION":
            return "2023-05-15"
          default:
            return undefined
        }
      })

      mockGetEnvWithDefault.mockReturnValue("text-embedding-ada-002")

      const template: ProviderConfigTemplate<AzureConfig> = {
        type: "azure",
        requiredEnvKeys: {
          apiKey: "EES_AZURE_API_KEY",
          baseUrl: "EES_AZURE_BASE_URL",
        },
        optionalEnvKeys: {
          apiVersion: "EES_AZURE_API_VERSION",
        },
        defaults: {
          model: "text-embedding-ada-002",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toEqual({
        type: "azure",
        apiKey: "test-azure-key",
        baseUrl: "https://test.openai.azure.com",
        apiVersion: "2023-05-15",
        defaultModel: "text-embedding-ada-002",
      })
    })

    it("should return null when required base URL is missing for Azure", () => {
      mockGetEnv.mockImplementation((key: string) => {
        if (key === "EES_AZURE_API_KEY") {
          return "test-azure-key"
        }
        return undefined // Missing base URL
      })

      const template: ProviderConfigTemplate<AzureConfig> = {
        type: "azure",
        requiredEnvKeys: {
          apiKey: "EES_AZURE_API_KEY",
          baseUrl: "EES_AZURE_BASE_URL",
        },
        optionalEnvKeys: {},
        defaults: {
          model: "text-embedding-ada-002",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toBeNull()
    })

    it("should apply custom transformation when provided", () => {
      mockGetEnv.mockReturnValue("test-api-key")
      mockGetEnvWithDefault.mockReturnValue("test-model")

      const template: ProviderConfigTemplate<GoogleConfig> = {
        type: "google",
        requiredEnvKeys: {
          apiKey: "EES_GOOGLE_API_KEY",
        },
        optionalEnvKeys: {},
        defaults: {
          model: "embedding-001",
        },
        transform: (baseConfig) => ({
          ...baseConfig,
          customField: "transformed",
        }) as GoogleConfig,
      }

      const config = createProviderConfig(template)

      expect(config).toEqual({
        type: "google",
        apiKey: "test-api-key",
        defaultModel: "test-model",
        customField: "transformed",
      })
    })

    it("should handle default model environment key correctly", () => {
      mockGetEnv.mockReturnValue("test-api-key")
      mockGetEnvWithDefault.mockImplementation((key: string, defaultValue: string) => {
        if (key === "EES_CUSTOM_MODEL_KEY") {
          return "custom-model"
        }
        return defaultValue
      })

      const template: ProviderConfigTemplate<OpenAIConfig> = {
        type: "openai",
        requiredEnvKeys: {
          apiKey: "EES_OPENAI_API_KEY",
        },
        optionalEnvKeys: {
          defaultModel: "EES_CUSTOM_MODEL_KEY",
        },
        defaults: {
          model: "default-model",
        },
      }

      const config = createProviderConfig(template)

      expect(config).toEqual({
        type: "openai",
        apiKey: "test-api-key",
        defaultModel: "custom-model",
      })
      expect(mockGetEnvWithDefault).toHaveBeenCalledWith("EES_CUSTOM_MODEL_KEY", "default-model")
    })
  })

  describe("createSimpleProviderConfig", () => {
    it("should create Ollama config with defaults", () => {
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

      const template = {
        type: "ollama" as const,
        defaults: {
          model: "nomic-embed-text",
          baseUrl: "http://localhost:11434",
        },
        optionalEnvKeys: {
          baseUrl: "EES_OLLAMA_BASE_URL",
        },
      }

      const config = createSimpleProviderConfig(template)

      expect(config).toEqual({
        type: "ollama",
        defaultModel: "nomic-embed-text",
        baseUrl: "http://localhost:11434",
      })
    })

    it("should override defaults with environment variables", () => {
      mockGetEnvWithDefault.mockImplementation((key: string, defaultValue: string) => {
        switch (key) {
          case "EES_OLLAMA_DEFAULT_MODEL":
            return "custom-model"
          case "EES_OLLAMA_BASE_URL":
            return "http://custom:11434"
          default:
            return defaultValue
        }
      })

      mockGetEnv.mockImplementation((key: string) => {
        if (key === "EES_CUSTOM_OPTION") {
          return "custom-value"
        }
        return undefined
      })

      const template = {
        type: "ollama" as const,
        defaults: {
          model: "default-model",
          baseUrl: "http://localhost:11434",
        },
        optionalEnvKeys: {
          baseUrl: "EES_OLLAMA_BASE_URL",
          customOption: "EES_CUSTOM_OPTION",
        },
      }

      const config = createSimpleProviderConfig(template)

      expect(config).toEqual({
        type: "ollama",
        defaultModel: "custom-model",
        baseUrl: "http://custom:11434",
        customOption: "custom-value",
      })
    })

    it("should apply custom transformation for simple config", () => {
      mockGetEnvWithDefault.mockReturnValue("test-model")

      const template = {
        type: "ollama" as const,
        defaults: {
          model: "default-model",
        },
        transform: (baseConfig: any) => ({
          ...baseConfig,
          enhanced: true,
        }) as OllamaConfig,
      }

      const config = createSimpleProviderConfig(template)

      expect(config).toEqual({
        type: "ollama",
        defaultModel: "test-model",
        enhanced: true,
      })
    })

    it("should handle missing optional environment variables gracefully", () => {
      mockGetEnvWithDefault.mockReturnValue("default-model")
      mockGetEnv.mockReturnValue(undefined)

      const template = {
        type: "ollama" as const,
        defaults: {
          model: "default-model",
        },
        optionalEnvKeys: {
          nonExistentKey: "EES_NON_EXISTENT",
        },
      }

      const config = createSimpleProviderConfig(template)

      expect(config).toEqual({
        type: "ollama",
        defaultModel: "default-model",
      })
    })
  })
})