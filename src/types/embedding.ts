export interface Embedding {
  id: number
  uri: string
  text: string
  model_name: string
  embedding: number[]
  created_at: string | null
  updated_at: string | null
}

export interface CreateEmbeddingRequest {
  uri: string
  text: string
  model_name?: string
}

export interface BatchCreateEmbeddingRequest {
  texts: Array<{
    uri: string
    text: string
  }>
  model_name?: string
}

export interface BatchCreateEmbeddingResponse {
  results: Array<{
    id: number
    uri: string
    model_name: string
    status: "success" | "error"
    error?: string
  }>
  total: number
  successful: number
  failed: number
}

export interface CreateEmbeddingResponse {
  id: number
  uri: string
  model_name: string
  message: string
}

export interface EmbeddingSearchResult {
  uri: string
  similarity: number
}

export interface EmbeddingsListResponse {
  embeddings: Embedding[]
  count: number
  page: number
  limit: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}
