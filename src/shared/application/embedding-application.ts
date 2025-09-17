/**
 * Core Application Service for Embedding Management
 *
 * This service provides a framework-agnostic interface for embedding operations.
 * It can be used by both web applications and CLI tools without modification.
 */

import { Context, Effect, Layer } from "effect"
import { EmbeddingService } from "../../entities/embedding/api/embedding"
import type {
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingsListResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
} from "../../entities/embedding/model/embedding"
import type { DatabaseQueryError } from "../errors/database"
import type { OllamaModelError } from "../errors/ollama"

/**
 * Application-level embedding operations interface
 * Independent of HTTP frameworks, suitable for CLI and web usage
 */
export interface EmbeddingApplicationService {
  /**
   * Create a new embedding from text content
   */
  readonly createEmbedding: (params: {
    uri: string
    text: string
    modelName?: string
  }) => Effect.Effect<
    CreateEmbeddingResponse,
    OllamaModelError | DatabaseQueryError
  >

  /**
   * Create multiple embeddings in batch
   */
  readonly createBatchEmbeddings: (
    request: BatchCreateEmbeddingRequest
  ) => Effect.Effect<
    BatchCreateEmbeddingResponse,
    OllamaModelError | DatabaseQueryError
  >

  /**
   * Search for similar embeddings
   */
  readonly searchEmbeddings: (
    request: SearchEmbeddingRequest
  ) => Effect.Effect<
    SearchEmbeddingResponse,
    OllamaModelError | DatabaseQueryError
  >

  /**
   * Get embedding by URI
   */
  readonly getEmbeddingByUri: (
    uri: string
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
}

export const EmbeddingApplicationService =
  Context.GenericTag<EmbeddingApplicationService>("EmbeddingApplicationService")

/**
 * Implementation of the application service
 */
const make = Effect.gen(function* () {
  const embeddingService = yield* EmbeddingService

  const createEmbedding = (params: {
    uri: string
    text: string
    modelName?: string
  }) =>
    embeddingService.createEmbedding(params.uri, params.text, params.modelName)

  const createBatchEmbeddings = (request: BatchCreateEmbeddingRequest) =>
    embeddingService.createBatchEmbedding(request)

  const searchEmbeddings = (request: SearchEmbeddingRequest) =>
    embeddingService.searchEmbeddings(request)

  const getEmbeddingByUri = (uri: string) => embeddingService.getEmbedding(uri)

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

  return {
    createEmbedding,
    createBatchEmbeddings,
    searchEmbeddings,
    getEmbeddingByUri,
    listEmbeddings,
    deleteEmbedding,
  } as const
})

/**
 * Live implementation layer for the application service
 */
export const EmbeddingApplicationServiceLive = Layer.effect(
  EmbeddingApplicationService,
  make
)
