/**
 * Provider configuration management
 * Handles environment-based configuration for embedding providers
 */

import { getEnv, getEnvWithDefault } from "../lib/env"
import type {
  GoogleConfig,
  OllamaConfig,
  OpenAIConfig,
  ProviderConfig,
} from "../providers/types"

/**
 * Environment variable keys for provider configuration
 */
export const ENV_KEYS = {
  // Default provider
  DEFAULT_PROVIDER: "EES_DEFAULT_PROVIDER",

  // Ollama configuration
  OLLAMA_BASE_URL: "EES_OLLAMA_BASE_URL",
  OLLAMA_DEFAULT_MODEL: "EES_OLLAMA_DEFAULT_MODEL",

  // OpenAI configuration
  OPENAI_API_KEY: "EES_OPENAI_API_KEY",
  OPENAI_BASE_URL: "EES_OPENAI_BASE_URL",
  OPENAI_DEFAULT_MODEL: "EES_OPENAI_DEFAULT_MODEL",
  OPENAI_ORGANIZATION: "EES_OPENAI_ORGANIZATION",

  // Google AI configuration
  GOOGLE_API_KEY: "EES_GOOGLE_API_KEY",
  GOOGLE_BASE_URL: "EES_GOOGLE_BASE_URL",
  GOOGLE_DEFAULT_MODEL: "EES_GOOGLE_DEFAULT_MODEL",
} as const

/**
 * Get Ollama configuration from environment
 */
export function getOllamaConfig(): OllamaConfig {
  return {
    type: "ollama",
    baseUrl: getEnvWithDefault(
      ENV_KEYS.OLLAMA_BASE_URL,
      "http://localhost:11434"
    ),
    defaultModel: getEnvWithDefault(
      ENV_KEYS.OLLAMA_DEFAULT_MODEL,
      "embeddinggemma:300m"
    ),
  }
}

/**
 * Get OpenAI configuration from environment
 * @returns OpenAI config or null if API key is not provided
 */
export function getOpenAIConfig(): OpenAIConfig | null {
  const apiKey = getEnv(ENV_KEYS.OPENAI_API_KEY)
  if (!apiKey) {
    return null
  }

  return {
    type: "openai",
    apiKey,
    baseUrl: getEnv(ENV_KEYS.OPENAI_BASE_URL),
    defaultModel: getEnvWithDefault(
      ENV_KEYS.OPENAI_DEFAULT_MODEL,
      "text-embedding-3-small"
    ),
    organization: getEnv(ENV_KEYS.OPENAI_ORGANIZATION),
  }
}

/**
 * Get Google AI configuration from environment
 * @returns Google config or null if API key is not provided
 */
export function getGoogleConfig(): GoogleConfig | null {
  const apiKey = getEnv(ENV_KEYS.GOOGLE_API_KEY)
  if (!apiKey) {
    return null
  }

  return {
    type: "google",
    apiKey,
    baseUrl: getEnv(ENV_KEYS.GOOGLE_BASE_URL),
    defaultModel: getEnvWithDefault(
      ENV_KEYS.GOOGLE_DEFAULT_MODEL,
      "text-embedding-004"
    ),
  }
}

/**
 * Get all available provider configurations from environment
 */
export function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = []

  // Always include Ollama as it's the default/fallback
  providers.push(getOllamaConfig())

  // Add OpenAI if API key is provided
  const openaiConfig = getOpenAIConfig()
  if (openaiConfig) {
    providers.push(openaiConfig)
  }

  // Add Google AI if API key is provided
  const googleConfig = getGoogleConfig()
  if (googleConfig) {
    providers.push(googleConfig)
  }

  return providers
}

/**
 * Get the default provider configuration based on environment
 */
export function getDefaultProvider(): ProviderConfig {
  const defaultProviderType = getEnvWithDefault(
    ENV_KEYS.DEFAULT_PROVIDER,
    "ollama"
  )
  const availableProviders = getAvailableProviders()

  // Find the requested default provider
  const requestedProvider = availableProviders.find(
    (p) => p.type === defaultProviderType
  )
  if (requestedProvider) {
    return requestedProvider
  }

  // Fallback to first available provider (should always be Ollama)
  if (availableProviders.length > 0) {
    return availableProviders[0]
  }

  // Ultimate fallback to Ollama config
  return getOllamaConfig()
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: ProviderConfig): string[] {
  const errors: string[] = []

  switch (config.type) {
    case "openai": {
      const openaiConfig = config as OpenAIConfig
      if (!openaiConfig.apiKey) {
        errors.push("OpenAI API key is required")
      }
      break
    }
    case "google": {
      const googleConfig = config as GoogleConfig
      if (!googleConfig.apiKey) {
        errors.push("Google AI API key is required")
      }
      break
    }
    case "ollama": {
      const ollamaConfig = config as OllamaConfig
      if (!ollamaConfig.baseUrl) {
        errors.push("Ollama base URL is required")
      }
      break
    }
    default:
      errors.push(
        `Unsupported provider type: ${(config as ProviderConfig).type}`
      )
  }

  return errors
}

/**
 * Get provider-specific configuration for debugging/logging
 */
export function getProviderConfigSummary(): Record<string, unknown> {
  return {
    defaultProvider: getEnvWithDefault(ENV_KEYS.DEFAULT_PROVIDER, "ollama"),
    ollama: {
      baseUrl: getEnvWithDefault(
        ENV_KEYS.OLLAMA_BASE_URL,
        "http://localhost:11434"
      ),
      defaultModel: getEnvWithDefault(
        ENV_KEYS.OLLAMA_DEFAULT_MODEL,
        "embeddinggemma:300m"
      ),
    },
    openai: {
      hasApiKey: Boolean(getEnv(ENV_KEYS.OPENAI_API_KEY)),
      baseUrl: getEnv(ENV_KEYS.OPENAI_BASE_URL) || "default",
      defaultModel: getEnvWithDefault(
        ENV_KEYS.OPENAI_DEFAULT_MODEL,
        "text-embedding-3-small"
      ),
      hasOrganization: Boolean(getEnv(ENV_KEYS.OPENAI_ORGANIZATION)),
    },
    google: {
      hasApiKey: Boolean(getEnv(ENV_KEYS.GOOGLE_API_KEY)),
      baseUrl: getEnv(ENV_KEYS.GOOGLE_BASE_URL) || "default",
      defaultModel: getEnvWithDefault(
        ENV_KEYS.GOOGLE_DEFAULT_MODEL,
        "text-embedding-004"
      ),
    },
  }
}
