/**
 * Google AI provider implementation using Vercel AI SDK
 */

import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  GoogleConfig,
  ModelInfo,
} from "./types"
import {
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "@/shared/errors/database"
import { createGoogleErrorHandler } from "./error-handler"
import { createIsModelAvailable, createGetModelInfo, resolveModelName } from "./provider-utils"

export interface GoogleProviderService extends EmbeddingProvider {}

export const GoogleProviderService = Context.GenericTag<GoogleProviderService>(
  "GoogleProviderService"
)

const make = (config: GoogleConfig) =>
  Effect.gen(function* () {
    const provider: GoogleGenerativeAIProvider = createGoogleGenerativeAI({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
      Effect.tryPromise({
        try: async () => {
          const modelName = resolveModelName(
            request.modelName,
            config.defaultModel,
            "embedding-001"
          )

          const result = await embed({
            model: provider.textEmbedding(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "google",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          const handleError = createGoogleErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "embedding-001",
          provider: "google",
          dimensions: 768,
          maxTokens: 2048,
          pricePerToken: 0.00001 / 1000, // $0.01 per 1M tokens (estimated)
        },
        {
          name: "text-embedding-004",
          provider: "google",
          dimensions: 768,
          maxTokens: 2048,
          pricePerToken: 0.00001 / 1000, // $0.01 per 1M tokens (estimated)
        },
      ] satisfies ModelInfo[])

    // Use shared utilities for standard model operations
    const isModelAvailable = createIsModelAvailable(listModels)
    const getModelInfo = createGetModelInfo(listModels)

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createGoogleProvider = (config: GoogleConfig) =>
  Layer.effect(GoogleProviderService, make(config))
