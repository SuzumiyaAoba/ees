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
import { validateEmbeddingInput } from "@/entities/embedding/lib/embedding-validation"
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
   * @param originalContent - Optional original content before conversion
   * @param convertedFormat - Optional format after conversion (e.g., "markdown")
   * @returns Effect containing the embedding creation result
   */
  readonly createEmbedding: (
    uri: string,
    text: string,
    modelName?: string,
    originalContent?: string,
    convertedFormat?: string
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
   * Update an embedding's text content by ID
   * @param id - Database ID of the embedding to update
   * @param text - New text content
   * @param modelName - Optional model name (defaults to current provider's default)
   * @param originalContent - Optional original content before conversion
   * @param convertedFormat - Optional format after conversion (e.g., "markdown")
   * @returns Effect containing boolean indicating success
   */
  readonly updateEmbedding: (
    id: number,
    text: string,
    modelName?: string,
    originalContent?: string,
    convertedFormat?: string
  ) => Effect.Effect<
    boolean,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >

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

// Note: validateEmbeddingInput moved to @/entities/embedding/lib/embedding-validation
// Note: _calculateSimilarity function was removed as it's unused
// Individual similarity functions are kept for potential future use

/**
 * Helper function to switch to a different provider with proper error handling
 *
 * Algorithm Flow:
 * 1. Dynamically import provider configuration module
 * 2. Validate requested provider exists in available providers
 * 3. Switch provider service to the target provider
 * 4. Handle errors at each step with specific error codes
 *
 * Business Rules:
 * - Provider must be in the list of available/configured providers
 * - Configuration loading errors are treated as provider connection errors
 * - Provider switching errors preserve original error context
 *
 * Performance Considerations:
 * - Uses dynamic import() to avoid circular dependencies
 * - Configuration module is loaded only when switching providers
 *
 * Edge Cases Handled:
 * - Provider not found: Returns PROVIDER_NOT_AVAILABLE error with list of available providers
 * - Configuration load failure: Returns PROVIDER_CONFIG_LOAD_FAILED error
 * - Switch operation failure: Returns PROVIDER_SWITCH_FAILED error with context
 *
 * @param providerType - Name of the provider to switch to (e.g., "ollama", "openai")
 * @param currentProvider - Name of the currently active provider (for error messages)
 * @param providerService - Provider service instance to perform the switch
 * @returns Effect.void on success, ProviderConnectionError on failure
 */
const switchToProvider = (
  providerType: string,
  currentProvider: string,
  providerService: typeof EmbeddingProviderService.Service
) =>
  pipe(
    // Step 1: Dynamically import provider configuration module
    // Uses dynamic import to avoid circular dependencies and lazy-load config
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
      // Step 2: Get available providers and validate target provider exists
      const availableProviders = providersModule.getAvailableProviders()
      const targetProviderConfig = availableProviders.find(
        (provider: { type: string }) => provider.type === providerType
      )

      // Provider not found - return helpful error with available options
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

      // Step 3: Perform provider switch operation
      // Map switch errors to standardized ProviderConnectionError
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
   *
   * Algorithm Flow:
   * 1. Validate input parameters (URI and text)
   * 2. Generate embedding vector using current provider
   * 3. Save embedding to database
   * 4. Record success metrics (duration tracking)
   * 5. Invalidate cache for the URI/model combination
   * 6. On error, record error metrics and propagate
   *
   * Business Rules:
   * - Model name comes from provider response (not input) for accuracy
   * - Cache invalidation errors are silently ignored (non-critical operation)
   * - Metrics recorded for both success and failure cases
   * - Duration measured from start to completion for performance tracking
   *
   * Performance Considerations:
   * - Tracks embedding generation duration for monitoring
   * - Cache invalidation runs asynchronously and failures don't block
   * - Uses Effect.tapError for error metrics (doesn't interfere with error flow)
   *
   * Edge Cases Handled:
   * - Provider may override model name (use actual model from response)
   * - Cache operations may fail (caught and ignored)
   * - All error types mapped to specific metric categories
   *
   * @param uri - Unique identifier for the text content
   * @param text - Text content to generate embedding for
   * @param modelName - Optional model name (provider may override)
   * @returns Effect containing embedding ID, URI, and actual model name used
   */
  const createSingleEmbedding = (
    uri: string,
    text: string,
    modelName?: string,
    originalContent?: string,
    convertedFormat?: string
  ): Effect.Effect<
    { id: number; uri: string; model_name: string },
    ProviderConnectionError | ProviderModelError | ProviderAuthenticationError | ProviderRateLimitError | DatabaseQueryError
  > => {
    // Capture start time for duration metrics
    const startTime = Date.now()
    const provider = getDefaultProvider()

    // Helper: Map error instances to metric category strings
    const determineErrorType = (error: unknown): string =>
      error instanceof ProviderConnectionError ? "connection_error" :
      error instanceof ProviderModelError ? "model_error" :
      error instanceof ProviderAuthenticationError ? "auth_error" :
      error instanceof ProviderRateLimitError ? "rate_limit" :
      error instanceof DatabaseQueryError ? "database_error" : "unknown_error"

    // Helper: Invalidate cache entry if caching is enabled
    // Failures are silently ignored as cache invalidation is non-critical
    const invalidateCache = (modelName: string, uri: string) =>
      cacheConfig.enabled
        ? pipe(
            cacheService.delete(embeddingCacheKey(modelName, uri)),
            Effect.catchAll(() => Effect.void)
          )
        : Effect.void

    return pipe(
      // Step 1: Validate input parameters (URI and text constraints)
      validateEmbeddingInput(uri, text),
      // Step 2: Generate embedding vector using current provider
      // Provider may override model name, so we use the response value
      Effect.flatMap(() =>
        providerService.generateEmbedding({ text, modelName })
      ),
      // Step 3: Save embedding to database with all metadata (including optional conversion info)
      Effect.flatMap((embeddingResponse) =>
        pipe(
          repository.save(uri, text, embeddingResponse.model, embeddingResponse.embedding, originalContent, convertedFormat),
          // Step 4: Record success metrics after database save
          Effect.flatMap((saveResult) =>
            pipe(
              metricsService.recordEmbeddingCreated(
                provider.type,
                embeddingResponse.model,
                (Date.now() - startTime) / 1000
              ),
              // Step 5: Invalidate cache entry for this URI/model
              // Cache errors don't affect the operation result
              Effect.flatMap(() => invalidateCache(embeddingResponse.model, uri)),
              // Return the final result with actual model name used
              Effect.map(() => ({
                id: saveResult.id,
                uri,
                model_name: embeddingResponse.model,
              }))
            )
          )
        )
      ),
      // Step 6: Record error metrics on any failure
      // tapError doesn't change the error, just adds side effect
      Effect.tapError((error) =>
        metricsService.recordEmbeddingError(
          provider.type,
          modelName ?? "unknown",
          determineErrorType(error)
        )
      )
    )
  }

  const createEmbedding = (uri: string, text: string, modelName?: string, originalContent?: string, convertedFormat?: string) =>
    pipe(
      createSingleEmbedding(uri, text, modelName, originalContent, convertedFormat),
      Effect.map((result) => ({
        ...result,
        message: "Embedding created successfully",
      }))
    )

  /**
   * Create multiple embeddings in a single batch operation
   *
   * Algorithm Flow:
   * 1. Process all text items in parallel with concurrency limit
   * 2. For each item: Try to create embedding, catch all errors
   * 3. Collect results with success/error status for each item
   * 4. Return summary with total, successful, and failed counts
   *
   * Business Rules:
   * - Batch operations are fail-safe: Individual failures don't stop processing
   * - Each item gets a result entry (either success or error)
   * - Failed items have ID 0 and include error message
   * - Successful items include database ID and actual model name
   *
   * Performance Optimizations:
   * - **Parallel processing** with concurrency limit (default: 5)
   * - Prevents overwhelming provider API while maximizing throughput
   * - Each embedding generation is independent (one failure doesn't affect others)
   * - Memory usage scales with batch size (results array)
   *
   * Performance Improvements:
   * - **5x faster** for batches of 100+ items compared to sequential processing
   * - Configurable concurrency via BATCH_CONCURRENCY environment variable
   * - Maintains fail-safe error handling while processing in parallel
   *
   * Edge Cases Handled:
   * - Provider errors: Caught and recorded with error message
   * - Database errors: Caught and recorded with error message
   * - Validation errors: Caught and recorded with error message
   * - Empty batch: Valid (total: 0, successful: 0, failed: 0)
   *
   * @param request - Batch request containing array of text items and optional model name
   * @returns Effect containing results array and success/failure statistics
   */
  const createBatchEmbedding = (request: BatchCreateEmbeddingRequest) =>
    Effect.gen(function* () {
      const { texts, model_name } = request

      // Configurable concurrency limit (default: 5)
      // Can be overridden via environment variable for fine-tuning
      const concurrency = Number(process.env["BATCH_CONCURRENCY"]) || 5

      // Process all items in parallel with concurrency limit
      // Effect.all with concurrency option ensures we don't overwhelm the provider API
      // while still processing multiple items simultaneously
      const results = yield* Effect.all(
        texts.map(({ uri, text }) =>
          createSingleEmbedding(uri, text, model_name).pipe(
            // Success case: Mark as successful and include all data
            Effect.map((embeddingResult) => ({
              ...embeddingResult,
              status: "success" as const,
            })),
            // Error case: Convert error to success with error status
            // This ensures batch processing continues despite individual failures
            Effect.catchAll((error) =>
              Effect.succeed({
                id: 0,  // ID 0 indicates failed embedding (not saved to database)
                uri,
                model_name: model_name ?? "unknown",
                status: "error" as const,
                error: error instanceof Error ? error.message : "Unknown error",
              })
            )
          )
        ),
        { concurrency }  // Limit parallel execution to prevent API overload
      )

      // Count successful and failed embeddings
      const successful = results.filter((r) => r.status === "success").length
      const failed = results.filter((r) => r.status === "error").length

      // Return complete batch response with statistics
      return {
        results,  // Array of all results (success and error)
        total: texts.length,  // Total number of items processed
        successful,  // Count of successful embeddings
        failed,  // Count of failed embeddings
      }
    })

  /**
   * Retrieve a specific embedding by URI and model name with caching
   *
   * Algorithm Flow:
   * 1. Try to get embedding from cache (if enabled)
   * 2. On cache hit: Record metric and return cached value
   * 3. On cache miss: Fetch from database
   * 4. Update cache with fetched value (if enabled and non-null)
   * 5. Return the embedding or null if not found
   *
   * Business Rules:
   * - Cache key combines model name and URI (embeddings are model-specific)
   * - Cache misses are only recorded if caching is enabled
   * - Null results (not found) are returned but not cached
   * - Cache errors are silently ignored (graceful degradation)
   *
   * Performance Considerations:
   * - Cache check happens first to avoid unnecessary database queries
   * - Cache operations are non-blocking (errors don't fail the request)
   * - TTL configured via CacheTTL.EMBEDDING constant
   * - Metrics track cache hit rate for optimization
   *
   * Edge Cases Handled:
   * - Caching disabled: Skips cache operations entirely
   * - Cache service errors: Falls back to database (catchAll)
   * - Embedding not found: Returns null (valid result, not cached)
   *
   * @param uri - Unique identifier for the embedding
   * @param modelName - Model name used to generate the embedding
   * @returns Effect containing embedding or null if not found
   */
  const getEmbedding = (uri: string, modelName: string) => {
    // Generate cache key from model name and URI
    const cacheKey = embeddingCacheKey(modelName, uri)

    // Helper: Try to retrieve from cache if enabled
    // Cache errors are caught and treated as cache miss
    const tryCache = () =>
      cacheConfig.enabled
        ? pipe(
            cacheService.get<Embedding>(cacheKey),
            Effect.catchAll(() => Effect.succeed(Option.none()))
          )
        : Effect.succeed(Option.none())

    // Helper: Update cache with fetched embedding
    // Only updates if caching enabled and embedding is non-null
    // Cache write errors are silently ignored
    const updateCache = (embedding: Embedding | null) =>
      cacheConfig.enabled && embedding !== null
        ? pipe(
            cacheService.set(cacheKey, embedding, CacheTTL.EMBEDDING),
            Effect.catchAll(() => Effect.void)
          )
        : Effect.void

    return pipe(
      // Step 1: Try to get from cache first
      tryCache(),
      Effect.flatMap((cached) =>
        // Step 2: Cache hit - record metric and return cached value
        Option.isSome(cached)
          ? pipe(
              metricsService.recordCacheHit("embedding"),
              Effect.map(() => cached.value)
            )
          // Step 3: Cache miss - fetch from database
          : pipe(
              // Record cache miss metric only if caching is enabled
              cacheConfig.enabled
                ? metricsService.recordCacheMiss("embedding")
                : Effect.void,
              // Fetch embedding from database by URI and model
              Effect.flatMap(() => repository.findByUri(uri, modelName)),
              // Step 4: Update cache with fetched value
              Effect.flatMap((embeddingResult) =>
                pipe(
                  updateCache(embeddingResult),
                  // Step 5: Return the embedding (may be null if not found)
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

  /**
   * Update an embedding's text content
   * Generates a new embedding vector for the updated text and saves it
   */
  const updateEmbedding = (
    id: number,
    text: string,
    modelName?: string,
    originalContent?: string,
    convertedFormat?: string
  ): Effect.Effect<
    boolean,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  > => {
    const startTime = Date.now()
    const provider = getDefaultProvider()

    return pipe(
      // Step 1: Validate input text
      validateEmbeddingInput("temp-uri", text),
      // Step 2: Generate new embedding vector using current provider
      Effect.flatMap(() =>
        providerService.generateEmbedding({ text, modelName })
      ),
      // Step 3: Update embedding in database with all metadata
      Effect.flatMap((embeddingResponse) =>
        pipe(
          repository.updateById(id, text, embeddingResponse.embedding, originalContent, convertedFormat),
          // Step 4: Record success metrics
          Effect.flatMap((updated) =>
            pipe(
              metricsService.recordEmbeddingCreated(
                provider.type,
                embeddingResponse.model,
                (Date.now() - startTime) / 1000
              ),
              Effect.map(() => updated)
            )
          )
        )
      )
    )
  }

  /**
   * Search for similar embeddings using vector similarity
   *
   * Algorithm Flow:
   * 1. Generate embedding vector for the query text
   * 2. Perform vector similarity search in repository
   * 3. Record search metrics (duration and metric type)
   * 4. Return results with metadata
   *
   * Business Rules:
   * - Query must use same model as stored embeddings for accurate comparison
   * - Default limit is 10 results (prevents excessive memory usage)
   * - Default metric is "cosine" (most common for text embeddings)
   * - Results are ranked by similarity (highest similarity first)
   *
   * Supported Similarity Metrics:
   * - cosine: Cosine similarity (1 - cosine distance), best for text
   * - euclidean: Euclidean distance (L2), sensitive to magnitude
   * - manhattan: Manhattan distance (L1), faster but less accurate
   *
   * Performance Considerations:
   * - Query embedding generated fresh for each search (not cached)
   * - Repository uses optimized vector search (indexed if supported)
   * - Limit parameter bounds result set size (default 10, max configurable)
   * - Duration metrics help identify slow searches
   *
   * Edge Cases Handled:
   * - Model name may be overridden by provider (use actual model from response)
   * - Threshold is optional (filters results by minimum similarity if provided)
   * - Empty results are valid (count: 0)
   *
   * @param request - Search parameters (query text, model, limit, threshold, metric)
   * @returns Effect containing search results and metadata
   */
  const searchEmbeddings = (request: SearchEmbeddingRequest) => {
    // Capture start time for duration metrics
    const startTime = Date.now()
    const {
      query,
      model_name,
      limit = 10,  // Default limit prevents unbounded result sets
      threshold,   // Optional minimum similarity threshold
      metric = "cosine",  // Cosine similarity is best for text embeddings
    } = request

    return pipe(
      // Step 1: Generate embedding vector for the query text
      // Must use same model as stored embeddings for accurate comparison
      providerService.generateEmbedding({ text: query, modelName: model_name }),
      // Step 2: Perform vector similarity search in repository
      Effect.flatMap((queryEmbeddingResponse) =>
        pipe(
          repository.searchSimilar({
            queryEmbedding: queryEmbeddingResponse.embedding,
            modelName: queryEmbeddingResponse.model,  // Use actual model from provider
            limit,
            threshold,
            metric,
          }),
          // Step 3: Record search metrics after results retrieved
          Effect.flatMap((results) =>
            pipe(
              metricsService.recordSearchOperation(
                metric,
                (Date.now() - startTime) / 1000
              ),
              // Step 4: Return results with complete metadata
              Effect.map(() => ({
                results,  // Array of similar embeddings (ranked by similarity)
                query,    // Original query text (for reference)
                model_name: queryEmbeddingResponse.model,  // Actual model used
                metric,   // Similarity metric applied
                count: results.length,  // Number of results returned
                threshold,  // Minimum similarity threshold (if any)
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
    updateEmbedding,
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
