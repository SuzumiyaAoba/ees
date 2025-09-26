/**
 * OpenAI provider implementation using Vercel AI SDK
 */

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OpenAIConfig,
} from "./types"
import { createOpenAIErrorHandler } from "./error-handler"

export interface OpenAIProviderService extends EmbeddingProvider {}

export const OpenAIProviderService = Context.GenericTag<OpenAIProviderService>(
  "OpenAIProviderService"
)

const make = (config: OpenAIConfig) =>
  Effect.gen(function* () {
    const provider: OpenAIProvider = createOpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
      ...(config.organization && { organization: config.organization }),
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "text-embedding-3-small"

          const result = await embed({
            model: provider.textEmbeddingModel(modelName),
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
          const handleError = createOpenAIErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
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
