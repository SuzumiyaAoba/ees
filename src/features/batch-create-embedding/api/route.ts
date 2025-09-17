import { createRoute } from "@hono/zod-openapi"
import {
  BatchCreateEmbeddingRequestSchema,
  BatchCreateEmbeddingResponseSchema,
  ErrorResponseSchema,
} from "../../../entities/embedding/model/openapi"

// Batch create embedding route
export const batchCreateEmbeddingRoute = createRoute({
  method: "post",
  path: "/embeddings/batch",
  tags: ["Embeddings"],
  summary: "Create multiple embeddings",
  description:
    "Generate and store embeddings for multiple text contents in a single request",
  request: {
    body: {
      content: {
        "application/json": {
          schema: BatchCreateEmbeddingRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Batch embedding creation completed",
      content: {
        "application/json": {
          schema: BatchCreateEmbeddingResponseSchema,
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
