/**
 * Provider system exports
 * Unified interface for embedding providers (Ollama and OpenAI-compatible)
 *
 * Note: Provider configuration is now managed through the Connection system.
 * Environment-based configuration functions are deprecated.
 */

// Configuration helpers (deprecated - use ConnectionService instead)
export { getAvailableProviders, validateProviderConfig } from "@/shared/config/providers"
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
