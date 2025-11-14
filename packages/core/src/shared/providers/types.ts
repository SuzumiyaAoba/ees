/**
 * Provider abstraction types for embedding services
 * Supports multiple providers: Ollama, OpenAI, Google AI
 */

import type { Effect } from "effect"
import type {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/errors/database"

/**
 * Base configuration interface for all embedding providers
 * Contains common settings shared across different provider implementations
 */
export interface ProviderConfig {
  readonly type: string
  readonly apiKey?: string
  readonly baseUrl?: string
}

/**
 * Configuration for Ollama local embedding provider
 * Ollama runs locally and provides free embedding models
 */
export interface OllamaConfig extends ProviderConfig {
  readonly type: "ollama"
  /** Base URL for Ollama API endpoint @default "http://localhost:11434" */
  readonly baseUrl?: string
}

/**
 * Configuration for OpenAI-compatible embedding provider
 * Supports any OpenAI-compatible API endpoint (e.g., LM Studio, LocalAI)
 */
export interface OpenAICompatibleConfig extends ProviderConfig {
  readonly type: "openai-compatible"
  /** Base URL for the OpenAI-compatible API endpoint */
  readonly baseUrl: string
  /** API key for authentication (optional for local services) */
  readonly apiKey?: string
  /** Custom headers to include in requests */
  readonly customHeaders?: Record<string, string>
}

/**
 * Information about an embedding model from a provider
 * Contains metadata about model capabilities and pricing
 */
export interface ModelInfo {
  /** Model name as recognized by the provider (normalized, without version tags) */
  readonly name: string
  /** Full model name including version tags (e.g., "gemma3:27b") for display purposes */
  readonly fullName?: string | undefined
  /** Provider that offers this model */
  readonly provider: string
  /** Number of dimensions in the embedding vector */
  readonly dimensions?: number | undefined
  /** Maximum number of tokens the model can process */
  readonly maxTokens?: number | undefined
  /** Cost per token for using this model */
  readonly pricePerToken?: number | undefined
}

/**
 * Request object for generating an embedding
 * Contains the text to embed and optional model selection
 */
export interface EmbeddingRequest {
  /** Text content to generate embedding for */
  readonly text: string
  /** Optional model name to use (defaults to provider's default) */
  readonly modelName?: string | undefined
}

/**
 * Response object containing generated embedding and metadata
 * Returned by all embedding providers in a standardized format
 */
export interface EmbeddingResponse {
  /** The generated embedding as a vector of numbers */
  readonly embedding: number[]
  /** Name of the model used to generate the embedding */
  readonly model: string
  /** Name of the provider that generated the embedding */
  readonly provider: string
  /** Number of dimensions in the embedding vector */
  readonly dimensions: number
  /** Number of tokens consumed (if available from provider) */
  readonly tokensUsed?: number
}

/**
 * Generic embedding provider interface
 */
export interface EmbeddingProvider {
  readonly generateEmbedding: (
    request: EmbeddingRequest
  ) => Effect.Effect<
    EmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
  >

  readonly listModels: () => Effect.Effect<
    ModelInfo[],
    ProviderConnectionError | ProviderAuthenticationError
  >

  readonly isModelAvailable: (
    modelName: string
  ) => Effect.Effect<
    boolean,
    ProviderConnectionError | ProviderAuthenticationError
  >

  readonly getModelInfo: (
    modelName: string
  ) => Effect.Effect<
    ModelInfo | null,
    ProviderConnectionError | ProviderAuthenticationError | ProviderModelError
  >
}
