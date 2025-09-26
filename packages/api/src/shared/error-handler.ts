import type { Context } from "hono"

/**
 * Centralized error response handler for API endpoints
 * Maps different error types to appropriate HTTP status codes and responses
 */
export function handleErrorResponse(c: Context, error: unknown, operation: string) {
  console.error(`Error in ${operation}:`, error)

  const errorString = String(error)

  // Validation errors (400 Bad Request)
  if (errorString.includes("ValidationError") ||
      errorString.includes("required") ||
      errorString.includes("invalid")) {
    return c.json({ error: "Validation error", details: errorString }, 400)
  }

  // Not found errors (404 Not Found)
  if (errorString.includes("NotFound") ||
      errorString.includes("not found")) {
    return c.json({ error: "Resource not found", details: errorString }, 404)
  }

  // Authentication errors (401 Unauthorized)
  if (errorString.includes("Unauthorized") ||
      errorString.includes("authentication")) {
    return c.json({ error: "Unauthorized", details: errorString }, 401)
  }

  // Rate limiting errors (429 Too Many Requests)
  if (errorString.includes("RateLimit") ||
      errorString.includes("rate limit")) {
    return c.json({ error: "Rate limit exceeded", details: errorString }, 429)
  }

  // Default to internal server error (500)
  return c.json({ error: "Internal server error", details: errorString }, 500)
}

/**
 * Generic error handler for Effect-based operations
 * Handles the common pattern of running Effect programs and catching errors
 * Returns the result directly for OpenAPI type compatibility
 */
export async function withErrorHandling<T>(
  c: Context,
  operation: string,
  effectRunner: () => Promise<T>
): Promise<T | Response> {
  try {
    const result = await effectRunner()
    return result
  } catch (error) {
    return handleErrorResponse(c, error, operation)
  }
}

/**
 * Wrapper for simple Effect operations that should always return JSON
 * This version handles the c.json() call internally for better type safety
 */
export async function withJsonResponse<T>(
  c: Context,
  operation: string,
  effectRunner: () => Promise<T>
): Promise<Response> {
  try {
    const result = await effectRunner()
    return c.json(result, 200)
  } catch (error) {
    return handleErrorResponse(c, error, operation)
  }
}