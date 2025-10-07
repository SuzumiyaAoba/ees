/**
 * Provider system exports
 * Unified interface for embedding provider (Ollama only)
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
  createProviderLayer,
  EmbeddingProviderService,
} from "./factory"
export {
  createOllamaProvider,
  OllamaProviderService,
} from "./ollama-provider"
// Core types
export type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OllamaConfig,
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
