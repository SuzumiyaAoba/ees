import { createRoute } from "@hono/zod-openapi"
import {
  CreateEmbeddingRequestSchema,
  CreateEmbeddingResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

// Create embedding route
export const createEmbeddingRoute = createRoute({
  method: "post",
  path: "/embeddings",
  tags: ["Embeddings"],
  summary: "Create a new embedding",
  description: "Generate and store an embedding for the provided text content",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateEmbeddingRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Embedding created successfully",
      content: {
        "application/json": {
          schema: CreateEmbeddingResponseSchema,
        },
      },
    },
  }),
})
