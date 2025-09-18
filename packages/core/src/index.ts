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
  EmbeddingsListResponse
} from './entities/embedding/model/embedding.js'