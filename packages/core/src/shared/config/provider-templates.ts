/**
 * Provider configuration templates
 * Centralized definitions for all provider configurations
 */

import type {
  AzureConfig,
  CohereConfig,
  GoogleConfig,
  MistralConfig,
  OpenAIConfig,
} from "@/shared/providers/types"
import type { ProviderConfigTemplate } from "@/shared/config/provider-factory"
import { ENV_KEYS } from "@/shared/config/env-keys"

/**
 * Ollama configuration template
 * Special case - no API key required, uses simple factory
 */
export const OLLAMA_CONFIG_TEMPLATE = {
  type: "ollama" as const,
  defaults: {
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  },
  optionalEnvKeys: {
    baseUrl: ENV_KEYS.OLLAMA_BASE_URL,
  },
} as const

/**
 * OpenAI configuration template
 */
export const OPENAI_CONFIG_TEMPLATE: ProviderConfigTemplate<OpenAIConfig> = {
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
} as const

/**
 * Google AI configuration template
 */
export const GOOGLE_CONFIG_TEMPLATE: ProviderConfigTemplate<GoogleConfig> = {
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
} as const

/**
 * Azure OpenAI configuration template
 */
export const AZURE_CONFIG_TEMPLATE: ProviderConfigTemplate<AzureConfig> = {
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
} as const

/**
 * Cohere configuration template
 */
export const COHERE_CONFIG_TEMPLATE: ProviderConfigTemplate<CohereConfig> = {
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
} as const

/**
 * Mistral configuration template
 */
export const MISTRAL_CONFIG_TEMPLATE: ProviderConfigTemplate<MistralConfig> = {
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
} as const

/**
 * All provider configuration templates
 * Useful for iteration and dynamic configuration
 */
export const ALL_PROVIDER_TEMPLATES = {
  ollama: OLLAMA_CONFIG_TEMPLATE,
  openai: OPENAI_CONFIG_TEMPLATE,
  google: GOOGLE_CONFIG_TEMPLATE,
  azure: AZURE_CONFIG_TEMPLATE,
  cohere: COHERE_CONFIG_TEMPLATE,
  mistral: MISTRAL_CONFIG_TEMPLATE,
} as const

/**
 * Provider template lookup by type
 */
export type ProviderTemplateMap = typeof ALL_PROVIDER_TEMPLATES
export type ProviderType = keyof ProviderTemplateMap