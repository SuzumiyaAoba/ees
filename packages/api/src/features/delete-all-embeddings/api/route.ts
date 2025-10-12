import { createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

// Delete all embeddings response schema
export const DeleteAllEmbeddingsResponseSchema = z.object({
  message: z.string(),
  deleted_count: z.number(),
})

// Delete all embeddings route
export const deleteAllEmbeddingsRoute = createRoute({
  method: "delete",
  path: "/embeddings",
  tags: ["Embeddings"],
  summary: "Delete all embeddings",
  description: "Remove all embeddings from storage",
  responses: createResponsesWithErrors({
    200: {
      description: "All embeddings deleted successfully",
      content: {
        "application/json": {
          schema: DeleteAllEmbeddingsResponseSchema,
        },
      },
    },
  }),
})
