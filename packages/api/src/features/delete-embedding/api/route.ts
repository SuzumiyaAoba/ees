import { createRoute } from "@hono/zod-openapi"
import {
  DeleteEmbeddingResponseSchema,
  IdParamSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

// Delete embedding route
export const deleteEmbeddingRoute = createRoute({
  method: "delete",
  path: "/embeddings/{id}",
  tags: ["Embeddings"],
  summary: "Delete an embedding",
  description: "Remove an embedding from storage by its ID",
  request: {
    params: IdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Embedding deleted successfully",
      content: {
        "application/json": {
          schema: DeleteEmbeddingResponseSchema,
        },
      },
    },
  }),
})
