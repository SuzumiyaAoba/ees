/**
 * Ollama provider implementation using Vercel AI SDK
 */

import { embed } from "ai"
import { Context, Effect, Layer } from "effect"
import { createOllama } from "ollama-ai-provider-v2"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OllamaConfig,
} from "./types"
import { ProviderConnectionError, ProviderModelError } from "./types"

export interface OllamaProviderService extends EmbeddingProvider {}

export const OllamaProviderService = Context.GenericTag<OllamaProviderService>(
  "OllamaProviderService"
)

const make = (config: OllamaConfig) =>
  Effect.gen(function* () {
    const ollama = createOllama({
      baseURL: config.baseUrl ?? "http://localhost:11434/api",
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "nomic-embed-text"

          const result = await embed({
            model: ollama.textEmbeddingModel(modelName),
            value: request.text,
          })

          return {
            embedding: result.embedding,
            model: modelName,
            provider: "ollama",
            dimensions: result.embedding.length,
            tokensUsed: result.usage?.tokens,
          } satisfies EmbeddingResponse
        },
        catch: (error) =>
          new ProviderModelError({
            provider: "ollama",
            modelName:
              request.modelName ?? config.defaultModel ?? "nomic-embed-text",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          }),
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "nomic-embed-text",
          provider: "ollama",
          dimensions: 768,
          maxTokens: 8192,
          pricePerToken: 0, // Ollama is free/local
        },
        {
          name: "mxbai-embed-large",
          provider: "ollama",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0, // Ollama is free/local
        },
        {
          name: "snowflake-arctic-embed",
          provider: "ollama",
          dimensions: 1024,
          maxTokens: 512,
          pricePerToken: 0, // Ollama is free/local
        },
      ] satisfies ModelInfo[])

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        return models.some((model) => model.name.includes(modelName))
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const models = yield* listModels()
        const model = models.find((m) => m.name.includes(modelName))
        return model ?? null
      })

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
    } as const
  })

export const createOllamaProvider = (config: OllamaConfig) =>
  Layer.effect(OllamaProviderService, make(config))
