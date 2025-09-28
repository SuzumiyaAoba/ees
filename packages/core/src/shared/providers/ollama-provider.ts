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

interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details?: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
}

interface OllamaListResponse {
  models: OllamaModel[]
}

/**
 * Helper function to get model dimensions based on model name
 */
const getModelDimensions = (modelName: string): number => {
  const name = modelName.toLowerCase()
  if (name.includes("nomic-embed-text")) return 768
  if (name.includes("mxbai-embed-large")) return 1024
  if (name.includes("snowflake-arctic-embed")) return 1024
  if (name.includes("sentence-transformers")) return 384
  if (name.includes("all-MiniLM")) return 384
  if (name.includes("all-mpnet")) return 768
  // Default for unknown embedding models
  return 768
}

/**
 * Helper function to get model max tokens based on model name
 */
const getModelMaxTokens = (modelName: string): number => {
  const name = modelName.toLowerCase()
  if (name.includes("nomic-embed-text")) return 8192
  if (name.includes("mxbai-embed-large")) return 512
  if (name.includes("snowflake-arctic-embed")) return 512
  if (name.includes("sentence-transformers")) return 512
  // Default for unknown embedding models
  return 512
}

const make = (config: OllamaConfig) =>
  Effect.gen(function* () {
    const baseUrl = config.baseUrl ?? "http://localhost:11434"

    const generateEmbedding = (request: EmbeddingRequest): Effect.Effect<EmbeddingResponse, ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError> =>
      Effect.tryPromise({
        try: async () => {
          const modelName =
            request.modelName ?? config.defaultModel ?? "nomic-embed-text"

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
      Effect.tryPromise({
        try: async () => {
          const response = await fetch(`${baseUrl}/api/tags`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const result = await response.json() as OllamaListResponse

          // Filter and map Ollama models to our ModelInfo format
          // Focus on embedding models (models that contain "embed" in name)
          const embeddingModels: ModelInfo[] = result.models
            .filter(model =>
              model.name.toLowerCase().includes("embed") ||
              model.name.toLowerCase().includes("nomic") ||
              model.name.toLowerCase().includes("sentence") ||
              model.name.toLowerCase().includes("arctic")
            )
            .map(model => ({
              name: model.name,
              provider: "ollama" as const,
              dimensions: getModelDimensions(model.name),
              maxTokens: getModelMaxTokens(model.name),
              pricePerToken: 0, // Ollama is free/local
            } satisfies ModelInfo))

          // Include default models even if not installed
          const defaultModels: ModelInfo[] = [
            {
              name: "nomic-embed-text",
              provider: "ollama" as const,
              dimensions: 768,
              maxTokens: 8192,
              pricePerToken: 0,
            },
            {
              name: "mxbai-embed-large",
              provider: "ollama" as const,
              dimensions: 1024,
              maxTokens: 512,
              pricePerToken: 0,
            },
            {
              name: "snowflake-arctic-embed",
              provider: "ollama" as const,
              dimensions: 1024,
              maxTokens: 512,
              pricePerToken: 0,
            },
          ]

          // Combine fetched models with defaults, avoiding duplicates
          const allModels = [...embeddingModels]

          for (const defaultModel of defaultModels) {
            if (!allModels.some(model => model.name === defaultModel.name)) {
              allModels.push(defaultModel)
            }
          }

          return allModels
        },
        catch: (error) => {
          const handleError = createOllamaErrorHandler()
          return handleError(error, "list models", undefined, { text: "" }, config)
        },
      }).pipe(
        // Fallback to default models if API fails
        Effect.catchAll(() =>
          Effect.succeed([
            {
              name: "nomic-embed-text",
              provider: "ollama" as const,
              dimensions: 768,
              maxTokens: 8192,
              pricePerToken: 0,
            },
            {
              name: "mxbai-embed-large",
              provider: "ollama" as const,
              dimensions: 1024,
              maxTokens: 512,
              pricePerToken: 0,
            },
            {
              name: "snowflake-arctic-embed",
              provider: "ollama" as const,
              dimensions: 1024,
              maxTokens: 512,
              pricePerToken: 0,
            },
          ] satisfies ModelInfo[])
        )
      )

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
