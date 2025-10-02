/**
 * Unified error type definitions for the EES application
 * All errors use Data.TaggedError for consistent error handling with Effect
 */

import { Data } from "effect"

/**
 * Database Error Types
 * Used for database connection and query failures
 */

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class DatabaseQueryError extends Data.TaggedError("DatabaseQueryError")<{
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

/**
 * Provider Error Types
 * Used for AI provider integration failures (Ollama, OpenAI, Google AI, etc.)
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
 * Embedding Error Types
 * Used for embedding data parsing and validation failures
 */

export class EmbeddingDataParseError extends Data.TaggedError(
  "EmbeddingDataParseError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}
