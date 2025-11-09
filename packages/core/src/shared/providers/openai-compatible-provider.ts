/**
 * OpenAPI-compatible provider implementation
 * Supports any OpenAI-compatible API endpoint (e.g., LM Studio, LocalAI, custom servers)
 */

import { Context, Effect, Layer } from "effect"
import { embed } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OpenAICompatibleConfig,
} from "./types"
import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/errors/database"
import { normalizeModelName } from "./provider-utils"

export interface OpenAICompatibleProviderService extends EmbeddingProvider {}

export const OpenAICompatibleProviderService = Context.GenericTag<OpenAICompatibleProviderService>(
  "OpenAICompatibleProviderService"
)

const make = (config: OpenAICompatibleConfig) =>
  Effect.gen(function* () {
    const baseUrl = config.baseUrl
    const apiKey = config.apiKey ?? "not-needed" // Some local servers don't require API keys

    // Create OpenAI client with custom base URL
    const openai = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
      ...(config.customHeaders && { headers: config.customHeaders }),
    })

    // Timeout for embedding requests in milliseconds (10 minutes)
    const EMBEDDING_TIMEOUT_MS = 600000

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.gen(function* () {
        const modelName = request.modelName ?? config.defaultModel
        if (!modelName) {
          return yield* Effect.fail(
            new ProviderModelError({
              provider: "openai-compatible",
              modelName: "unknown",
              message: "No model specified and no default model configured",
            })
          )
        }

        try {
          const result = yield* Effect.tryPromise({
            try: async () => {
              const response = await Promise.race([
                embed({
                  model: openai.embedding(modelName),
                  value: request.text,
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Embedding request timed out")),
                    EMBEDDING_TIMEOUT_MS
                  )
                ),
              ])
              return response
            },
            catch: (error) => {
              const errorMessage = error instanceof Error ? error.message : String(error)

              // Connection errors
              if (
                errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("ENOTFOUND") ||
                errorMessage.includes("ETIMEDOUT") ||
                errorMessage.includes("fetch failed")
              ) {
                return new ProviderConnectionError({
                  provider: "openai-compatible",
                  message: `Failed to connect to OpenAI-compatible API at ${baseUrl}: ${errorMessage}`,
                })
              }

              // Authentication errors
              if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
                return new ProviderAuthenticationError({
                  provider: "openai-compatible",
                  message: `Authentication failed: ${errorMessage}`,
                })
              }

              // Rate limit errors
              if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
                return new ProviderRateLimitError({
                  provider: "openai-compatible",
                  message: `Rate limit exceeded: ${errorMessage}`,
                })
              }

              // Model errors
              if (
                errorMessage.includes("model") ||
                errorMessage.includes("404") ||
                errorMessage.includes("not found")
              ) {
                return new ProviderModelError({
                  provider: "openai-compatible",
                  modelName: modelName,
                  message: `Model not found or invalid: ${errorMessage}`,
                })
              }

              // Generic connection error for other cases
              return new ProviderConnectionError({
                provider: "openai-compatible",
                message: `OpenAI-compatible API error: ${errorMessage}`,
              })
            },
          })

          const embedding: EmbeddingResponse = {
            embedding: result.embedding,
            model: modelName,
            provider: "openai-compatible",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          }

          return embedding
        } catch (error) {
          return yield* Effect.fail(
            error instanceof ProviderConnectionError ||
            error instanceof ProviderModelError ||
            error instanceof ProviderAuthenticationError ||
            error instanceof ProviderRateLimitError
              ? error
              : new ProviderConnectionError({
                  provider: "openai-compatible",
                  message: `Unexpected error: ${error}`,
                })
          )
        }
      })

    const listModels = () =>
      Effect.gen(function* () {
        try {
          // Try to fetch models from /v1/models endpoint (OpenAI-compatible standard)
          const result = yield* Effect.tryPromise({
            try: async () => {
              const response = await fetch(`${baseUrl}/v1/models`, {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  ...config.customHeaders,
                },
              })

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
              }

              const data = (await response.json()) as { data?: Array<{ id: string }> }
              return data.data?.map((model: { id: string }) => model.id) ?? []
            },
            catch: (error) => {
              const errorMessage = error instanceof Error ? error.message : String(error)

              if (
                errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("ENOTFOUND") ||
                errorMessage.includes("fetch failed")
              ) {
                return new ProviderConnectionError({
                  provider: "openai-compatible",
                  message: `Failed to connect to ${baseUrl}: ${errorMessage}`,
                })
              }

              if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
                return new ProviderAuthenticationError({
                  provider: "openai-compatible",
                  message: `Authentication failed: ${errorMessage}`,
                })
              }

              return new ProviderConnectionError({
                provider: "openai-compatible",
                message: `Failed to list models: ${errorMessage}`,
              })
            },
          })

          const models: ModelInfo[] = result.map((modelId: string) => ({
            name: normalizeModelName(modelId),
            fullName: modelId,
            provider: "openai-compatible",
          }))

          return models
        } catch (error) {
          return yield* Effect.fail(
            error instanceof ProviderConnectionError ||
            error instanceof ProviderAuthenticationError
              ? error
              : new ProviderConnectionError({
                  provider: "openai-compatible",
                  message: `Unexpected error: ${error}`,
                })
          )
        }
      })

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const normalized = normalizeModelName(modelName)
        return models.some((m) => m.name === normalized)
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const normalized = normalizeModelName(modelName)
        const model = models.find((m) => m.name === normalized)

        if (!model) {
          return yield* Effect.fail(
            new ProviderModelError({
              provider: "openai-compatible",
              modelName: modelName,
              message: `Model ${modelName} not found`,
            })
          )
        }

        return model
      })

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createOpenAICompatibleProvider = (config: OpenAICompatibleConfig) =>
  Layer.effect(OpenAICompatibleProviderService, make(config))
