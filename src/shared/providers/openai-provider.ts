/**
 * OpenAI provider implementation using Vercel AI SDK
 */

import { openai } from "@ai-sdk/openai"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OpenAIConfig,
} from "./types"
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./types"

export interface OpenAIProviderService extends EmbeddingProvider {}

export const OpenAIProviderService = Context.GenericTag<OpenAIProviderService>(
  "OpenAIProviderService"
)

const make = (config: OpenAIConfig) =>
  Effect.gen(function* () {
    const client = openai({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "text-embedding-3-small"

          const result = await embed({
            model: client.textEmbeddingModel(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "openai",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          // Parse OpenAI-specific error types
          if (error && typeof error === "object" && "status" in error) {
            const statusCode = error.status
            const message =
              (error as { message?: string }).message || "Unknown OpenAI error"

            switch (statusCode) {
              case 401:
                return new ProviderAuthenticationError({
                  provider: "openai",
                  message: `Authentication failed: ${message}`,
                  errorCode: "UNAUTHORIZED",
                  cause: error,
                })
              case 429:
                return new ProviderRateLimitError({
                  provider: "openai",
                  message: `Rate limit exceeded: ${message}`,
                  errorCode: "RATE_LIMITED",
                  cause: error,
                })
              case 404:
                return new ProviderModelError({
                  provider: "openai",
                  modelName:
                    request.modelName ??
                    config.defaultModel ??
                    "text-embedding-3-small",
                  message: `Model not found: ${message}`,
                  errorCode: "MODEL_NOT_FOUND",
                  cause: error,
                })
              default:
                return new ProviderConnectionError({
                  provider: "openai",
                  message: `OpenAI API error: ${message}`,
                  errorCode: statusCode ? statusCode.toString() : undefined,
                  cause: error,
                })
            }
          }

          return new ProviderModelError({
            provider: "openai",
            modelName:
              request.modelName ??
              config.defaultModel ??
              "text-embedding-3-small",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          })
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "text-embedding-3-small",
          provider: "openai",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.00002 / 1000, // $0.02 per 1M tokens
        },
        {
          name: "text-embedding-3-large",
          provider: "openai",
          dimensions: 3072,
          maxTokens: 8191,
          pricePerToken: 0.00013 / 1000, // $0.13 per 1M tokens
        },
        {
          name: "text-embedding-ada-002",
          provider: "openai",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.0001 / 1000, // $0.10 per 1M tokens
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

export const createOpenAIProvider = (config: OpenAIConfig) =>
  Layer.effect(OpenAIProviderService, make(config))
