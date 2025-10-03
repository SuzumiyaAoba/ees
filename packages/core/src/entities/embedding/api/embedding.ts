/**
 * Multi-provider embedding service
 * Supports multiple providers (Ollama, OpenAI, Google AI) via Vercel AI SDK
 */

import { Context, Effect, Layer, Option, pipe } from "effect"
import { getDefaultProvider } from "@/shared/config/providers"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  EmbeddingProviderService,
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
import { tryPromiseWithError } from "@/shared/lib/effect-utils"
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

/**
 * Helper function to switch to a different provider with proper error handling
 * Extracted to reduce nesting depth in main service implementation
 */
const switchToProvider = (
  providerType: string,
  currentProvider: string,
  providerService: typeof EmbeddingProviderService.Service
) =>
  pipe(
    tryPromiseWithError(
      () => import("@/shared/config/providers"),
      (error: unknown) =>
        new ProviderConnectionError({
          provider: currentProvider,
          message: `Failed to load provider configurations: ${
            error instanceof Error ? error.message : String(error)
          }`,
          errorCode: "PROVIDER_CONFIG_LOAD_FAILED",
          cause: error instanceof Error ? error : new Error(String(error)),
        })
    ),
    Effect.flatMap((providersModule) => {
      const availableProviders = providersModule.getAvailableProviders()
      const targetProviderConfig = availableProviders.find(
        (provider: { type: string }) => provider.type === providerType
      )

      if (!targetProviderConfig) {
        return Effect.fail(
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

      return pipe(
        providerService.switchProvider(targetProviderConfig),
        Effect.mapError((error) =>
          new ProviderConnectionError({
            provider: currentProvider,
            message: `Failed to switch to provider '${providerType}': ${
              error instanceof Error ? error.message : String(error)
            }`,
            errorCode: "PROVIDER_SWITCH_FAILED",
            cause: error instanceof Error ? error : new Error(String(error)),
          })
        ),
        Effect.asVoid
      )
    })
  )

const make = Effect.gen(function* () {
  const repository = yield* EmbeddingRepository
  const providerService = yield* EmbeddingProviderService
  const metricsService = yield* MetricsServiceTag
  const cacheService = yield* CacheService
  const cacheConfig = getCacheConfig()

  /**
   * Helper function to create a single embedding with input validation
   * Eliminates code duplication between regular and batch operations
   * Refactored to use Effect combinators instead of nested Effect.gen
   */
  const createSingleEmbedding = (
    uri: string,
    text: string,
    modelName?: string
  ): Effect.Effect<
    { id: number; uri: string; model_name: string },
    ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError | DatabaseQueryError
  > => {
    const startTime = Date.now()
    const provider = getDefaultProvider()

    const determineErrorType = (error: unknown): string =>
      error instanceof ProviderConnectionError ? "connection_error" :
      error instanceof ProviderModelError ? "model_error" :
      error instanceof ProviderAuthenticationError ? "auth_error" :
      error instanceof ProviderRateLimitError ? "rate_limit" :
      error instanceof DatabaseQueryError ? "database_error" : "unknown_error"

    const invalidateCache = (modelName: string, uri: string) =>
      cacheConfig.enabled
        ? pipe(
            cacheService.delete(embeddingCacheKey(modelName, uri)),
            Effect.catchAll(() => Effect.void)
          )
        : Effect.void

    return pipe(
      // Validate input parameters
      validateEmbeddingInput(uri, text),
      // Generate embedding using the current provider
      Effect.flatMap(() =>
        providerService.generateEmbedding({ text, modelName })
      ),
      // Save embedding to database and record metrics
      Effect.flatMap((embeddingResponse) =>
        pipe(
          repository.save(uri, text, embeddingResponse.model, embeddingResponse.embedding),
          Effect.flatMap((saveResult) =>
            pipe(
              metricsService.recordEmbeddingCreated(
                provider.type,
                embeddingResponse.model,
                (Date.now() - startTime) / 1000
              ),
              Effect.flatMap(() => invalidateCache(embeddingResponse.model, uri)),
              Effect.map(() => ({
                id: saveResult.id,
                uri,
                model_name: embeddingResponse.model,
              }))
            )
          )
        )
      ),
      // Record error metrics on failure
      Effect.tapError((error) =>
        metricsService.recordEmbeddingError(
          provider.type,
          modelName ?? "unknown",
          determineErrorType(error)
        )
      )
    )
  }

  const createEmbedding = (uri: string, text: string, modelName?: string) =>
    pipe(
      createSingleEmbedding(uri, text, modelName),
      Effect.map((result) => ({
        ...result,
        message: "Embedding created successfully",
      }))
    )

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

  const getEmbedding = (uri: string, modelName: string) => {
    const cacheKey = embeddingCacheKey(modelName, uri)

    const tryCache = () =>
      cacheConfig.enabled
        ? pipe(
            cacheService.get<Embedding>(cacheKey),
            Effect.catchAll(() => Effect.succeed(Option.none()))
          )
        : Effect.succeed(Option.none())

    const updateCache = (embedding: Embedding | null) =>
      cacheConfig.enabled && embedding !== null
        ? pipe(
            cacheService.set(cacheKey, embedding, CacheTTL.EMBEDDING),
            Effect.catchAll(() => Effect.void)
          )
        : Effect.void

    return pipe(
      tryCache(),
      Effect.flatMap((cached) =>
        Option.isSome(cached)
          ? pipe(
              metricsService.recordCacheHit("embedding"),
              Effect.map(() => cached.value)
            )
          : pipe(
              cacheConfig.enabled
                ? metricsService.recordCacheMiss("embedding")
                : Effect.void,
              Effect.flatMap(() => repository.findByUri(uri, modelName)),
              Effect.flatMap((embeddingResult) =>
                pipe(
                  updateCache(embeddingResult),
                  Effect.map(() => embeddingResult)
                )
              )
            )
      )
    )
  }

  const getAllEmbeddings = (filters?: {
    uri?: string
    model_name?: string
    page?: number
    limit?: number
  }) => repository.findAll(filters)

  const deleteEmbedding = (id: number) => repository.deleteById(id)

  const searchEmbeddings = (request: SearchEmbeddingRequest) => {
    const startTime = Date.now()
    const {
      query,
      model_name,
      limit = 10,
      threshold,
      metric = "cosine",
    } = request

    return pipe(
      // Generate embedding for the query text using the current provider
      providerService.generateEmbedding({ text: query, modelName: model_name }),
      // Search for similar embeddings using repository
      Effect.flatMap((queryEmbeddingResponse) =>
        pipe(
          repository.searchSimilar({
            queryEmbedding: queryEmbeddingResponse.embedding,
            modelName: queryEmbeddingResponse.model,
            limit,
            threshold,
            metric,
          }),
          // Record search operation metrics
          Effect.flatMap((results) =>
            pipe(
              metricsService.recordSearchOperation(
                metric,
                (Date.now() - startTime) / 1000
              ),
              Effect.map(() => ({
                results,
                query,
                model_name: queryEmbeddingResponse.model,
                metric,
                count: results.length,
                threshold,
              }))
            )
          )
        )
      )
    )
  }

  const listProviders = () => providerService.listAllProviders()

  const getCurrentProvider = () => providerService.getCurrentProvider()

  const getProviderModels = (providerType?: string) =>
    providerType
      ? pipe(
          providerService.listModels(),
          Effect.map((allModels) =>
            allModels.filter((model) => model.provider === providerType)
          )
        )
      : providerService.listModels()

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
    pipe(
      getCurrentProvider(),
      Effect.flatMap((currentProvider) =>
        currentProvider !== providerType
          ? pipe(
              switchToProvider(providerType, currentProvider, providerService),
              Effect.flatMap(() => createEmbedding(uri, text, modelName))
            )
          : createEmbedding(uri, text, modelName)
      )
    )

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
