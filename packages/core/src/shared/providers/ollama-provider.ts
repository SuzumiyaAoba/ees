/**
 * Ollama provider implementation using direct API calls
 */

import { Context, Effect, Layer } from "effect"
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  OllamaConfig,
  ProviderConnectionError,
  ProviderModelError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from "./types"
import { createOllamaErrorHandler } from "./error-handler"

export interface OllamaProviderService extends EmbeddingProvider {}

export const OllamaProviderService = Context.GenericTag<OllamaProviderService>(
  "OllamaProviderService"
)

interface OllamaEmbedResponse {
  embeddings: number[][]
  model: string
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
}


const make = (config: OllamaConfig) =>
  Effect.gen(function* () {
    const baseUrl = config.baseUrl ?? "http://localhost:11434"

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "embeddinggemma"

          const response = await fetch(`${baseUrl}/api/embed`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              input: [request.text],
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const result = await response.json() as OllamaEmbedResponse

          if (!result.embeddings || !Array.isArray(result.embeddings) || result.embeddings.length === 0) {
            throw new Error("Invalid response format from Ollama API")
          }

          const embedding = result.embeddings[0] as number[]

          return {
            embedding,
            model: modelName,
            provider: "ollama",
            dimensions: embedding.length,
            // Ollama doesn't provide token usage in embed API, so omit the property
          } satisfies EmbeddingResponse
        },
        catch: (error) => {
          const handleError = createOllamaErrorHandler()
          return handleError(error, "generate embedding", request.modelName, request, config)
        },
      })

    const listModels = () =>
      Effect.succeed([
        {
          name: "embeddinggemma",
          provider: "ollama" as const,
          dimensions: 768,
          maxTokens: 8192,
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
