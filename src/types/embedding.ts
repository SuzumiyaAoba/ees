export interface Embedding {
  id: number
  file_path: string
  embedding: number[]
  created_at: string
  updated_at: string
}

export interface CreateEmbeddingRequest {
  file_path: string
  text: string
}

export interface CreateEmbeddingResponse {
  id: number
  file_path: string
  message: string
}

export interface EmbeddingSearchResult {
  file_path: string
  similarity: number
}
