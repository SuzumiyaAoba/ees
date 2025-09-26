/**
 * Centralized provider error handling utility
 * Eliminates duplicate error handling patterns across all AI providers
 */

import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  type ProviderConfig,
  type EmbeddingRequest,
} from "./types"

/**
 * Context information needed for error handling
 */
export interface ProviderErrorContext {
  readonly provider: string
  readonly modelName?: string | undefined
  readonly operation: string
  readonly fallbackModel?: string | undefined
}

/**
 * Standard HTTP status codes that providers commonly use
 */
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

/**
 * Extract error message from various error object structures
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    // Try different common error message patterns
    if ("message" in error && typeof error.message === "string") {
      return error.message
    }
    if ("error" in error && typeof error.error === "string") {
      return error.error
    }
    if ("error" in error && typeof error.error === "object" && error.error && "message" in error.error) {
      return String(error.error.message)
    }
    // Handle nested error structures
    if ("body" in error && typeof error.body === "object" && error.body && "error" in error.body) {
      return extractErrorMessage(error.body.error, fallback)
    }
  }
  return fallback
}

/**
 * Extract HTTP status code from error object
 */
function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    if ("status" in error && typeof error.status === "number") {
      return error.status
    }
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode
    }
    if ("code" in error && typeof error.code === "number") {
      return error.code
    }
  }
  return undefined
}

/**
 * Get appropriate model name for error context
 */
function getModelNameForError(
  context: ProviderErrorContext,
  request?: EmbeddingRequest,
  config?: ProviderConfig
): string {
  return (
    context.modelName ??
    request?.modelName ??
    config?.defaultModel ??
    context.fallbackModel ??
    "unknown-model"
  )
}

/**
 * Centralized provider error handling function
 * Maps HTTP status codes and error patterns to appropriate provider error types
 */
export function handleProviderError(
  error: unknown,
  context: ProviderErrorContext,
  request?: EmbeddingRequest,
  config?: ProviderConfig
): ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError {
  const statusCode = extractStatusCode(error)
  const baseMessage = extractErrorMessage(error, `Unknown ${context.provider} error`)
  const modelName = getModelNameForError(context, request, config)

  // Handle HTTP status code based errors
  if (statusCode) {
    switch (statusCode) {
      case HTTP_STATUS.UNAUTHORIZED:
      case HTTP_STATUS.FORBIDDEN:
        return new ProviderAuthenticationError({
          provider: context.provider,
          message: `Authentication failed: ${baseMessage}`,
          errorCode: "UNAUTHORIZED",
          cause: error,
        })

      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return new ProviderRateLimitError({
          provider: context.provider,
          message: `Rate limit exceeded: ${baseMessage}`,
          errorCode: "RATE_LIMITED",
          cause: error,
        })

      case HTTP_STATUS.NOT_FOUND:
        return new ProviderModelError({
          provider: context.provider,
          modelName,
          message: `Model not found: ${baseMessage}`,
          errorCode: "MODEL_NOT_FOUND",
          cause: error,
        })

      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return new ProviderConnectionError({
          provider: context.provider,
          message: `${context.provider} service error: ${baseMessage}`,
          errorCode: statusCode.toString(),
          cause: error,
        })

      default:
        return new ProviderConnectionError({
          provider: context.provider,
          message: `${context.provider} API error: ${baseMessage}`,
          errorCode: statusCode.toString(),
          cause: error,
        })
    }
  }

  // Handle non-HTTP errors (network errors, parsing errors, etc.)
  const errorString = String(error).toLowerCase()

  // Network/connection related errors
  if (
    errorString.includes("network") ||
    errorString.includes("connection") ||
    errorString.includes("timeout") ||
    errorString.includes("econnrefused") ||
    errorString.includes("fetch")
  ) {
    return new ProviderConnectionError({
      provider: context.provider,
      message: `Connection error: ${baseMessage}`,
      errorCode: "CONNECTION_ERROR",
      cause: error,
    })
  }

  // Authentication related errors (when status code is not available)
  if (errorString.includes("auth") || errorString.includes("unauthorized") || errorString.includes("api key")) {
    return new ProviderAuthenticationError({
      provider: context.provider,
      message: `Authentication error: ${baseMessage}`,
      errorCode: "AUTHENTICATION_ERROR",
      cause: error,
    })
  }

  // Model related errors
  if (errorString.includes("model") && (errorString.includes("not found") || errorString.includes("invalid"))) {
    return new ProviderModelError({
      provider: context.provider,
      modelName,
      message: `Model error: ${baseMessage}`,
      errorCode: "MODEL_ERROR",
      cause: error,
    })
  }

  // Default fallback error
  return new ProviderModelError({
    provider: context.provider,
    modelName,
    message: `Failed to ${context.operation}: ${baseMessage}`,
    errorCode: "UNKNOWN_ERROR",
    cause: error,
  })
}

/**
 * Create a provider-specific error handler function
 * Reduces boilerplate in individual provider implementations
 */
export function createProviderErrorHandler(
  provider: string,
  fallbackModel?: string
) {
  return (
    error: unknown,
    operation: string = "generate embedding",
    modelName?: string,
    request?: EmbeddingRequest,
    config?: ProviderConfig
  ): ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError => {
    return handleProviderError(
      error,
      {
        provider,
        modelName,
        operation,
        fallbackModel,
      },
      request,
      config
    )
  }
}

/**
 * Convenience factory functions for common providers
 */
export const createOllamaErrorHandler = () =>
  createProviderErrorHandler("ollama", "nomic-embed-text")

export const createOpenAIErrorHandler = () =>
  createProviderErrorHandler("openai", "text-embedding-3-small")

export const createCohereErrorHandler = () =>
  createProviderErrorHandler("cohere", "embed-english-v3.0")

export const createGoogleErrorHandler = () =>
  createProviderErrorHandler("google", "embedding-001")

export const createMistralErrorHandler = () =>
  createProviderErrorHandler("mistral", "mistral-embed")

export const createAzureOpenAIErrorHandler = () =>
  createProviderErrorHandler("azure", "text-embedding-ada-002")