/**
 * Azure OpenAI provider implementation using Vercel AI SDK
 */

import { createAzure } from "@ai-sdk/azure"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  AzureConfig,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
} from "./types"
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./types"

export interface AzureProviderService extends EmbeddingProvider {}

export const AzureProviderService = Context.GenericTag<AzureProviderService>(
  "AzureProviderService"
)

const make = (config: AzureConfig) =>
  Effect.gen(function* () {
    const client = createAzure({
      apiKey: config.apiKey,
      resourceName: extractResourceName(config.baseUrl),
      apiVersion: config.apiVersion ?? "2024-02-01",
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "text-embedding-ada-002"

          const result = await embed({
            model: client.textEmbedding(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "azure",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          // Parse Azure-specific error types
          if (error && typeof error === "object" && "status" in error) {
            const statusCode = error.status
            const message =
              (error as { message?: string }).message || "Unknown Azure error"

            switch (statusCode) {
              case 401:
                return new ProviderAuthenticationError({
                  provider: "azure",
                  message: `Authentication failed: ${message}`,
                  errorCode: "UNAUTHORIZED",
                  cause: error,
                })
              case 429:
                return new ProviderRateLimitError({
                  provider: "azure",
                  message: `Rate limit exceeded: ${message}`,
                  errorCode: "RATE_LIMITED",
                  cause: error,
                })
              case 404:
                return new ProviderModelError({
                  provider: "azure",
                  modelName:
                    request.modelName ??
                    config.defaultModel ??
                    "text-embedding-ada-002",
                  message: `Model not found: ${message}`,
                  errorCode: "MODEL_NOT_FOUND",
                  cause: error,
                })
              default:
                return new ProviderConnectionError({
                  provider: "azure",
                  message: `Azure API error: ${message}`,
                  errorCode: statusCode?.toString() ?? "UNKNOWN_ERROR",
                  cause: error,
                })
            }
          }

          return new ProviderModelError({
            provider: "azure",
            modelName:
              request.modelName ??
              config.defaultModel ??
              "text-embedding-ada-002",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          })
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "text-embedding-ada-002",
          provider: "azure",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.0001 / 1000, // $0.0001 per 1k tokens
        },
        {
          name: "text-embedding-3-small",
          provider: "azure",
          dimensions: 1536,
          maxTokens: 8191,
          pricePerToken: 0.00002 / 1000, // $0.00002 per 1k tokens
        },
        {
          name: "text-embedding-3-large",
          provider: "azure",
          dimensions: 3072,
          maxTokens: 8191,
          pricePerToken: 0.00013 / 1000, // $0.00013 per 1k tokens
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

function extractResourceName(baseUrl: string): string {
  try {
    const url = new globalThis.URL(baseUrl)
    const hostname = url.hostname
    // Extract resource name from Azure OpenAI endpoint format: https://{resource-name}.openai.azure.com
    const parts = hostname.split(".")
    if (parts.length >= 3 && parts[1] === "openai" && parts[2] === "azure" && parts[0]) {
      return parts[0]
    }
    throw new Error("Invalid Azure OpenAI endpoint format")
  } catch {
    throw new Error(`Invalid Azure OpenAI base URL: ${baseUrl}`)
  }
}

export const createAzureProvider = (config: AzureConfig) =>
  Layer.effect(AzureProviderService, make(config))
