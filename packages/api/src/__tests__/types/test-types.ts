/**
 * Type definitions for E2E tests
 */

// OpenAPI Specification types
export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
    license: {
      name: string
      url: string
    }
  }
  servers: Array<{
    url: string
    description: string
  }>
  paths: Record<string, unknown>
  tags: Array<{
    name: string
    description?: string
  }>
}

// Embedding response types
export interface EmbeddingResponse {
  id: number
  uri: string
  text: string
  model_name: string
  embedding: number[]
  created_at: string
}

// Create embedding response type (simpler confirmation response)
export interface CreateEmbeddingResponse {
  id: number
  uri: string
  model_name: string
  message: string
}

// Error response types
export interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

// Validation error response (Hono format)
export interface ValidationErrorResponse {
  success: false
  error: {
    issues: Array<{
      code: string
      message: string
      path: string[]
    }>
  }
}

// Batch operation response types
export interface BatchResult {
  results: Array<{
    success: boolean
    embedding?: EmbeddingResponse
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// Batch create response type (actual API response format)
export interface BatchCreateResponse {
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

// Type guard for batch results
export function isBatchResult(obj: unknown): obj is BatchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'results' in obj &&
    'summary' in obj &&
    Array.isArray((obj as BatchResult).results)
  )
}

// Type guard for batch create response
export function isBatchCreateResponse(obj: unknown): obj is BatchCreateResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'results' in obj &&
    'total' in obj &&
    'successful' in obj &&
    'failed' in obj &&
    Array.isArray((obj as BatchCreateResponse).results) &&
    typeof (obj as BatchCreateResponse).total === 'number' &&
    typeof (obj as BatchCreateResponse).successful === 'number' &&
    typeof (obj as BatchCreateResponse).failed === 'number'
  )
}

// List embeddings response type
export interface EmbeddingListResponse {
  embeddings: EmbeddingResponse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Type guard for embedding list response
export function isEmbeddingListResponse(obj: unknown): obj is EmbeddingListResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'embeddings' in obj &&
    'pagination' in obj &&
    Array.isArray((obj as EmbeddingListResponse).embeddings)
  )
}

// Search result response types
export interface SearchResults {
  results: Array<{
    id: number
    uri: string
    text: string
    score: number
    model_name: string
    embedding: number[]
    created_at: string
  }>
  query: string
  metric?: string
  model_name?: string
}

// Generic API response validation
export function isEmbeddingResponse(obj: unknown): obj is EmbeddingResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'uri' in obj &&
    'text' in obj &&
    'model_name' in obj &&
    'embedding' in obj &&
    'created_at' in obj &&
    typeof (obj as EmbeddingResponse).id === 'number' &&
    typeof (obj as EmbeddingResponse).uri === 'string' &&
    typeof (obj as EmbeddingResponse).text === 'string' &&
    typeof (obj as EmbeddingResponse).model_name === 'string' &&
    Array.isArray((obj as EmbeddingResponse).embedding) &&
    typeof (obj as EmbeddingResponse).created_at === 'string'
  )
}

export function isCreateEmbeddingResponse(obj: unknown): obj is CreateEmbeddingResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'uri' in obj &&
    'model_name' in obj &&
    'message' in obj &&
    typeof (obj as CreateEmbeddingResponse).id === 'number' &&
    typeof (obj as CreateEmbeddingResponse).uri === 'string' &&
    typeof (obj as CreateEmbeddingResponse).model_name === 'string' &&
    typeof (obj as CreateEmbeddingResponse).message === 'string'
  )
}

export function isOpenAPISpec(obj: unknown): obj is OpenAPISpec {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'openapi' in obj &&
    'info' in obj &&
    'paths' in obj &&
    typeof (obj as OpenAPISpec).openapi === 'string' &&
    typeof (obj as OpenAPISpec).info === 'object' &&
    typeof (obj as OpenAPISpec).paths === 'object'
  )
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as ErrorResponse).error === 'string'
  )
}

export function isValidationErrorResponse(obj: unknown): obj is ValidationErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'error' in obj &&
    (obj as ValidationErrorResponse).success === false
  )
}

// Helper for safe JSON parsing
export async function parseJsonResponse<T>(
  response: Response,
  guard: (obj: unknown) => obj is T
): Promise<T> {
  const responseBody = await response.text()

  try {
    const data: unknown = JSON.parse(responseBody)
    if (guard(data)) {
      return data
    }
    throw new Error(`Response does not match expected type: ${JSON.stringify(data)}`)
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}. Response body: ${responseBody.substring(0, 200)}...`)
  }
}

// Helper for unknown JSON responses where we need to check properties
export async function parseUnknownJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const responseBody = await response.text()

  try {
    const data: unknown = JSON.parse(responseBody)
    if (typeof data === 'object' && data !== null) {
      return data as Record<string, unknown>
    }
    throw new Error(`Response is not an object: ${typeof data}`)
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}. Response body: ${responseBody.substring(0, 200)}...`)
  }
}