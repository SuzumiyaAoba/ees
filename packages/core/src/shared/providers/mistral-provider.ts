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
import { createMistralErrorHandler } from "./error-handler"

export interface MistralProviderService extends EmbeddingProvider {}

export const MistralProviderService =
  Context.GenericTag<MistralProviderService>("MistralProviderService")

const make = (config: MistralConfig) =>
  Effect.gen(function* () {
    const provider: MistralProvider = createMistral({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "mistral-embed"

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
