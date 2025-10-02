/**
 * Test helper utilities for E2E API testing
 */

import { expect } from "vitest"

/**
 * Helper function to validate response structure
 */
export function validateResponseStructure(
  response: unknown,
  expectedStructure: { required: string[]; optional: string[] }
): void {
  const resp = response as Record<string, unknown>

  // Check that all required fields are present
  expectedStructure.required.forEach(field => {
    expect(resp).toHaveProperty(field)
    expect(resp[field]).toBeDefined()
  })

  // Check that no unexpected fields are present (only required and optional fields allowed)
  const allowedFields = [...expectedStructure.required, ...expectedStructure.optional]
  Object.keys(resp).forEach(field => {
    expect(allowedFields).toContain(field)
  })
}

/**
 * Helper function to validate embedding structure
 */
export function validateEmbeddingStructure(embedding: unknown): void {
  const emb = embedding as Record<string, unknown>

  expect(emb).toHaveProperty("id")
  expect(emb).toHaveProperty("uri")
  expect(emb).toHaveProperty("text")
  expect(emb).toHaveProperty("model_name")
  expect(emb).toHaveProperty("embedding")
  expect(emb).toHaveProperty("created_at")

  expect(typeof emb["id"]).toBe("number")
  expect(typeof emb["uri"]).toBe("string")
  expect(typeof emb["text"]).toBe("string")
  expect(typeof emb["model_name"]).toBe("string")
  expect(Array.isArray(emb["embedding"])).toBe(true)
  expect(typeof emb["created_at"]).toBe("string")

  // Validate embedding vector
  const embVector = emb["embedding"] as unknown[]
  expect(embVector.length).toBeGreaterThan(0)
  embVector.forEach((value: unknown) => {
    expect(typeof value).toBe("number")
  })
}

/**
 * Helper function to validate pagination structure
 */
export function validatePaginationStructure(response: unknown): void {
  const resp = response as Record<string, unknown>

  expect(resp).toHaveProperty("page")
  expect(resp).toHaveProperty("limit")
  expect(resp).toHaveProperty("total_pages")
  expect(resp).toHaveProperty("has_next")
  expect(resp).toHaveProperty("has_prev")

  expect(typeof resp["page"]).toBe("number")
  expect(typeof resp["limit"]).toBe("number")
  expect(typeof resp["total_pages"]).toBe("number")
  expect(typeof resp["has_next"]).toBe("boolean")
  expect(typeof resp["has_prev"]).toBe("boolean")

  expect(resp["page"] as number).toBeGreaterThan(0)
  expect(resp["limit"] as number).toBeGreaterThan(0)
  expect(resp["total_pages"] as number).toBeGreaterThanOrEqual(0)
}

/**
 * Helper function to validate search result structure
 */
export function validateSearchResultStructure(result: unknown): void {
  const res = result as Record<string, unknown>

  expect(res).toHaveProperty("id")
  expect(res).toHaveProperty("uri")
  expect(res).toHaveProperty("text")
  expect(res).toHaveProperty("model_name")
  expect(res).toHaveProperty("similarity")

  expect(typeof res["id"]).toBe("number")
  expect(typeof res["uri"]).toBe("string")
  expect(typeof res["text"]).toBe("string")
  expect(typeof res["model_name"]).toBe("string")
  expect(typeof res["similarity"]).toBe("number")

  // Similarity should be between 0 and 1 for cosine similarity
  expect(res["similarity"] as number).toBeGreaterThanOrEqual(0)
  expect(res["similarity"] as number).toBeLessThanOrEqual(1)
}

/**
 * Helper function to validate error response structure
 */
export function validateErrorResponse(response: unknown): void {
  const resp = response as Record<string, unknown>

  expect(resp).toHaveProperty("error")
  expect(typeof resp["error"]).toBe("string")
  expect((resp["error"] as string).length).toBeGreaterThan(0)
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
  app: { request: (path: string, options: { method: string }) => Promise<Response> },
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
export function validateModelStructure(model: unknown): void {
  const mod = model as Record<string, unknown>

  expect(mod).toHaveProperty("name")
  expect(mod).toHaveProperty("provider")
  expect(typeof mod["name"]).toBe("string")
  expect(typeof mod["provider"]).toBe("string")
  expect((mod["name"] as string).length).toBeGreaterThan(0)
  expect((mod["provider"] as string).length).toBeGreaterThan(0)
}

/**
 * Helper function to validate batch create response
 */
export function validateBatchCreateResponse(response: unknown): void {
  const resp = response as Record<string, unknown>

  expect(resp).toHaveProperty("successful")
  expect(resp).toHaveProperty("failed")
  expect(resp).toHaveProperty("total")
  expect(resp).toHaveProperty("results")

  expect(typeof resp["successful"]).toBe("number")
  expect(typeof resp["failed"]).toBe("number")
  expect(typeof resp["total"]).toBe("number")
  expect(Array.isArray(resp["results"])).toBe(true)

  expect(resp["successful"] as number).toBeGreaterThanOrEqual(0)
  expect(resp["failed"] as number).toBeGreaterThanOrEqual(0)
  expect(resp["total"]).toBe((resp["successful"] as number) + (resp["failed"] as number))

  // Validate each result in the batch
  const results = resp["results"] as unknown[]
  results.forEach((result: unknown) => {
    const res = result as Record<string, unknown>
    if (res["success"]) {
      validateEmbeddingStructure(res["data"])
    } else {
      expect(res).toHaveProperty("error")
      expect(typeof res["error"]).toBe("string")
    }
  })
}
