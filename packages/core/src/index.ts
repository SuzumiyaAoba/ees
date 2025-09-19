// Core EES package - shared types, utilities, and business logic

// Re-export shared modules
export * from './shared/index.js'

// Re-export entities (only non-conflicting exports)
export { EmbeddingService } from './entities/embedding/index.js'
export type {
  CreateEmbeddingRequest,
  BatchCreateEmbeddingRequest,
  SearchEmbeddingRequest,
  CreateEmbeddingResponse,
  BatchCreateEmbeddingResponse,
  SearchEmbeddingResponse,
  EmbeddingsListResponse,
  Embedding
} from './entities/embedding/model/embedding.js'

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
} from './entities/embedding/model/openapi.js'

// Explicitly export application layer and helpers for external packages
export {
  EmbeddingApplicationService,
  EmbeddingApplicationServiceLive,
} from './shared/application/embedding-application.js'

export {
  CoreApplicationLayer,
  ApplicationLayer,
} from './shared/application/layers.js'

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
} from './shared/lib/index.js'

export { DatabaseService } from './shared/database/connection.js'