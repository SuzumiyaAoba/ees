/**
 * Ollama provider implementation for embedding generation
 */

import { Context, Effect, Layer } from "effect"
import { Ollama } from "ollama"
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
    const ollama = new Ollama({
      host: config.baseUrl ?? "http://localhost:11434",
    })

    const generateEmbedding = (request: EmbeddingRequest) =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "embeddinggemma:300m"

          const response = await ollama.embeddings({
            model: modelName,
            prompt: request.text,
          })

          return {
            embedding: response.embedding,
            model: modelName,
            provider: "ollama",
            dimensions: response.embedding.length,
          } satisfies EmbeddingResponse
        },
        catch: (error) =>
          new ProviderModelError({
            provider: "ollama",
            modelName:
              request.modelName ?? config.defaultModel ?? "embeddinggemma:300m",
            message: `Failed to generate embedding: ${error}`,
            cause: error,
          }),
      })

    const listModels = () =>
      Effect.tryPromise({
        try: async () => {
          const response = await ollama.list()
          return response.models
            .filter(
              (model) =>
                model.name.includes("embedding") || model.name.includes("embed")
            )
            .map(
              (model): ModelInfo => ({
                name: model.name,
                provider: "ollama",
                // Ollama doesn't provide this info directly, so we omit optional fields
                pricePerToken: 0, // Ollama is free/local
              })
            )
        },
        catch: (error) =>
          new ProviderConnectionError({
            provider: "ollama",
            message: `Failed to list models: ${error}`,
            cause: error,
          }),
      })

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
