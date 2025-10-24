// EES API Types - completely separated from backend implementation

export interface Embedding {
  id: number
  uri: string
  text: string
  model_name: string
  task_type?: string
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
  task_types?: TaskType[]
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
  document_task_type?: TaskType
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
  task_type?: string
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
  task_types: string[] | null
  description: string | null
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateUploadDirectoryRequest {
  name: string
  path: string
  model_name?: string
  task_types?: TaskType[]
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
  files: string[]
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

// Visualization types
export type ReductionMethod = 'pca' | 'tsne' | 'umap'

export type VisualizationDimensions = 2 | 3

export type SeedMode = 'fixed' | 'random' | 'custom'

export interface VisualizationPoint {
  id: number
  uri: string
  model_name: string
  task_type?: string
  coordinates: number[]
  text_preview?: string
  cluster?: number
}

export type ClusteringMethod = 'kmeans' | 'dbscan' | 'hierarchical'

export interface VisualizeEmbeddingRequest {
  model_name?: string
  task_type?: TaskType
  method: ReductionMethod
  dimensions: VisualizationDimensions
  limit?: number
  perplexity?: number
  n_neighbors?: number
  min_dist?: number
  seed_mode?: SeedMode // Seed mode: 'fixed' (default 42), 'random', or 'custom'
  seed?: number // Custom seed value (only used when seed_mode is 'custom')
  include_uris?: string[] // URIs added on top of limit (e.g., limit=100 + 1 URI = 101 total)
  clustering?: {
    enabled: boolean
    method: ClusteringMethod
    n_clusters?: number // for kmeans and hierarchical
    eps?: number // for DBSCAN
    min_samples?: number // for DBSCAN
    auto_clusters?: boolean // Use BIC to automatically determine n_clusters
    min_clusters?: number // Minimum clusters to test (for BIC)
    max_clusters?: number // Maximum clusters to test (for BIC)
  }
}

export interface VisualizeEmbeddingResponse {
  points: VisualizationPoint[]
  method: ReductionMethod
  dimensions: VisualizationDimensions
  total_points: number
  parameters: {
    perplexity?: number
    n_neighbors?: number
    min_dist?: number
    seed?: number // Actual seed used for this visualization
  }
  clustering?: {
    method: ClusteringMethod
    n_clusters: number
    parameters: {
      n_clusters?: number
      eps?: number
      min_samples?: number
    }
  }
  debug_info?: {
    include_uris_requested?: string[]
    include_uris_found?: number
    include_uris_failed?: string[]
  }
}