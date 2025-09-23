/**
 * Provider configuration management
 * Handles environment-based configuration for embedding providers
 */

import { getEnv, getEnvWithDefault } from "@/shared/lib/env"
import type {
  AzureConfig,
  CohereConfig,
  GoogleConfig,
  MistralConfig,
  OllamaConfig,
  OpenAIConfig,
  ProviderConfig,
} from "@/shared/providers/types"

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

  // Azure OpenAI configuration
  AZURE_API_KEY: "EES_AZURE_API_KEY",
  AZURE_BASE_URL: "EES_AZURE_BASE_URL",
  AZURE_API_VERSION: "EES_AZURE_API_VERSION",
  AZURE_DEFAULT_MODEL: "EES_AZURE_DEFAULT_MODEL",

  // Cohere configuration
  COHERE_API_KEY: "EES_COHERE_API_KEY",
  COHERE_BASE_URL: "EES_COHERE_BASE_URL",
  COHERE_DEFAULT_MODEL: "EES_COHERE_DEFAULT_MODEL",

  // Mistral configuration
  MISTRAL_API_KEY: "EES_MISTRAL_API_KEY",
  MISTRAL_BASE_URL: "EES_MISTRAL_BASE_URL",
  MISTRAL_DEFAULT_MODEL: "EES_MISTRAL_DEFAULT_MODEL",
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
      "nomic-embed-text"
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

  const baseUrl = getEnv(ENV_KEYS.OPENAI_BASE_URL)
  const organization = getEnv(ENV_KEYS.OPENAI_ORGANIZATION)

  return {
    type: "openai" as const,
    apiKey,
    defaultModel: getEnvWithDefault(
      ENV_KEYS.OPENAI_DEFAULT_MODEL,
      "text-embedding-3-small"
    ),
    ...(baseUrl && { baseUrl }),
    ...(organization && { organization }),
  } as OpenAIConfig
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

  const baseUrl = getEnv(ENV_KEYS.GOOGLE_BASE_URL)

  return {
    type: "google" as const,
    apiKey,
    defaultModel: getEnvWithDefault(
      ENV_KEYS.GOOGLE_DEFAULT_MODEL,
      "embedding-001"
    ),
    ...(baseUrl && { baseUrl }),
  } as GoogleConfig
}

/**
 * Get Azure OpenAI configuration from environment
 * @returns Azure config or null if API key or base URL is not provided
 */
export function getAzureConfig(): AzureConfig | null {
  const apiKey = getEnv(ENV_KEYS.AZURE_API_KEY)
  const baseUrl = getEnv(ENV_KEYS.AZURE_BASE_URL)
  if (!(apiKey && baseUrl)) {
    return null
  }

  const apiVersion = getEnv(ENV_KEYS.AZURE_API_VERSION)

  return {
    type: "azure" as const,
    apiKey,
    baseUrl,
    defaultModel: getEnvWithDefault(
      ENV_KEYS.AZURE_DEFAULT_MODEL,
      "text-embedding-ada-002"
    ),
    ...(apiVersion && { apiVersion }),
  } as AzureConfig
}

/**
 * Get Cohere configuration from environment
 * @returns Cohere config or null if API key is not provided
 */
export function getCohereConfig(): CohereConfig | null {
  const apiKey = getEnv(ENV_KEYS.COHERE_API_KEY)
  if (!apiKey) {
    return null
  }

  const baseUrl = getEnv(ENV_KEYS.COHERE_BASE_URL)

  return {
    type: "cohere" as const,
    apiKey,
    defaultModel: getEnvWithDefault(
      ENV_KEYS.COHERE_DEFAULT_MODEL,
      "embed-english-v3.0"
    ),
    ...(baseUrl && { baseUrl }),
  } as CohereConfig
}

/**
 * Get Mistral configuration from environment
 * @returns Mistral config or null if API key is not provided
 */
export function getMistralConfig(): MistralConfig | null {
  const apiKey = getEnv(ENV_KEYS.MISTRAL_API_KEY)
  if (!apiKey) {
    return null
  }

  const baseUrl = getEnv(ENV_KEYS.MISTRAL_BASE_URL)

  return {
    type: "mistral" as const,
    apiKey,
    defaultModel: getEnvWithDefault(
      ENV_KEYS.MISTRAL_DEFAULT_MODEL,
      "mistral-embed"
    ),
    ...(baseUrl && { baseUrl }),
  } as MistralConfig
}

/**
 * Get all available provider configurations from environment
 */
export function getAvailableProviders(): ProviderConfig[] {
  const providers = []

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

  // Add Azure if API key and base URL are provided
  const azureConfig = getAzureConfig()
  if (azureConfig) {
    providers.push(azureConfig)
  }

  // Add Cohere if API key is provided
  const cohereConfig = getCohereConfig()
  if (cohereConfig) {
    providers.push(cohereConfig)
  }

  // Add Mistral if API key is provided
  const mistralConfig = getMistralConfig()
  if (mistralConfig) {
    providers.push(mistralConfig)
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
  const firstProvider = availableProviders[0]
  if (firstProvider) {
    return firstProvider
  }

  // Ultimate fallback to Ollama config
  return getOllamaConfig()
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: ProviderConfig): string[] {
  const errors = []

  switch (config.type) {
    case "openai": {
      if (!config.apiKey) {
        errors.push("OpenAI API key is required")
      }
      break
    }
    case "google": {
      if (!config.apiKey) {
        errors.push("Google AI API key is required")
      }
      break
    }
    case "ollama": {
      if (!config.baseUrl) {
        errors.push("Ollama base URL is required")
      }
      break
    }
    case "azure": {
      if (!config.apiKey) {
        errors.push("Azure API key is required")
      }
      if (!config.baseUrl) {
        errors.push("Azure base URL is required")
      }
      break
    }
    case "cohere": {
      if (!config.apiKey) {
        errors.push("Cohere API key is required")
      }
      break
    }
    case "mistral": {
      if (!config.apiKey) {
        errors.push("Mistral API key is required")
      }
      break
    }
    default:
      errors.push(
        `Unsupported provider type: ${config.type}`
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
        "nomic-embed-text"
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
        "embedding-001"
      ),
    },
    azure: {
      hasApiKey: Boolean(getEnv(ENV_KEYS.AZURE_API_KEY)),
      hasBaseUrl: Boolean(getEnv(ENV_KEYS.AZURE_BASE_URL)),
      apiVersion: getEnv(ENV_KEYS.AZURE_API_VERSION) || "default",
      defaultModel: getEnvWithDefault(
        ENV_KEYS.AZURE_DEFAULT_MODEL,
        "text-embedding-ada-002"
      ),
    },
    cohere: {
      hasApiKey: Boolean(getEnv(ENV_KEYS.COHERE_API_KEY)),
      baseUrl: getEnv(ENV_KEYS.COHERE_BASE_URL) || "default",
      defaultModel: getEnvWithDefault(
        ENV_KEYS.COHERE_DEFAULT_MODEL,
        "embed-english-v3.0"
      ),
    },
    mistral: {
      hasApiKey: Boolean(getEnv(ENV_KEYS.MISTRAL_API_KEY)),
      baseUrl: getEnv(ENV_KEYS.MISTRAL_BASE_URL) || "default",
      defaultModel: getEnvWithDefault(
        ENV_KEYS.MISTRAL_DEFAULT_MODEL,
        "mistral-embed"
      ),
    },
  }
}
