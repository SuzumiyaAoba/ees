// EES API Types - completely separated from backend implementation

export interface Embedding {
  id: number
  uri: string
  text: string
  model_name: string
  embedding: number[]
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

export interface SearchEmbeddingRequest {
  query: string
  model_name?: string
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