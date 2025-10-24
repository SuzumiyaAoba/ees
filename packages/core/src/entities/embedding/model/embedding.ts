// Core embedding types for the domain

import type { TaskType } from "@/shared/models/task-type"

export interface Embedding {
  id: number
  uri: string
  text: string
  model_name: string
  task_type?: string | null
  embedding: number[]
  original_content?: string | null
  converted_format?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateEmbeddingRequest {
  uri: string
  text: string
  model_name?: string
  task_types?: TaskType[]
  title?: string
}

export interface BatchCreateEmbeddingRequest {
  texts: Array<{
    uri: string
    text: string
    title?: string
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

export interface UpdateEmbeddingRequest {
  text: string
  model_name?: string
}

export interface UpdateEmbeddingResponse {
  success: boolean
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

export interface SearchEmbeddingRequest {
  query: string
  model_name?: string
  query_task_type?: string
  document_task_type?: string
  query_title?: string
  limit?: number
  threshold?: number | undefined
  metric?: "cosine" | "euclidean" | "dot_product"
}

export interface SearchEmbeddingResult {
  id: number
  uri: string
  text: string
  model_name: string
  task_type?: string
  similarity: number
  created_at: string | null
  updated_at: string | null
}

export interface SearchEmbeddingResponse {
  results: SearchEmbeddingResult[]
  query: string
  model_name: string
  metric: string
  count: number
  threshold: number | undefined
}
