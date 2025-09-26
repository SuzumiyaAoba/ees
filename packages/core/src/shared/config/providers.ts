/**
 * Provider configuration management
 * Handles environment-based configuration for embedding providers
 * Refactored to use generic configuration factory pattern
 */

import { getEnv, getEnvWithDefault } from "../lib/env"
import type {
  AzureConfig,
  CohereConfig,
  GoogleConfig,
  MistralConfig,
  OllamaConfig,
  OpenAIConfig,
  ProviderConfig,
} from "../providers/types"
import { createProviderConfig, createSimpleProviderConfig } from "./provider-factory"
import {
  AZURE_CONFIG_TEMPLATE,
  COHERE_CONFIG_TEMPLATE,
  GOOGLE_CONFIG_TEMPLATE,
  MISTRAL_CONFIG_TEMPLATE,
  OLLAMA_CONFIG_TEMPLATE,
  OPENAI_CONFIG_TEMPLATE,
} from "./provider-templates"
import { ENV_KEYS } from "./env-keys"

/**
 * Get Ollama configuration from environment
 * Ollama doesn't require API key authentication
 */
export const getOllamaConfig = (): OllamaConfig =>
  createSimpleProviderConfig(OLLAMA_CONFIG_TEMPLATE)

/**
 * Get OpenAI configuration from environment
 * @returns OpenAI config or null if API key is not provided
 */
export const getOpenAIConfig = (): OpenAIConfig | null =>
  createProviderConfig(OPENAI_CONFIG_TEMPLATE)

/**
 * Get Google AI configuration from environment
 * @returns Google config or null if API key is not provided
 */
export const getGoogleConfig = (): GoogleConfig | null =>
  createProviderConfig(GOOGLE_CONFIG_TEMPLATE)

/**
 * Get Azure OpenAI configuration from environment
 * @returns Azure config or null if API key or base URL is not provided
 */
export const getAzureConfig = (): AzureConfig | null =>
  createProviderConfig(AZURE_CONFIG_TEMPLATE)

/**
 * Get Cohere configuration from environment
 * @returns Cohere config or null if API key is not provided
 */
export const getCohereConfig = (): CohereConfig | null =>
  createProviderConfig(COHERE_CONFIG_TEMPLATE)

/**
 * Get Mistral configuration from environment
 * @returns Mistral config or null if API key is not provided
 */
export const getMistralConfig = (): MistralConfig | null =>
  createProviderConfig(MISTRAL_CONFIG_TEMPLATE)

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
