/**
 * Mistral provider implementation using Vercel AI SDK
 */

import { createMistral, type MistralProvider } from "@ai-sdk/mistral"
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
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/errors/database"
import { createMistralErrorHandler } from "./error-handler"
import { createIsModelAvailable, createGetModelInfo, resolveModelName } from "./provider-utils"

export interface MistralProviderService extends EmbeddingProvider {}

export const MistralProviderService =
  Context.GenericTag<MistralProviderService>("MistralProviderService")

const make = (config: MistralConfig) =>
  Effect.gen(function* () {
    const provider: MistralProvider = createMistral({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
      Effect.tryPromise({
        try: async () => {
          const modelName = resolveModelName(request.modelName, config.defaultModel, "mistral-embed")

          const result = await embed({
            model: provider.textEmbedding(modelName),
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
          const handleError = createMistralErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
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

    const isModelAvailable = createIsModelAvailable(listModels)

    const getModelInfo = createGetModelInfo(listModels)

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createMistralProvider = (config: MistralConfig) =>
  Layer.effect(MistralProviderService, make(config))
