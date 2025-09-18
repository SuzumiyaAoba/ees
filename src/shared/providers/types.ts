/**
 * Provider abstraction types for embedding services
 * Supports multiple providers: Ollama, OpenAI, Google AI
 */

import type { Effect } from "effect"
import { Data } from "effect"

/**
 * Configuration for different embedding providers
 */
export interface ProviderConfig {
  readonly type: "ollama" | "openai" | "google" | "azure" | "cohere" | "mistral"
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly defaultModel?: string
}

export interface OllamaConfig extends ProviderConfig {
  readonly type: "ollama"
  readonly baseUrl?: string // Default: http://localhost:11434
  readonly defaultModel?: string // Default: nomic-embed-text
}

export interface OpenAIConfig extends ProviderConfig {
  readonly type: "openai"
  readonly apiKey: string
  readonly baseUrl?: string // Default: https://api.openai.com/v1
  readonly defaultModel?: string // Default: text-embedding-3-small
  readonly organization?: string
}

export interface GoogleConfig extends ProviderConfig {
  readonly type: "google"
  readonly apiKey: string
  readonly baseUrl?: string // Default: Google AI Studio endpoint
  readonly defaultModel?: string // Default: embedding-001
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
 * Model information from providers
 */
export interface ModelInfo {
  readonly name: string
  readonly provider: string
  readonly dimensions?: number | undefined
  readonly maxTokens?: number | undefined
  readonly pricePerToken?: number | undefined
}

/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
  readonly text: string
  readonly modelName?: string | undefined
}

/**
 * Embedding generation response
 */
export interface EmbeddingResponse {
  readonly embedding: number[]
  readonly model: string
  readonly provider: string
  readonly dimensions: number
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
    ProviderConnectionError | ProviderAuthenticationError
  >
}
