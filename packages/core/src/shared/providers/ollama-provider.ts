/**
 * Ollama provider implementation using direct API calls
 */

import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OllamaConfig,
} from "./types"
import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/errors/database"
import { createOllamaErrorHandler } from "./error-handler"
import {
  createIsModelAvailable,
  createGetModelInfo,
  normalizeModelName,
} from "./provider-utils"

/**
 * Allowed Ollama models for embedding operations
 * Only models in this list will be available for use
 */
const ALLOWED_OLLAMA_MODELS = [
  "nomic-embed-text",
  "embeddinggemma",
] as const

export interface OllamaProviderService extends EmbeddingProvider {}

export const OllamaProviderService = Context.GenericTag<OllamaProviderService>(
  "OllamaProviderService"
)

// Ollama /api/embed response format:
// { embeddings: number[][], model: string, total_duration: number, ... }

const make = (config: OllamaConfig) =>
  Effect.gen(function* () {
    const baseUrl = config.baseUrl ?? "http://localhost:11434"

    // Timeout for embedding requests in milliseconds
    // Default: 10 minutes (600000ms)
    // Can be configured via EES_OLLAMA_TIMEOUT environment variable
    const envTimeout = Number(process.env["EES_OLLAMA_TIMEOUT"])
    const timeoutMs = !Number.isNaN(envTimeout) && envTimeout > 0 ? envTimeout : 600000

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
      Effect.tryPromise({
        try: async () => {
          // Model name must be explicitly provided in request
          if (!request.modelName) {
            throw new Error("Model name is required for embedding generation")
          }
          const modelName = request.modelName

          // Use the standard Ollama embedding API endpoint
          const response = await fetch(`${baseUrl}/api/embed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName,
              input: request.text
            }),
            signal: AbortSignal.timeout(timeoutMs),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const raw = await response.json() as any

          // Ollama /api/embed returns: { embeddings: [[...]], model: "..." }
          // Extract the first embedding from the array
          const embedding: number[] | undefined =
            Array.isArray(raw?.embeddings) && Array.isArray(raw.embeddings[0])
              ? (raw.embeddings[0] as number[])
              : undefined

          if (!embedding || embedding.length === 0) {
            throw new Error("Invalid embedding response from Ollama API")
          }

          return {
            embedding,
            model: modelName,
            provider: "ollama",
            dimensions: embedding.length,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          const handleError = createOllamaErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request)
        },
      })

    const listModels = () =>
      Effect.tryPromise({
        try: async () => {
          const response = await fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const result = await response.json() as { models?: Array<{ name: string, size?: number, modified_at?: string, digest?: string }> }

          if (!result.models || !Array.isArray(result.models)) {
            // Fallback to static model if API fails
            return [
              {
                name: "nomic-embed-text",
                provider: "ollama" as const,
                dimensions: 768,
                maxTokens: 8192,
                pricePerToken: 0, // Ollama is free/local
              },
            ] satisfies ModelInfo[]
          }

          // Map Ollama API response to ModelInfo format with normalized names
          // Filter to only include allowed models
          return result.models
            .map(model => ({
              name: normalizeModelName(model.name),
              fullName: model.name, // Preserve original name with version tags
              provider: "ollama" as const,
              dimensions: 768, // Default embedding dimension for most models
              maxTokens: 8192, // Default token limit
              pricePerToken: 0, // Ollama is free/local
            }))
            .filter(model => ALLOWED_OLLAMA_MODELS.includes(model.name as typeof ALLOWED_OLLAMA_MODELS[number])) satisfies ModelInfo[]
        },
        catch: (error) => {
          const handleError = createOllamaErrorHandler()
          const handledError = handleError(error, "list models", undefined, undefined)
          // Map any error to ProviderConnectionError for listModels interface compliance
          if (handledError._tag === "ProviderModelError" || handledError._tag === "ProviderRateLimitError") {
            return new ProviderConnectionError({
              provider: handledError.provider || "ollama",
              message: handledError.message,
              cause: handledError.cause,
            })
          }
          return handledError
        },
      })

    // Use shared utilities with model name normalization for Ollama
    const isModelAvailable = createIsModelAvailable(listModels, normalizeModelName)
    const getModelInfo = createGetModelInfo(listModels, normalizeModelName)

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createOllamaProvider = (config: OllamaConfig) =>
  Layer.effect(OllamaProviderService, make(config))
