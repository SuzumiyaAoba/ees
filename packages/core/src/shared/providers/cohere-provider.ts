/**
 * Cohere provider implementation using Vercel AI SDK
 */

import { createCohere, type CohereProvider } from "@ai-sdk/cohere"
import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import type {
  CohereConfig,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
} from "./types"
import { createCohereErrorHandler } from "./error-handler"

export interface CohereProviderService extends EmbeddingProvider {}

export const CohereProviderService = Context.GenericTag<CohereProviderService>(
  "CohereProviderService"
)

const make = (config: CohereConfig) =>
  Effect.gen(function* () {
    const provider: CohereProvider = createCohere({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "embed-english-v3.0"

          const result = await embed({
            model: provider.textEmbeddingModel(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "cohere",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          const handleError = createCohereErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "embed-english-v3.0",
          provider: "cohere",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000, // $0.1 per million tokens
        },
        {
          name: "embed-multilingual-v3.0",
          provider: "cohere",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000, // $0.1 per million tokens
        },
        {
          name: "embed-english-light-v3.0",
          provider: "cohere",
          dimensions: 384,
          maxTokens: 512,
          pricePerToken: 0.1 / 1000000, // $0.1 per million tokens
        },
        {
          name: "embed-multilingual-light-v3.0",
          provider: "cohere",
          dimensions: 384,
          maxTokens: 512,
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

export const createCohereProvider = (config: CohereConfig) =>
  Layer.effect(CohereProviderService, make(config))
