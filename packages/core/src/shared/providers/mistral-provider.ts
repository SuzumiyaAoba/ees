/**
 * Mistral provider implementation using Vercel AI SDK
 */

import { mistral, type MistralProvider, type MistralProviderSettings } from "@ai-sdk/mistral"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  MistralConfig,
  ModelInfo,
} from "./types"
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./types"

export interface MistralProviderService extends EmbeddingProvider {}

export const MistralProviderService =
  Context.GenericTag<MistralProviderService>("MistralProviderService")

const make = (config: MistralConfig) =>
  Effect.gen(function* () {
    // Use type assertion to work around AI SDK type incompatibility
    // The mistral function signature has changed but functionality remains the same
    const mistralClient = (mistral as unknown as (settings: { apiKey: string; baseURL?: string }) => MistralProvider)({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })
    const client: MistralProvider = mistralClient

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "mistral-embed"

          const result = await embed({
            model: client.textEmbedding(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "mistral",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          // Parse Mistral-specific error types
          if (error && typeof error === "object" && "status" in error) {
            const statusCode = error.status
            const message =
              (error as { message?: string }).message || "Unknown Mistral error"

            switch (statusCode) {
              case 401:
                return new ProviderAuthenticationError({
                  provider: "mistral",
                  message: `Authentication failed: ${message}`,
                  errorCode: "UNAUTHORIZED",
                  cause: error,
                })
              case 429:
                return new ProviderRateLimitError({
                  provider: "mistral",
                  message: `Rate limit exceeded: ${message}`,
                  errorCode: "RATE_LIMITED",
                  cause: error,
                })
              case 404:
                return new ProviderModelError({
                  provider: "mistral",
                  modelName:
                    request.modelName ?? config.defaultModel ?? "mistral-embed",
                  message: `Model not found: ${message}`,
                  errorCode: "MODEL_NOT_FOUND",
                  cause: error,
                })
              default:
                return new ProviderConnectionError({
                  provider: "mistral",
                  message: `Mistral API error: ${message}`,
                  errorCode: statusCode?.toString() ?? "UNKNOWN_ERROR",
                  cause: error,
                })
            }
          }

          return new ProviderModelError({
            provider: "mistral",
            modelName:
              request.modelName ?? config.defaultModel ?? "mistral-embed",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          })
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "mistral-embed",
          provider: "mistral",
          dimensions: 1024,
          maxTokens: 8192,
          pricePerToken: 0.1 / 1000000, // $0.1 per million tokens
        },
      ] satisfies ModelInfo[])

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        return models.some((model) => model.name === modelName)
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const model = models.find((m) => m.name === modelName)
        return model ?? null
      })

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createMistralProvider = (config: MistralConfig) =>
  Layer.effect(MistralProviderService, make(config))
