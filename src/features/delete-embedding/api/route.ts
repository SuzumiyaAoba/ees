import { createRoute } from "@hono/zod-openapi"
import {
  DeleteEmbeddingResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  NotFoundResponseSchema,
  ValidationErrorResponseSchema,
} from "../../../entities/embedding/model/openapi"

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
  responses: {
    200: {
      description: "Embedding deleted successfully",
      content: {
        "application/json": {
          schema: DeleteEmbeddingResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid ID parameter",
      content: {
        "application/json": {
          schema: ValidationErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Embedding not found",
      content: {
        "application/json": {
          schema: NotFoundResponseSchema,
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
