import type { Context } from "hono"

/**
 * Type guard to check if error has a _tag property (Effect tagged error)
 */
function hasTag(error: unknown): error is { _tag: string; message: string } {
  return typeof error === "object" && error !== null && "_tag" in error && "message" in error
}

/**
 * Centralized error response handler for API endpoints
 * Uses type-based error detection with Effect's tagged errors for type safety
 */
export function handleErrorResponse(c: Context, error: unknown, operation: string) {
  console.error(`Error in ${operation}:`, error)

  // Type-safe error handling using Effect's tagged errors
  if (hasTag(error)) {
    switch (error._tag) {
      // Provider authentication errors (401 Unauthorized)
      case "ProviderAuthenticationError":
        return c.json({
          error: "Authentication failed",
          details: error.message
        }, 401)

      // Provider rate limiting errors (429 Too Many Requests)
      case "ProviderRateLimitError":
        return c.json({
          error: "Rate limit exceeded",
          details: error.message
        }, 429)

      // Provider model errors (404 Not Found or 400 Bad Request)
      case "ProviderModelError":
        return c.json({
          error: "Model error",
          details: error.message
        }, 404)

      // Provider connection errors (503 Service Unavailable)
      case "ProviderConnectionError":
        return c.json({
          error: "Service connection error",
          details: error.message
        }, 503)

      // Database errors (500 Internal Server Error)
      case "DatabaseError":
      case "DatabaseConnectionError":
      case "DatabaseQueryError":
        return c.json({
          error: "Database error",
          details: error.message
        }, 500)

      // Embedding data parsing errors (400 Bad Request)
      case "EmbeddingDataParseError":
        return c.json({
          error: "Invalid embedding data",
          details: error.message
        }, 400)
    }
  }

  // Fallback to string-based detection for non-Effect errors (Zod, etc.)
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