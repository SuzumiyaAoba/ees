import { createRoute } from "@hono/zod-openapi"
import {
  BatchCreateEmbeddingRequestSchema,
  BatchCreateEmbeddingResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

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
  responses: createResponsesWithErrors({
    200: {
      description: "Batch embedding creation completed",
      content: {
        "application/json": {
          schema: BatchCreateEmbeddingResponseSchema,
        },
      },
    },
  }),
})
