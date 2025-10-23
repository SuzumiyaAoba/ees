/**
 * Provider configuration templates
 * Centralized definitions for all provider configurations
 */

// Non-Ollama providers removed
import { ENV_KEYS } from "@/shared/config/env-keys"

/**
 * Ollama configuration template
 * Special case - no API key required, uses simple factory
 */
export const OLLAMA_CONFIG_TEMPLATE = {
  type: "ollama" as const,
  defaults: {
    model: "embeddinggemma",
    baseUrl: "http://localhost:11434",
  },
  optionalEnvKeys: {
    baseUrl: ENV_KEYS.OLLAMA_BASE_URL,
  },
} as const

// Non-Ollama templates removed

/**
 * All provider configuration templates
 * Useful for iteration and dynamic configuration
 */
export const ALL_PROVIDER_TEMPLATES = {
  ollama: OLLAMA_CONFIG_TEMPLATE,
} as const

/**
 * Provider template lookup by type
 */
export type ProviderTemplateMap = typeof ALL_PROVIDER_TEMPLATES
export type ProviderType = keyof ProviderTemplateMap