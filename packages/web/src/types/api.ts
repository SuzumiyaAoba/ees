// EES API Types - completely separated from backend implementation

export interface Embedding {
  id: number
  uri: string
  text: string
  model_name: string
  embedding: number[]
  original_content?: string
  converted_format?: string
  created_at: string
  updated_at: string
}

export interface CreateEmbeddingRequest {
  uri: string
  text: string
  model_name?: string
}

export interface CreateEmbeddingResponse {
  id: number
  uri: string
  model_name: string
  message: string
}

export interface UpdateEmbeddingRequest {
  text: string
  model_name?: string
}

export interface UpdateEmbeddingResponse {
  success: boolean
  message: string
}

export interface BatchCreateEmbeddingRequest {
  texts: Array<{
    uri: string
    text: string
  }>
  model_name?: string
}

export interface BatchCreateEmbeddingResponse {
  successful: number
  failed: number
  results: CreateEmbeddingResponse[]
  model_name: string
  message: string
}

export type TaskType =
  | 'retrieval_query'
  | 'retrieval_document'
  | 'question_answering'
  | 'fact_verification'
  | 'classification'
  | 'clustering'
  | 'semantic_similarity'
  | 'code_retrieval'

export interface TaskTypeMetadata {
  value: TaskType
  label: string
  description: string
}

export interface ListTaskTypesResponse {
  model_name: string
  task_types: TaskTypeMetadata[]
  count: number
}

export interface SearchEmbeddingRequest {
  query: string
  model_name?: string
  query_task_type?: TaskType
  query_title?: string
  limit?: number
  threshold?: number
  metric?: 'cosine' | 'euclidean' | 'dot_product'
}

export interface SearchResult {
  id: number
  uri: string
  text: string
  model_name: string
  similarity: number
  original_content?: string
  converted_format?: string
  created_at: string
  updated_at: string
}

export interface SearchEmbeddingResponse {
  results: SearchResult[]
  query: string
  model_name: string
  limit: number
  metric: string
  threshold?: number
  total_results: number
}

export interface EmbeddingsListResponse {
  embeddings: Embedding[]
  count: number
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ProviderInfo {
  name: string
  provider?: string
  dimensions?: number
  maxTokens?: number
  pricePerToken?: number
  size?: number
  modified_at?: string
  digest?: string
}

export interface ErrorResponse {
  error: string
}

// Migration-related types
export interface MigrationRequest {
  fromModel: string
  toModel: string
  options?: {
    readonly preserveOriginal?: boolean
    readonly batchSize?: number
    readonly continueOnError?: boolean
    readonly metadata?: Record<string, unknown>
  }
}

export interface MigrationResponse {
  readonly totalProcessed: number
  readonly successful: number
  readonly failed: number
  readonly duration: number
  readonly details: ReadonlyArray<{
    readonly id: number
    readonly uri: string
    readonly status: 'success' | 'error'
    readonly error?: string
  }>
}

export interface CompatibilityCheckRequest {
  readonly sourceModel: string
  readonly targetModel: string
}

export interface CompatibilityResponse {
  readonly compatible: boolean
  readonly reason?: string
  readonly similarityScore?: number
}

export interface ModelInfo {
  name: string
  displayName?: string
  provider: string
  dimensions: number
  maxTokens: number
  available: boolean
  description?: string
  version?: string
  languages?: string[]
  pricePerToken?: number
}

export interface ListModelsResponse {
  models: ModelInfo[]
  count: number
  providers: string[]
}

// Upload Directory Management types
export interface UploadDirectory {
  id: number
  name: string
  path: string
  model_name: string
  description: string | null
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateUploadDirectoryRequest {
  name: string
  path: string
  model_name?: string
  description?: string
}

export interface CreateUploadDirectoryResponse {
  id: number
  message: string
}

export interface UpdateUploadDirectoryRequest {
  name?: string
  model_name?: string
  description?: string
}

export interface UploadDirectoryListResponse {
  directories: UploadDirectory[]
  count: number
}

export interface SyncUploadDirectoryResponse {
  directory_id: number
  files_processed: number
  files_created: number
  files_updated: number
  files_failed: number
  message: string
}

// File System types
export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface ListDirectoryResponse {
  path: string
  entries: DirectoryEntry[]
}