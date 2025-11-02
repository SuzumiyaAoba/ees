/**
 * Provider system exports
 * Unified interface for embedding providers (Ollama and OpenAI-compatible)
 */

// Configuration helpers
export { getAvailableProviders, getDefaultProvider, getOllamaConfig, getProviderConfigSummary, validateProviderConfig } from "@/shared/config/providers"
export { ENV_KEYS } from "@/shared/config/env-keys"
// Provider implementations
// Factory and multi-provider support
export {
  createEmbeddingProviderService,
  createMultiProviderConfig,
  createOllamaConfig,
  createOpenAICompatibleConfig,
  createProviderLayer,
  EmbeddingProviderService,
} from "./factory"
export {
  createOllamaProvider,
  OllamaProviderService,
} from "./ollama-provider"
export {
  createOpenAICompatibleProvider,
  OpenAICompatibleProviderService,
} from "./openai-compatible-provider"
// Core types
export type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OllamaConfig,
  OpenAICompatibleConfig,
  ProviderConfig,
} from "./types"
// Error types
export {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderError,
  ProviderModelError,
  ProviderRateLimitError,
} from "@/shared/errors/database"
