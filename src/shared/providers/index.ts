/**
 * Provider system exports
 * Unified interface for embedding providers (Ollama, OpenAI, Google AI)
 */

// Configuration helpers
export {
  ENV_KEYS,
  getAvailableProviders,
  getDefaultProvider,
  getGoogleConfig,
  getOllamaConfig,
  getOpenAIConfig,
  getProviderConfigSummary,
  validateProviderConfig,
} from "../config/providers"
// Factory and multi-provider support
export {
  createEmbeddingProviderService,
  createGoogleConfig,
  createMultiProviderConfig,
  createOllamaConfig,
  createOpenAIConfig,
  createProviderLayer,
  EmbeddingProviderService,
} from "./factory"
export {
  createGoogleProvider,
  GoogleProviderService,
} from "./google-provider"
// Provider implementations
export {
  createOllamaProvider,
  OllamaProviderService,
} from "./ollama-provider"
export {
  createOpenAIProvider,
  OpenAIProviderService,
} from "./openai-provider"
// Core types
export type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  GoogleConfig,
  ModelInfo,
  OllamaConfig,
  OpenAIConfig,
  ProviderConfig,
} from "./types"
// Error types
export {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./types"
