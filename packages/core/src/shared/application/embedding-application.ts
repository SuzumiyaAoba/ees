/**
 * Core Application Service for Embedding Management
 *
 * This service provides a framework-agnostic interface for embedding operations.
 * It can be used by both web applications and CLI tools without modification.
 */

import { Context, Effect, Layer } from "effect"
import { EmbeddingService } from "@/entities/embedding/api/embedding"
import type {
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
} from "@/entities/embedding/model/embedding"
import type {
  DatabaseQueryError,
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "@/shared/errors/database"

/**
 * Application-level embedding operations interface
 * Independent of HTTP frameworks, suitable for CLI and web usage
 */
export interface EmbeddingApplicationService {
  /**
   * Create a new embedding from text content
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
   * Create multiple embeddings in batch
   */
  readonly createBatchEmbeddings: (
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
   * Search for similar embeddings
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
   * Get embedding by URI and model name
   */
  readonly getEmbeddingByUri: (
    uri: string,
    modelName: string
  ) => Effect.Effect<Embedding | null, DatabaseQueryError>

  /**
   * List embeddings with optional filtering and pagination
   */
  readonly listEmbeddings: (filters?: {
    uri?: string
    modelName?: string
    page?: number
    limit?: number
  }) => Effect.Effect<EmbeddingsListResponse, DatabaseQueryError>

  /**
   * Delete embedding by ID
   */
  readonly deleteEmbedding: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Delete all embeddings
   */
  readonly deleteAllEmbeddings: () => Effect.Effect<number, DatabaseQueryError>

  /**
   * Update embedding by ID
   */
  readonly updateEmbedding: (
    id: number,
    text: string,
    modelName?: string
  ) => Effect.Effect<
    boolean,
    | ProviderConnectionError
    | ProviderModelError
    | ProviderAuthenticationError
    | ProviderRateLimitError
    | DatabaseQueryError
  >
}

export const EmbeddingApplicationService =
  Context.GenericTag<EmbeddingApplicationService>("EmbeddingApplicationService")

/**
 * Implementation of the application service
 */
const make = Effect.gen(function* () {
  const embeddingService = yield* EmbeddingService

  const createEmbedding = (
    uri: string,
    text: string,
    modelName?: string,
    originalContent?: string,
    convertedFormat?: string
  ) =>
    embeddingService.createEmbedding(uri, text, modelName, originalContent, convertedFormat)

  const createBatchEmbeddings = (request: BatchCreateEmbeddingRequest) =>
    embeddingService.createBatchEmbedding(request)

  const searchEmbeddings = (request: SearchEmbeddingRequest) =>
    embeddingService.searchEmbeddings(request)

  const getEmbeddingByUri = (uri: string, modelName: string) => embeddingService.getEmbedding(uri, modelName)

  const listEmbeddings = (filters?: {
    uri?: string
    modelName?: string
    page?: number
    limit?: number
  }) =>
    embeddingService.getAllEmbeddings(
      filters
        ? {
            ...(filters.uri !== undefined && { uri: filters.uri }),
            ...(filters.modelName !== undefined && {
              model_name: filters.modelName,
            }),
            ...(filters.page !== undefined && { page: filters.page }),
            ...(filters.limit !== undefined && { limit: filters.limit }),
          }
        : undefined
    )

  const deleteEmbedding = (id: number) => embeddingService.deleteEmbedding(id)

  const deleteAllEmbeddings = () => embeddingService.deleteAllEmbeddings()

  const updateEmbedding = (id: number, text: string, modelName?: string) =>
    embeddingService.updateEmbedding(id, text, modelName)

  return {
    createEmbedding,
    createBatchEmbeddings,
    searchEmbeddings,
    getEmbeddingByUri,
    listEmbeddings,
    deleteEmbedding,
    deleteAllEmbeddings,
    updateEmbedding,
  } as const
})

/**
 * Live implementation layer for the application service
 */
export const EmbeddingApplicationServiceLive = Layer.effect(
  EmbeddingApplicationService,
  make
)
