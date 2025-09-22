/**
 * Test helper utilities for E2E API testing
 */

import { expect } from "vitest"

/**
 * Helper function to validate response structure
 */
export function validateResponseStructure(
  response: any,
  expectedStructure: { required: string[]; optional: string[] }
): void {
  // Check that all required fields are present
  expectedStructure.required.forEach(field => {
    expect(response).toHaveProperty(field)
    expect(response[field]).toBeDefined()
  })

  // Check that no unexpected fields are present (only required and optional fields allowed)
  const allowedFields = [...expectedStructure.required, ...expectedStructure.optional]
  Object.keys(response).forEach(field => {
    expect(allowedFields).toContain(field)
  })
}

/**
 * Helper function to validate embedding structure
 */
export function validateEmbeddingStructure(embedding: any): void {
  expect(embedding).toHaveProperty("id")
  expect(embedding).toHaveProperty("uri")
  expect(embedding).toHaveProperty("text")
  expect(embedding).toHaveProperty("model_name")
  expect(embedding).toHaveProperty("embedding")
  expect(embedding).toHaveProperty("created_at")

  expect(typeof embedding.id).toBe("number")
  expect(typeof embedding.uri).toBe("string")
  expect(typeof embedding.text).toBe("string")
  expect(typeof embedding.model_name).toBe("string")
  expect(Array.isArray(embedding.embedding)).toBe(true)
  expect(typeof embedding.created_at).toBe("string")

  // Validate embedding vector
  expect(embedding.embedding.length).toBeGreaterThan(0)
  embedding.embedding.forEach((value: any) => {
    expect(typeof value).toBe("number")
  })
}

/**
 * Helper function to validate pagination structure
 */
export function validatePaginationStructure(response: any): void {
  expect(response).toHaveProperty("page")
  expect(response).toHaveProperty("limit")
  expect(response).toHaveProperty("total_pages")
  expect(response).toHaveProperty("has_next")
  expect(response).toHaveProperty("has_prev")

  expect(typeof response.page).toBe("number")
  expect(typeof response.limit).toBe("number")
  expect(typeof response.total_pages).toBe("number")
  expect(typeof response.has_next).toBe("boolean")
  expect(typeof response.has_prev).toBe("boolean")

  expect(response.page).toBeGreaterThan(0)
  expect(response.limit).toBeGreaterThan(0)
  expect(response.total_pages).toBeGreaterThanOrEqual(0)
}

/**
 * Helper function to validate search result structure
 */
export function validateSearchResultStructure(result: any): void {
  expect(result).toHaveProperty("id")
  expect(result).toHaveProperty("uri")
  expect(result).toHaveProperty("text")
  expect(result).toHaveProperty("model_name")
  expect(result).toHaveProperty("similarity")

  expect(typeof result.id).toBe("number")
  expect(typeof result.uri).toBe("string")
  expect(typeof result.text).toBe("string")
  expect(typeof result.model_name).toBe("string")
  expect(typeof result.similarity).toBe("number")

  // Similarity should be between 0 and 1 for cosine similarity
  expect(result.similarity).toBeGreaterThanOrEqual(0)
  expect(result.similarity).toBeLessThanOrEqual(1)
}

/**
 * Helper function to validate error response structure
 */
export function validateErrorResponse(response: any): void {
  expect(response).toHaveProperty("error")
  expect(typeof response.error).toBe("string")
  expect(response.error.length).toBeGreaterThan(0)
}

/**
 * Helper function to measure response time
 */
export async function measureResponseTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now()
  const result = await operation()
  const duration = Date.now() - startTime
  return { result, duration }
}

/**
 * Helper function to create unique test URIs
 */
export function createTestUri(prefix: string = "test"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Helper function to wait for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Helper function to retry operations with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (attempt === maxRetries) {
        break
      }

      const delayMs = baseDelay * Math.pow(2, attempt)
      await delay(delayMs)
    }
  }

  throw lastError!
}

/**
 * Helper function to validate HTTP response status and headers
 */
export function validateHttpResponse(
  response: Response,
  expectedStatus: number,
  expectedContentType: string = "application/json"
): void {
  expect(response.status).toBe(expectedStatus)
  expect(response.headers.get("content-type")).toContain(expectedContentType)
}

/**
 * Helper function to clean up test data
 */
export async function cleanupTestData(
  app: any,
  createdEmbeddingIds: number[]
): Promise<void> {
  for (const id of createdEmbeddingIds) {
    try {
      await app.request(`/embeddings/${id}`, { method: "DELETE" })
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup embedding ${id}:`, error)
    }
  }
}

/**
 * Helper function to generate mock file content
 */
export function generateMockFile(
  filename: string,
  content: string,
  mimeType: string = "text/plain"
): File {
  const blob = new Blob([content], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

/**
 * Helper function to validate model information structure
 */
export function validateModelStructure(model: any): void {
  expect(model).toHaveProperty("name")
  expect(model).toHaveProperty("provider")
  expect(typeof model.name).toBe("string")
  expect(typeof model.provider).toBe("string")
  expect(model.name.length).toBeGreaterThan(0)
  expect(model.provider.length).toBeGreaterThan(0)
}

/**
 * Helper function to validate batch create response
 */
export function validateBatchCreateResponse(response: any): void {
  expect(response).toHaveProperty("successful")
  expect(response).toHaveProperty("failed")
  expect(response).toHaveProperty("total")
  expect(response).toHaveProperty("results")

  expect(typeof response.successful).toBe("number")
  expect(typeof response.failed).toBe("number")
  expect(typeof response.total).toBe("number")
  expect(Array.isArray(response.results)).toBe(true)

  expect(response.successful).toBeGreaterThanOrEqual(0)
  expect(response.failed).toBeGreaterThanOrEqual(0)
  expect(response.total).toBe(response.successful + response.failed)

  // Validate each result in the batch
  response.results.forEach((result: any) => {
    if (result.success) {
      validateEmbeddingStructure(result.data)
    } else {
      expect(result).toHaveProperty("error")
      expect(typeof result.error).toBe("string")
    }
  })
}