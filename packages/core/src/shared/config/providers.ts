/**
 * Provider configuration management
 * Handles environment-based configuration for embedding providers
 * Refactored to use generic configuration factory pattern
 */

import { getEnvWithDefault } from "@/shared/lib/env"
import type { OllamaConfig, ProviderConfig } from "@/shared/providers/types"
import { createSimpleProviderConfig } from "@/shared/config/provider-factory"
import { OLLAMA_CONFIG_TEMPLATE } from "@/shared/config/provider-templates"
import { ENV_KEYS } from "@/shared/config/env-keys"

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
// Removed: Only Ollama is supported

/**
 * Get Google AI configuration from environment
 * @returns Google config or null if API key is not provided
 */
// Removed: Only Ollama is supported

/**
 * Get Azure OpenAI configuration from environment
 * @returns Azure config or null if API key or base URL is not provided
 */
// Removed: Only Ollama is supported

/**
 * Get Cohere configuration from environment
 * @returns Cohere config or null if API key is not provided
 */
// Removed: Only Ollama is supported

/**
 * Get Mistral configuration from environment
 * @returns Mistral config or null if API key is not provided
 */
// Removed: Only Ollama is supported

/**
 * Get all available provider configurations from environment
 */
export function getAvailableProviders(): ProviderConfig[] {
  const providers = []

  // Always include Ollama as it's the default/fallback
  providers.push(getOllamaConfig())

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
    case "ollama": {
      if (!config.baseUrl) {
        errors.push("Ollama base URL is required")
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
  }
}
