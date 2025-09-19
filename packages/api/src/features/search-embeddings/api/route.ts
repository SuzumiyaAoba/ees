import { createRoute } from "@hono/zod-openapi"
import {
  ErrorResponseSchema,
  SearchEmbeddingRequestSchema,
  SearchEmbeddingResponseSchema,
} from "@ees/core"

// Search embeddings route
export const searchEmbeddingsRoute = createRoute({
  method: "post",
  path: "/embeddings/search",
  tags: ["Embeddings"],
  summary: "Search for similar embeddings",
  description: "Find embeddings similar to the provided query text",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SearchEmbeddingRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: SearchEmbeddingResponseSchema,
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
