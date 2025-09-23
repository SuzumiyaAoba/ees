import { createRoute } from "@hono/zod-openapi"
import {
  SearchEmbeddingRequestSchema,
  SearchEmbeddingResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

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
  responses: createResponsesWithErrors({
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: SearchEmbeddingResponseSchema,
        },
      },
    },
  }),
})
