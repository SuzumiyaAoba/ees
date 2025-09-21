/**
 * Provider abstraction types for embedding services
 * Supports multiple providers: Ollama, OpenAI, Google AI
 */

import type { Effect } from "effect"
import { Data } from "effect"

/**
 * Base configuration interface for all embedding providers
 * Contains common settings shared across different provider implementations
 */
export interface ProviderConfig {
  readonly type: "ollama" | "openai" | "google" | "azure" | "cohere" | "mistral"
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly defaultModel?: string
}

/**
 * Configuration for Ollama local embedding provider
 * Ollama runs locally and provides free embedding models
 */
export interface OllamaConfig extends ProviderConfig {
  readonly type: "ollama"
  /** Base URL for Ollama API endpoint @default "http://localhost:11434" */
  readonly baseUrl?: string
  /** Default model name to use @default "nomic-embed-text" */
  readonly defaultModel?: string
}

/**
 * Configuration for OpenAI embedding provider
 * Requires API key and provides high-quality embeddings
 */
export interface OpenAIConfig extends ProviderConfig {
  readonly type: "openai"
  /** OpenAI API key for authentication */
  readonly apiKey: string
  /** Base URL for OpenAI API @default "https://api.openai.com/v1" */
  readonly baseUrl?: string
  /** Default model name @default "text-embedding-3-small" */
  readonly defaultModel?: string
  /** OpenAI organization ID (optional) */
  readonly organization?: string
}

/**
 * Configuration for Google AI embedding provider
 * Uses Google AI Studio for embeddings
 */
export interface GoogleConfig extends ProviderConfig {
  readonly type: "google"
  /** Google AI API key for authentication */
  readonly apiKey: string
  /** Base URL for Google AI API endpoint */
  readonly baseUrl?: string
  /** Default model name @default "embedding-001" */
  readonly defaultModel?: string
}

export interface AzureConfig extends ProviderConfig {
  readonly type: "azure"
  readonly apiKey: string
  readonly baseUrl: string // Required: Azure endpoint URL
  readonly defaultModel?: string // Default: text-embedding-ada-002
  readonly apiVersion?: string // Azure API version
}

export interface CohereConfig extends ProviderConfig {
  readonly type: "cohere"
  readonly apiKey: string
  readonly baseUrl?: string // Default: Cohere API endpoint
  readonly defaultModel?: string // Default: embed-english-v3.0
}

export interface MistralConfig extends ProviderConfig {
  readonly type: "mistral"
  readonly apiKey: string
  readonly baseUrl?: string // Default: Mistral API endpoint
  readonly defaultModel?: string // Default: mistral-embed
}

/**
 * Information about an embedding model from a provider
 * Contains metadata about model capabilities and pricing
 */
export interface ModelInfo {
  /** Model name as recognized by the provider */
  readonly name: string
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
 * Provider-specific error types using Effect Data
 */
export class ProviderError extends Data.TaggedError("ProviderError")<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export class ProviderConnectionError extends Data.TaggedError(
  "ProviderConnectionError"
)<{
  readonly provider: string
  readonly message: string
  readonly errorCode?: string
  readonly cause?: unknown
}> {}

export class ProviderModelError extends Data.TaggedError("ProviderModelError")<{
  readonly provider: string
  readonly modelName: string
  readonly message: string
  readonly errorCode?: string
  readonly cause?: unknown
}> {}

export class ProviderAuthenticationError extends Data.TaggedError(
  "ProviderAuthenticationError"
)<{
  readonly provider: string
  readonly message: string
  readonly errorCode?: string
  readonly cause?: unknown
}> {}

export class ProviderRateLimitError extends Data.TaggedError(
  "ProviderRateLimitError"
)<{
  readonly provider: string
  readonly message: string
  readonly retryAfter?: number
  readonly errorCode?: string
  readonly cause?: unknown
}> {}

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
