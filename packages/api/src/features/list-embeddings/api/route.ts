import { createRoute } from "@hono/zod-openapi"
import {
  EmbeddingQuerySchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  ErrorResponseSchema,
  NotFoundResponseSchema,
  UriParamSchema,
} from "@ees/core"

// List embeddings route
export const listEmbeddingsRoute = createRoute({
  method: "get",
  path: "/embeddings",
  tags: ["Embeddings"],
  summary: "List all embeddings",
  description:
    "Retrieve a paginated list of stored embeddings with optional filtering",
  request: {
    query: EmbeddingQuerySchema,
  },
  responses: {
    200: {
      description: "List of embeddings",
      content: {
        "application/json": {
          schema: EmbeddingsListResponseSchema,
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
  },
})

// Get embedding by URI route
export const getEmbeddingByUriRoute = createRoute({
  method: "get",
  path: "/embeddings/{uri}",
  tags: ["Embeddings"],
  summary: "Get embedding by URI",
  description: "Retrieve a specific embedding by its URI identifier",
  request: {
    params: UriParamSchema,
  },
  responses: {
    200: {
      description: "Embedding details",
      content: {
        "application/json": {
          schema: EmbeddingSchema,
        },
      },
    },
    404: {
      description: "Embedding not found",
      content: {
        "application/json": {
          schema: NotFoundResponseSchema,
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
  },
})
