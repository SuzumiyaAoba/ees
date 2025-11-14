/**
 * Provider factory for creating embedding providers dynamically
 */

import { Context, Effect, Layer } from "effect"
import { createOllamaProvider, OllamaProviderService } from "./ollama-provider"
import {
  createOpenAICompatibleProvider,
  OpenAICompatibleProviderService,
} from "./openai-compatible-provider"
import type {
  EmbeddingProvider,
  OllamaConfig,
  OpenAICompatibleConfig,
  ProviderConfig,
} from "./types"

/**
 * Multi-provider service that can delegate to different providers
 */
export interface EmbeddingProviderService extends EmbeddingProvider {
  readonly switchProvider: (
    config: ProviderConfig
  ) => Effect.Effect<void, Error>
  readonly getCurrentProvider: () => Effect.Effect<string, never>
  readonly listAllProviders: () => Effect.Effect<string[], never>
}

export const EmbeddingProviderService =
  Context.GenericTag<EmbeddingProviderService>("EmbeddingProviderService")

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  readonly defaultProvider: ProviderConfig
  readonly availableProviders?: ProviderConfig[]
}

/**
 * Create a provider layer based on configuration
 */
export const createProviderLayer = (config: ProviderConfig) => {
  switch (config.type) {
    case "ollama":
      return createOllamaProvider(config as OllamaConfig)
    case "openai-compatible":
      return createOpenAICompatibleProvider(config as OpenAICompatibleConfig)
    default:
      throw new Error(
        `Unsupported provider type: ${config.type}`
      )
  }
}

/**
 * Get the correct service tag based on provider type
 */
const getProviderService = (providerType: string) => {
  switch (providerType) {
    case "ollama":
      return OllamaProviderService
    case "openai-compatible":
      return OpenAICompatibleProviderService
    default:
      throw new Error(`Unsupported provider type: ${providerType}`)
  }
}

/**
 * Create a multi-provider service implementation
 */
const make = (factoryConfig: ProviderFactoryConfig) =>
  Effect.gen(function* () {
    // Keep track of current provider configuration
    let currentConfig = factoryConfig.defaultProvider

    // Create initial provider layer
    let currentProviderLayer = createProviderLayer(currentConfig)

    const getCurrentProviderInstance = () =>
      Effect.gen(function* () {
        const serviceTag = getProviderService(currentConfig.type)
        return yield* serviceTag
      }).pipe(Effect.provide(currentProviderLayer))

    const generateEmbedding = (
      request: Parameters<EmbeddingProvider["generateEmbedding"]>[0]
    ) =>
      Effect.gen(function* () {
        const provider = yield* getCurrentProviderInstance()
        return yield* provider.generateEmbedding(request)
      })

    const listModels = () =>
      Effect.gen(function* () {
        const provider = yield* getCurrentProviderInstance()
        return yield* provider.listModels()
      })

    const isModelAvailable = (modelName: string) =>
      Effect.gen(function* () {
        const provider = yield* getCurrentProviderInstance()
        return yield* provider.isModelAvailable(modelName)
      })

    const getModelInfo = (modelName: string) =>
      Effect.gen(function* () {
        const provider = yield* getCurrentProviderInstance()
        return yield* provider.getModelInfo(modelName)
      })

    const switchProvider = (config: ProviderConfig) =>
      Effect.gen(function* () {
        // Validate the new provider configuration
        try {
          currentConfig = config
          currentProviderLayer = createProviderLayer(config)

          // Test the new provider by trying to list models
          const provider = yield* getCurrentProviderInstance()
          yield* provider.listModels()

          return void 0
        } catch (error) {
          return yield* Effect.fail(
            new Error(`Failed to switch to provider ${config.type}: ${error}`)
          )
        }
      })

    const getCurrentProvider = () => Effect.succeed(currentConfig.type)

    const listAllProviders = () =>
      Effect.succeed(
        factoryConfig.availableProviders?.map((p) => p.type) ?? [
          currentConfig.type,
        ]
      )

    return {
      generateEmbedding,
      listModels,
      isModelAvailable,
      getModelInfo,
      switchProvider,
      getCurrentProvider,
      listAllProviders,
    } as const
  })

/**
 * Create the embedding provider service layer
 */
export const createEmbeddingProviderService = (config: ProviderFactoryConfig) =>
  Layer.effect(EmbeddingProviderService, make(config))

/**
 * Helper functions for common provider configurations
 */
export const createOllamaConfig = (
  options: Partial<Omit<OllamaConfig, "type">> = {}
): OllamaConfig => ({
  type: "ollama",
  baseUrl: options.baseUrl ?? "http://localhost:11434",
  ...options,
})

export const createOpenAICompatibleConfig = (
  baseUrl: string,
  options: Partial<Omit<OpenAICompatibleConfig, "type" | "baseUrl">> = {}
): OpenAICompatibleConfig => ({
  type: "openai-compatible",
  baseUrl,
  ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
  ...(options.customHeaders !== undefined && { customHeaders: options.customHeaders }),
})

export const createOpenAIConfig = (
  // Removed: only Ollama supported
  // Keeping stub to avoid breaking external imports if any
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._args: unknown[]
): never => {
  throw new Error("Only Ollama provider is supported")
}

export const createGoogleConfig = (
  ..._args: unknown[]
): never => {
  throw new Error("Only Ollama provider is supported")
}

export const createAzureConfig = (
  ..._args: unknown[]
): never => {
  throw new Error("Only Ollama provider is supported")
}

export const createCohereConfig = (
  ..._args: unknown[]
): never => {
  throw new Error("Only Ollama provider is supported")
}

export const createMistralConfig = (
  ..._args: unknown[]
): never => {
  throw new Error("Only Ollama provider is supported")
}

/**
 * Create a factory configuration with multiple providers
 */
export const createMultiProviderConfig = (
  defaultProvider: ProviderConfig
): ProviderFactoryConfig => ({
  defaultProvider,
  availableProviders: [defaultProvider],
})
