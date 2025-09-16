import { z } from "zod"
import {
  BatchCreateEmbeddingResponseSchema,
  CreateEmbeddingResponseSchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  SearchEmbeddingResponseSchema,
} from "../schemas/openapi"

export class TestResponseParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "TestResponseParseError"
    this.cause = cause
  }
}

/**
 * Safely parse JSON response with Zod schema validation
 * Use this instead of `(await res.json()) as Type`
 */
export async function parseJsonResponse<T>(
  response: Response,
  schema: z.ZodSchema<T>
): Promise<T> {
  let jsonData: unknown

  try {
    jsonData = await response.json()
  } catch (error) {
    throw new TestResponseParseError("Failed to parse response as JSON", error)
  }

  const validation = schema.safeParse(jsonData)
  if (!validation.success) {
    throw new TestResponseParseError(
      `Response validation failed: ${validation.error.message}`,
      validation.error
    )
  }

  return validation.data
}

/**
 * Schema for generic error responses
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
})

/**
 * Schema for delete responses
 */
export const DeleteResponseSchema = z.object({
  message: z.string(),
})

// Re-export commonly used schemas for tests
export {
  CreateEmbeddingResponseSchema,
  BatchCreateEmbeddingResponseSchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  SearchEmbeddingResponseSchema,
}
