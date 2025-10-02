/**
 * Provider system exports
 * Unified interface for embedding providers (Ollama, OpenAI, Google AI, Azure, Cohere, Mistral)
 */

// Configuration helpers
export {
  getAvailableProviders,
  getDefaultProvider,
  getGoogleConfig,
  getOllamaConfig,
  getOpenAIConfig,
  getProviderConfigSummary,
  validateProviderConfig,
} from "@/shared/config/providers"
export { ENV_KEYS } from "@/shared/config/env-keys"
// Provider implementations
export {
  AzureProviderService,
  createAzureProvider,
} from "./azure-provider"
export {
  CohereProviderService,
  createCohereProvider,
} from "./cohere-provider"
// Factory and multi-provider support
export {
  createAzureConfig,
  createCohereConfig,
  createEmbeddingProviderService,
  createGoogleConfig,
  createMistralConfig,
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
export {
  createMistralProvider,
  MistralProviderService,
} from "./mistral-provider"
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
  AzureConfig,
  CohereConfig,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  GoogleConfig,
  MistralConfig,
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
} from "@/shared/errors/database"
