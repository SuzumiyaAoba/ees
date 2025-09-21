// Core EES package - shared types, utilities, and business logic

// Re-export shared modules
export * from './shared/index'

// Re-export entities (only non-conflicting exports)
export { EmbeddingService } from './entities/embedding/index'
export type {
  CreateEmbeddingRequest,
  BatchCreateEmbeddingRequest,
  SearchEmbeddingRequest,
  CreateEmbeddingResponse,
  BatchCreateEmbeddingResponse,
  SearchEmbeddingResponse,
  EmbeddingsListResponse,
  Embedding
} from './entities/embedding/model/embedding'

// Export OpenAPI schemas for API package consumption
export {
  CreateEmbeddingRequestSchema,
  BatchCreateEmbeddingRequestSchema,
  UriParamSchema,
  IdParamSchema,
  EmbeddingQuerySchema,
  CreateEmbeddingResponseSchema,
  BatchCreateEmbeddingResponseSchema,
  SearchEmbeddingRequestSchema,
  SearchEmbeddingResultSchema,
  SearchEmbeddingResponseSchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  DeleteEmbeddingResponseSchema,
  ErrorResponseSchema,
  NotFoundResponseSchema,
  ValidationErrorResponseSchema,
} from './entities/embedding/model/openapi'

// Explicitly export application layer and helpers for external packages
export {
  EmbeddingApplicationService,
  EmbeddingApplicationServiceLive,
} from './shared/application/embedding-application'

export {
  CoreApplicationLayer,
  ApplicationLayer,
} from './shared/application/layers'

export {
  getPort,
  getEnv,
  getEnvWithDefault,
  isTestEnv,
  log,
  error,
  parseBatchFile,
  readStdin,
  readTextFile,
  processFile,
  processFiles,
  type FileProcessorError,
  type FileProcessingResult,
  UnsupportedFileTypeError,
  FileProcessingError,
  FileTooLargeError,
} from './shared/lib/index'

export { DatabaseService } from './shared/database/connection'