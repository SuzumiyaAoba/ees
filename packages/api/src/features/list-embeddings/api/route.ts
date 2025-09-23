import { createRoute } from "@hono/zod-openapi"
import {
  EmbeddingQuerySchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  UriParamSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

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
  responses: createResponsesWithErrors({
    200: {
      description: "List of embeddings",
      content: {
        "application/json": {
          schema: EmbeddingsListResponseSchema,
        },
      },
    },
  }),
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
  responses: createResponsesWithErrors({
    200: {
      description: "Embedding details",
      content: {
        "application/json": {
          schema: EmbeddingSchema,
        },
      },
    },
  }),
})
