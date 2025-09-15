export interface Embedding {
  id: number
  uri: string
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

export interface EmbeddingSearchResult {
  uri: string
  similarity: number
}
