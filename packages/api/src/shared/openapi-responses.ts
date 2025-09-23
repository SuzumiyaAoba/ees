import { ErrorResponseSchema } from "@ees/core"

/**
 * Common OpenAPI error response definitions
 * Reusable across all API endpoints
 */
export const CommonErrorResponses = {
  400: {
    description: "Validation error",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  404: {
    description: "Resource not found",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  429: {
    description: "Rate limit exceeded",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  500: {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
} as const

/**
 * Helper function to create complete response definitions including common errors
 */
export function createResponsesWithErrors<T extends Record<number, any>>(
  successResponses: T
): T & typeof CommonErrorResponses {
  return {
    ...successResponses,
    ...CommonErrorResponses,
  }
}