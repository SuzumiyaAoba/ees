// Core EES package - shared types, utilities, and business logic

// Re-export shared modules
export * from './shared/index'

// Re-export entities (only non-conflicting exports)
export { EmbeddingService } from './entities/embedding/index'
export type {
  CreateEmbeddingRequest,
  UpdateEmbeddingRequest,
  BatchCreateEmbeddingRequest,
  SearchEmbeddingRequest,
  CreateEmbeddingResponse,
  UpdateEmbeddingResponse,
  BatchCreateEmbeddingResponse,
  SearchEmbeddingResponse,
  EmbeddingsListResponse,
  Embedding
} from './entities/embedding/model/embedding'

// Export OpenAPI schemas for API package consumption
export {
  TaskTypeSchema,
  CreateEmbeddingRequestSchema,
  UpdateEmbeddingRequestSchema,
  BatchCreateEmbeddingRequestSchema,
  UriParamSchema,
  UriModelParamSchema,
  IdParamSchema,
  EmbeddingQuerySchema,
  CreateEmbeddingResponseSchema,
  UpdateEmbeddingResponseSchema,
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
  ModelManagerTag,
  ModelManagerLive,
} from './shared/models/index'

export {
  TaskType,
  EMBEDDINGGEMMA_TASK_PROMPTS,
  MODEL_TASK_SUPPORT,
  TASK_TYPE_METADATA,
  isTaskTypeSupported,
  getTaskTypePromptFormatter,
  formatTextWithTaskType,
  getSupportedTaskTypes,
} from './shared/models/task-type'
export type { TaskType as TaskTypeEnum, TaskTypeMetadata } from './shared/models/task-type'

export {
  CoreApplicationLayer,
  ApplicationLayer,
} from './shared/application/layers'

export {
  getPort,
  getEnv,
  getEnvWithDefault,
  getEnvNumber,
  getEnvBoolean,
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

// Export observability system
export * from './shared/observability/index'