/**
 * Google AI provider implementation using Vercel AI SDK
 */

import { google, type GoogleGenerativeAIProvider, type GoogleGenerativeAIProviderSettings } from "@ai-sdk/google"
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
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./types"

export interface GoogleProviderService extends EmbeddingProvider {}

export const GoogleProviderService = Context.GenericTag<GoogleProviderService>(
  "GoogleProviderService"
)

const make = (config: GoogleConfig) =>
  Effect.gen(function* () {
    // Use type assertion to work around AI SDK type incompatibility
    // The google function signature has changed but functionality remains the same
    const googleClient = (google as unknown as (settings: { apiKey: string; baseURL?: string }) => GoogleGenerativeAIProvider)({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })
    const client: GoogleGenerativeAIProvider = googleClient

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "embedding-001"

          const result = await embed({
            model: client.textEmbeddingModel(modelName),
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
          // Parse Google AI-specific error types
          if (error && typeof error === "object" && "status" in error) {
            const statusCode = error.status
            const message =
              (error as { message?: string }).message ||
              "Unknown Google AI error"

            switch (statusCode) {
              case 401:
              case 403:
                return new ProviderAuthenticationError({
                  provider: "google",
                  message: `Authentication failed: ${message}`,
                  errorCode: "UNAUTHORIZED",
                  cause: error,
                })
              case 429:
                return new ProviderRateLimitError({
                  provider: "google",
                  message: `Rate limit exceeded: ${message}`,
                  errorCode: "RATE_LIMITED",
                  cause: error,
                })
              case 404:
                return new ProviderModelError({
                  provider: "google",
                  modelName:
                    request.modelName ??
                    config.defaultModel ??
                    "text-embedding-004",
                  message: `Model not found: ${message}`,
                  errorCode: "MODEL_NOT_FOUND",
                  cause: error,
                })
              default:
                return new ProviderConnectionError({
                  provider: "google",
                  message: `Google AI API error: ${message}`,
                  errorCode: statusCode?.toString() ?? "UNKNOWN_ERROR",
                  cause: error,
                })
            }
          }

          return new ProviderModelError({
            provider: "google",
            modelName:
              request.modelName ?? config.defaultModel ?? "embedding-001",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          })
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

export const createGoogleProvider = (config: GoogleConfig) =>
  Layer.effect(GoogleProviderService, make(config))
