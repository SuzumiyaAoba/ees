import { createRoute } from "@hono/zod-openapi"
import {
  UpdateEmbeddingRequestSchema,
  UpdateEmbeddingResponseSchema,
  IdParamSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

// Update embedding route
export const updateEmbeddingRoute = createRoute({
  method: "put",
  path: "/embeddings/{id}",
  tags: ["Embeddings"],
  summary: "Update an existing embedding",
  description: "Update the text content of an existing embedding and regenerate its vector",
  request: {
    params: IdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateEmbeddingRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Embedding updated successfully",
      content: {
        "application/json": {
          schema: UpdateEmbeddingResponseSchema,
        },
      },
    },
  }),
})
