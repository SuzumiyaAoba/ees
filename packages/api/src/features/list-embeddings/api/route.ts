import { createRoute } from "@hono/zod-openapi"
import {
  EmbeddingQuerySchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  UriModelParamSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"
import { z } from "zod"

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

// Get embedding by URI and model name route
export const getEmbeddingByUriRoute = createRoute({
  method: "get",
  path: "/embeddings/{uri}/{model_name}",
  tags: ["Embeddings"],
  summary: "Get embedding by URI and model name",
  description: "Retrieve a specific embedding by its URI identifier and model name",
  request: {
    params: UriModelParamSchema,
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

// List distinct model names present in DB (for browse filter)
export const listEmbeddingModelsRoute = createRoute({
  method: "get",
  path: "/embeddings/models",
  tags: ["Embeddings"],
  summary: "List distinct model names",
  description: "Return distinct model names present in the embeddings database for filtering",
  responses: createResponsesWithErrors({
    200: {
      description: "List of distinct model names",
      content: {
        "application/json": {
          schema: z.object({ models: z.array(z.string()) }),
        },
      },
    },
  }),
})
