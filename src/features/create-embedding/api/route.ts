import { createRoute } from "@hono/zod-openapi"
import {
  CreateEmbeddingRequestSchema,
  CreateEmbeddingResponseSchema,
  ErrorResponseSchema,
} from "../../../entities/embedding/model/openapi"

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
  responses: {
    200: {
      description: "Embedding created successfully",
      content: {
        "application/json": {
          schema: CreateEmbeddingResponseSchema,
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
