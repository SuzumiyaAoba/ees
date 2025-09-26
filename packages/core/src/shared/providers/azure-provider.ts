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
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "./types"
import { createAzureOpenAIErrorHandler } from "./error-handler"

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

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
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
          const handleError = createAzureOpenAIErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
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
