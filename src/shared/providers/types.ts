/**
 * Provider abstraction types for embedding services
 * Supports multiple providers: Ollama, OpenAI, Google AI
 */

import type { Effect } from "effect"

/**
 * Configuration for different embedding providers
 */
export interface ProviderConfig {
  readonly type: "ollama" | "openai" | "google"
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly defaultModel?: string
}

export interface OllamaConfig extends ProviderConfig {
  readonly type: "ollama"
  readonly baseUrl?: string // Default: http://localhost:11434
  readonly defaultModel?: string // Default: embeddinggemma:300m
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
  readonly defaultModel?: string // Default: text-embedding-004
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
  readonly modelName?: string
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
 * Provider-specific error types
 */
export abstract class ProviderError extends Error {
  abstract readonly provider: string
  abstract readonly errorCode: string | undefined
}

export class ProviderConnectionError extends ProviderError {
  readonly provider: string
  readonly errorCode: string | undefined

  constructor(params: {
    provider: string
    message: string
    errorCode?: string
    cause?: unknown
  }) {
    super(params.message)
    this.provider = params.provider
    this.errorCode = params.errorCode ?? undefined
    this.cause = params.cause
  }
}

export class ProviderModelError extends ProviderError {
  readonly provider: string
  readonly modelName: string
  readonly errorCode: string | undefined

  constructor(params: {
    provider: string
    modelName: string
    message: string
    errorCode?: string
    cause?: unknown
  }) {
    super(params.message)
    this.provider = params.provider
    this.modelName = params.modelName
    this.errorCode = params.errorCode ?? undefined
    this.cause = params.cause
  }
}

export class ProviderAuthenticationError extends ProviderError {
  readonly provider: string
  readonly errorCode: string | undefined

  constructor(params: {
    provider: string
    message: string
    errorCode?: string
    cause?: unknown
  }) {
    super(params.message)
    this.provider = params.provider
    this.errorCode = params.errorCode ?? undefined
    this.cause = params.cause
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly provider: string
  readonly retryAfter: number | undefined
  readonly errorCode: string | undefined

  constructor(params: {
    provider: string
    message: string
    retryAfter?: number
    errorCode?: string
    cause?: unknown
  }) {
    super(params.message)
    this.provider = params.provider
    this.retryAfter = params.retryAfter ?? undefined
    this.errorCode = params.errorCode ?? undefined
    this.cause = params.cause
  }
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
    ProviderConnectionError | ProviderAuthenticationError
  >
}
