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

export { ConnectionService } from './entities/connection/index'
export type {
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionTestRequest,
  ConnectionTestResponse,
  ConnectionResponse,
  ConnectionsListResponse,
} from './entities/connection/api/connection'

export { ModelService, ModelServiceLive } from './entities/model/api/model'
export type {
  CreateModelRequest,
  UpdateModelRequest,
  ModelResponse,
  ModelsListResponse,
} from './entities/model/api/model'

// Export provider and model repositories
export {
  ProviderRepository,
  ProviderRepositoryLive,
} from './entities/provider/repository/provider-repository'

export {
  ModelRepository,
  ModelRepositoryLive,
} from './entities/model/repository/model-repository'

export type { Provider, NewProvider, Model, NewModel } from './shared/database/schema'

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

// Export upload directory management
export {
  UploadDirectoryRepository,
  UploadDirectoryRepositoryLive,
  type UploadDirectory,
  type UploadDirectoryData,
  type CreateUploadDirectoryResult,
} from './entities/upload-directory/repository/upload-directory-repository'

// Export sync job types and schema
export { syncJobs } from './shared/database/schema'
export type { SyncJob, NewSyncJob } from './shared/database/schema'

export {
  CreateUploadDirectoryRequestSchema,
  UpdateUploadDirectoryRequestSchema,
  IdParamSchema as UploadDirectoryIdParamSchema,
  UploadDirectorySchema,
  CreateUploadDirectoryResponseSchema,
  UploadDirectoryListResponseSchema,
  SyncUploadDirectoryResponseSchema,
  SyncJobStatusSchema,
  JobIdParamSchema,
  DeleteUploadDirectoryResponseSchema,
} from './entities/upload-directory/model/openapi'

// Export file system service
export {
  FileSystemService,
  FileSystemServiceLive,
  type DirectoryEntry,
} from './entities/file-system/api/file-system'

// Export visualization service
export {
  VisualizationService,
  VisualizationServiceLive,
  type VisualizationError,
} from './entities/visualization/api/visualization-service'

export type {
  VisualizeEmbeddingRequest,
  VisualizeEmbeddingResponse,
  VisualizationPoint,
  ReductionMethod,
  VisualizationDimensions,
} from './entities/visualization/model/visualization'

export {
  VisualizeEmbeddingRequestSchema,
  VisualizeEmbeddingResponseSchema,
  VisualizationPointSchema,
  ReductionMethodSchema,
  VisualizationDimensionsSchema,
} from './entities/visualization/model/openapi'

// Export reranking service and types
export { RerankingService } from './entities/reranking/api/reranking'
export type {
  RerankRequest,
  RerankResponse,
  RerankDocument,
  RerankResult,
  RerankingService as RerankingServiceType,
} from './entities/reranking/api/reranking'

export {
  RerankRequestSchema,
  RerankResponseSchema,
  RerankDocumentSchema,
  RerankResultSchema,
} from './entities/reranking/model/openapi'