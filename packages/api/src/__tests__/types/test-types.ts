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
  const data: unknown = await response.json()
  if (guard(data)) {
    return data
  }
  throw new Error(`Response does not match expected type: ${JSON.stringify(data)}`)
}

// Helper for unknown JSON responses where we need to check properties
export async function parseUnknownJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const data: unknown = await response.json()
  if (typeof data === 'object' && data !== null) {
    return data as Record<string, unknown>
  }
  throw new Error(`Response is not an object: ${typeof data}`)
}