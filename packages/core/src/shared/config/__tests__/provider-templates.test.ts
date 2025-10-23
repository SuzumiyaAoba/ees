import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import {
  OLLAMA_CONFIG_TEMPLATE,
  ALL_PROVIDER_TEMPLATES,
} from "@/shared/config/provider-templates"
import { createProviderConfig, createSimpleProviderConfig } from "@/shared/config/provider-factory"
import { ENV_KEYS } from "@/shared/config/env-keys"

// Mock the env module
vi.mock("../../lib/env", () => ({
  getEnv: vi.fn(),
  getEnvWithDefault: vi.fn(),
}))

import { getEnv, getEnvWithDefault } from "@/shared/lib/env"

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

    it("should have correct structure for Ollama template", () => {
      expect(OLLAMA_CONFIG_TEMPLATE).toEqual({
        type: "ollama",
        defaults: {
          model: "embeddinggemma",
          baseUrl: "http://localhost:11434",
        },
        optionalEnvKeys: {
          baseUrl: ENV_KEYS.OLLAMA_BASE_URL,
        },
      })
    })
  })

  describe("Template Integration with Factory", () => {




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
      })
    })

    it("should have consistent provider type keys", () => {
      const keys = Object.keys(ALL_PROVIDER_TEMPLATES)
      const expectedTypes = ["ollama"]

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

      // Test that provider types without required env vars return null
      expect(createProviderConfig({ type: "invalid" as any, defaults: {}, requiredEnvKeys: { apiKey: "INVALID_KEY" }, optionalEnvKeys: {} })).toBeNull()
    })

    it("should always return config for Ollama (no API key required)", () => {
      mockGetEnvWithDefault.mockReturnValue("default-value")

      const config = createSimpleProviderConfig(OLLAMA_CONFIG_TEMPLATE)

      expect(config).not.toBeNull()
      expect(config.type).toBe("ollama")
    })
  })
})