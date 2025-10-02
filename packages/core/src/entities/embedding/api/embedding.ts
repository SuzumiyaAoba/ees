/**
 * Multi-provider embedding service
 * Supports multiple providers (Ollama, OpenAI, Google AI) via Vercel AI SDK
 */

import { Context, Effect, Layer, Option } from "effect"
import { getDefaultProvider } from "@/shared/config/providers"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  EmbeddingProviderService,
  type EmbeddingRequest,
  ProviderConnectionError,
  ProviderAuthenticationError,
  ProviderModelError,
  ProviderRateLimitError,
} from "@/shared/providers"
import { createEmbeddingProviderService } from "@/shared/providers/factory"
import { MetricsServiceTag } from "@/shared/observability/metrics"
import {
  EmbeddingRepository,
  EmbeddingRepositoryLive,
} from "@/entities/embedding/repository/embedding-repository"
import {
  CacheService,
  embeddingCacheKey,
  CacheTTL,
  getCacheConfig,
} from "@/shared/cache"
import type {
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
} from "@/entities/embedding/model/embedding"

/**
 * Multi-provider embedding service interface
 * Provides operations for creating, searching, and managing embeddings
 */
export interface EmbeddingService {
  /**
   * Create an embedding for the given text using the configured provider
   * @param uri - Unique identifier for the text content
   * @param text - Text content to generate embedding for
   * @param modelName - Optional model name to use (defaults to provider's default)
   * @returns Effect containing the embedding creation result
   */
  readonly createEmbedding: (
    uri: string,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    CreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

  /**
   * Create multiple embeddings in a single batch operation
   * @param request - Batch request containing multiple texts to embed
   * @returns Effect containing batch processing results with success/failure counts
   */
  readonly createBatchEmbedding: (
    request: BatchCreateEmbeddingRequest
  ) => Effect.Effect<
    BatchCreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

  /**
   * Retrieve a specific embedding by its URI and model name
   * @param uri - Unique identifier for the embedding
   * @param modelName - Model name used to generate the embedding
   * @returns Effect containing the embedding data or null if not found
   */
  readonly getEmbedding: (
    uri: string,
    modelName: string
  ) => Effect.Effect<Embedding | null, DatabaseQueryError>

  /**
   * List all embeddings with optional filtering and pagination
   * @param filters - Optional filters for URI, model name, and pagination
   * @returns Effect containing paginated list of embeddings
   */
  readonly getAllEmbeddings: (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) => Effect.Effect<EmbeddingsListResponse, DatabaseQueryError>

  /**
   * Delete an embedding by its ID
   * @param id - Database ID of the embedding to delete
   * @returns Effect containing boolean indicating success
   */
  readonly deleteEmbedding: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Search for similar embeddings using vector similarity
   * @param request - Search request with query text and similarity parameters
   * @returns Effect containing search results ranked by similarity
   */
  readonly searchEmbeddings: (
    request: SearchEmbeddingRequest
  ) => Effect.Effect<
    SearchEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

  /**
   * List all available embedding providers
   * @returns Effect containing array of provider names
   */
  readonly listProviders: () => Effect.Effect<string[], never>

  /**
   * Get the currently configured provider
   * @returns Effect containing the current provider name
   */
  readonly getCurrentProvider: () => Effect.Effect<string, never>

  /**
   * Get available models for a provider
   * @param providerType - Optional provider name (defaults to current provider)
   * @returns Effect containing array of available models
   */
  readonly getProviderModels: (
    providerType?: string
  ) => Effect.Effect<
    Array<{ name: string; provider: string; dimensions?: number | undefined }>,
    ProviderConnectionError | ProviderAuthenticationError
  >

  /**
   * Create an embedding using a specific provider
   * @param providerType - Name of the provider to use
   * @param uri - Unique identifier for the text content
   * @param text - Text content to generate embedding for
   * @param modelName - Optional model name to use
   * @returns Effect containing the embedding creation result
   */
  readonly createEmbeddingWithProvider: (
    providerType: string,
    uri: string,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    CreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >
}

export const EmbeddingService =
  Context.GenericTag<EmbeddingService>("EmbeddingService")

/**
 * Input validation for embedding operations
 */
const validateEmbeddingInput = (uri: string, text: string): Effect.Effect<void, DatabaseQueryError> => {
  if (!uri.trim()) {
    return Effect.fail(new DatabaseQueryError({
      message: "URI cannot be empty",
      cause: new Error("Invalid URI parameter"),
    }))
  }

  if (!text.trim()) {
    return Effect.fail(new DatabaseQueryError({
      message: "Text content cannot be empty",
      cause: new Error("Invalid text parameter"),
    }))
  }

  if (uri.length > 2048) { // Reasonable URI length limit
    return Effect.fail(new DatabaseQueryError({
      message: "URI exceeds maximum length of 2048 characters",
      cause: new Error("URI too long"),
    }))
  }

  return Effect.void
}

// Note: _calculateSimilarity function was removed as it's unused
// Individual similarity functions are kept for potential future use

const make = Effect.gen(function* () {
  const repository = yield* EmbeddingRepository
  const providerService = yield* EmbeddingProviderService
  const metricsService = yield* MetricsServiceTag
  const cacheService = yield* CacheService
  const cacheConfig = getCacheConfig()

  /**
   * Helper function to create a single embedding with input validation
   * Eliminates code duplication between regular and batch operations
   */
  const createSingleEmbedding = (
    uri: string,
    text: string,
    modelName?: string
  ): Effect.Effect<
    { id: number; uri: string; model_name: string },
    ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError | DatabaseQueryError
  > =>
    Effect.gen(function* () {
      const startTime = Date.now()
      const provider = getDefaultProvider()

      try {
        // Validate input parameters
        yield* validateEmbeddingInput(uri, text)

        // Generate embedding using the current provider
        const embeddingRequest: EmbeddingRequest = {
          text,
          modelName,
        }
        const embeddingResponse =
          yield* providerService.generateEmbedding(embeddingRequest)

        // Save embedding to database using repository
        const saveResult = yield* repository.save(
          uri,
          text,
          embeddingResponse.model,
          embeddingResponse.embedding
        )

        // Record successful embedding creation metrics
        const duration = (Date.now() - startTime) / 1000
        yield* metricsService.recordEmbeddingCreated(provider.type, embeddingResponse.model, duration)

        // Invalidate cache for this embedding (ignore cache errors)
        if (cacheConfig.enabled) {
          const cacheKey = embeddingCacheKey(embeddingResponse.model, uri)
          yield* cacheService.delete(cacheKey).pipe(
            Effect.catchAll(() => Effect.void)
          )
        }

        return {
          id: saveResult.id,
          uri,
          model_name: embeddingResponse.model,
        }
      } catch (error) {
        // Record embedding error metrics
        const errorType = error instanceof ProviderConnectionError ? "connection_error" :
                         error instanceof ProviderModelError ? "model_error" :
                         error instanceof ProviderAuthenticationError ? "auth_error" :
                         error instanceof ProviderRateLimitError ? "rate_limit" :
                         error instanceof DatabaseQueryError ? "database_error" : "unknown_error"

        yield* metricsService.recordEmbeddingError(provider.type, modelName ?? "unknown", errorType)
        throw error
      }
    })

  const createEmbedding = (uri: string, text: string, modelName?: string) =>
    Effect.gen(function* () {
      const result = yield* createSingleEmbedding(uri, text, modelName)

      return {
        ...result,
        message: "Embedding created successfully",
      }
    })

  const createBatchEmbedding = (request: BatchCreateEmbeddingRequest) =>
    Effect.gen(function* () {
      const { texts, model_name } = request
      const results: BatchCreateEmbeddingResponse["results"] = []
      let successful = 0
      let failed = 0

      // Process each text individually using the shared helper
      for (const { uri, text } of texts) {
        // Try to create embedding using the helper, catch all errors at this level
        const result = yield* createSingleEmbedding(uri, text, model_name).pipe(
          Effect.map((embeddingResult) => ({
            ...embeddingResult,
            status: "success" as const,
          })),
          Effect.catchAll((error) =>
            Effect.succeed({
              id: 0,
              uri,
              model_name: model_name ?? "unknown",
              status: "error" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          )
        )

        results.push(result)

        if (result.status === "success") {
          successful++
        } else {
          failed++
        }
      }

      return {
        results,
        total: texts.length,
        successful,
        failed,
      }
    })

  const getEmbedding = (uri: string, modelName: string) =>
    Effect.gen(function* () {
      // Check cache first if enabled
      if (cacheConfig.enabled) {
        const cacheKey = embeddingCacheKey(modelName, uri)
        // Catch cache errors and treat as cache miss
        const cached = yield* cacheService.get<Embedding>(cacheKey).pipe(
          Effect.catchAll(() => Effect.succeed(Option.none()))
        )

        if (Option.isSome(cached)) {
          yield* metricsService.recordCacheHit("embedding")
          return cached.value
        }

        yield* metricsService.recordCacheMiss("embedding")
      }

      // Cache miss or disabled - fetch from repository
      const embeddingResult = yield* repository.findByUri(uri, modelName)

      if (!embeddingResult) {
        return null
      }

      // Store in cache if enabled (ignore cache errors)
      if (cacheConfig.enabled) {
        const cacheKey = embeddingCacheKey(modelName, uri)
        yield* cacheService.set(cacheKey, embeddingResult, CacheTTL.EMBEDDING).pipe(
          Effect.catchAll(() => Effect.void)
        )
      }

      return embeddingResult
    })

  const getAllEmbeddings = (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) => repository.findAll(filters)

  const deleteEmbedding = (id: number) => repository.deleteById(id)

  const searchEmbeddings = (request: SearchEmbeddingRequest) =>
    Effect.gen(function* () {
      const startTime = Date.now()
      const {
        query,
        model_name,
        limit = 10,
        threshold,
        metric = "cosine",
      } = request

      // Generate embedding for the query text using the current provider
      const embeddingRequest: EmbeddingRequest = {
        text: query,
        modelName: model_name,
      }
      const queryEmbeddingResponse =
        yield* providerService.generateEmbedding(embeddingRequest)
      const queryEmbedding = queryEmbeddingResponse.embedding
      const actualModelName = queryEmbeddingResponse.model

      // Search for similar embeddings using repository
      const results = yield* repository.searchSimilar({
        queryEmbedding,
        modelName: actualModelName,
        limit,
        threshold,
        metric,
      })

      // Record search operation metrics
      const duration = (Date.now() - startTime) / 1000
      yield* metricsService.recordSearchOperation(metric, duration)

      return {
        results,
        query,
        model_name: actualModelName,
        metric,
        count: results.length,
        threshold,
      }
    })

  const listProviders = () => providerService.listAllProviders()

  const getCurrentProvider = () => providerService.getCurrentProvider()

  const getProviderModels = (providerType?: string) =>
    Effect.gen(function* () {
      if (providerType) {
        // Get models for specific provider
        const allModels = yield* providerService.listModels()
        return allModels.filter((model) => model.provider === providerType)
      }
      // Get models for current provider
      return yield* providerService.listModels()
    })

  /**
   * Helper function to switch to a different provider with proper error handling
   * Improves maintainability and reduces code duplication
   */
  const switchToProvider = (providerType: string, currentProvider: string) =>
    Effect.gen(function* () {
      // Import available providers function dynamically
      const providersModule = yield* Effect.promise(
        () => import("@/shared/config/providers")
      ).pipe(
        Effect.mapError((error: unknown) =>
          new ProviderConnectionError({
            provider: currentProvider,
            message: `Failed to load provider configurations: ${
              error instanceof Error ? error.message : String(error)
            }`,
            errorCode: "PROVIDER_CONFIG_LOAD_FAILED",
            cause: error instanceof Error ? error : new Error(String(error)),
          })
        )
      )

      const availableProviders = providersModule.getAvailableProviders()

      // Find the requested provider configuration
      const targetProviderConfig = availableProviders.find(
        (provider: { type: string }) => provider.type === providerType
      )

      if (!targetProviderConfig) {
        return yield* Effect.fail(
          new ProviderConnectionError({
            provider: currentProvider,
            message: `Provider '${providerType}' is not available or not configured. Available providers: ${availableProviders.map((p: { type: string }) => p.type).join(', ')}`,
            errorCode: "PROVIDER_NOT_AVAILABLE",
            cause: new Error(
              `Provider '${providerType}' not found in available providers`
            ),
          })
        )
      }

      // Switch to the requested provider
      yield* providerService.switchProvider(targetProviderConfig).pipe(
        Effect.mapError((error) =>
          new ProviderConnectionError({
            provider: currentProvider,
            message: `Failed to switch to provider '${providerType}': ${
              error instanceof Error ? error.message : String(error)
            }`,
            errorCode: "PROVIDER_SWITCH_FAILED",
            cause: error instanceof Error ? error : new Error(String(error)),
          })
        )
      )

      return Effect.void
    })

  const createEmbeddingWithProvider = (
    providerType: string,
    uri: string,
    text: string,
    modelName?: string
  ): Effect.Effect<
    CreateEmbeddingResponse,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError,
    never
  > =>
    Effect.gen(function* () {
      // Get current provider and switch if necessary
      const currentProvider = yield* getCurrentProvider()
      if (currentProvider !== providerType) {
        yield* switchToProvider(providerType, currentProvider)
      }

      // Use the regular createEmbedding method
      return yield* createEmbedding(uri, text, modelName)
    })

  const service = {
    createEmbedding,
    createBatchEmbedding,
    getEmbedding,
    getAllEmbeddings,
    deleteEmbedding,
    searchEmbeddings,
    listProviders,
    getCurrentProvider,
    getProviderModels,
    createEmbeddingWithProvider,
  }
  return service satisfies typeof EmbeddingService.Service
})

export const EmbeddingServiceLive = Layer.suspend(() => {
  // Ensure environment is properly read at layer creation time
  const defaultProvider = getDefaultProvider()
  const factoryConfig = {
    defaultProvider,
    availableProviders: [defaultProvider],
  }

  return Layer.effect(EmbeddingService, make).pipe(
    Layer.provide(EmbeddingRepositoryLive),
    Layer.provideMerge(createEmbeddingProviderService(factoryConfig))
  )
})
