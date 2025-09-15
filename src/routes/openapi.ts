import { createRoute } from "@hono/zod-openapi"
import {
  CreateEmbeddingRequestSchema,
  CreateEmbeddingResponseSchema,
  DeleteEmbeddingResponseSchema,
  EmbeddingQuerySchema,
  EmbeddingSchema,
  EmbeddingsListResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  NotFoundResponseSchema,
  UriParamSchema,
  ValidationErrorResponseSchema,
} from "../schemas/openapi"

// Root endpoint
export const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check endpoint",
  description: "Returns API service information",
  responses: {
    200: {
      description: "API service information",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "EES - Embeddings API Service",
          },
        },
      },
    },
  },
})

// Create embedding
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
      description: "Embedding creation request",
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

// Get embedding by URI
export const getEmbeddingByUriRoute = createRoute({
  method: "get",
  path: "/embeddings/{uri}",
  tags: ["Embeddings"],
  summary: "Get embedding by URI",
  description: "Retrieve a specific embedding by its URI",
  request: {
    params: UriParamSchema,
  },
  responses: {
    200: {
      description: "Embedding retrieved successfully",
      content: {
        "application/json": {
          schema: EmbeddingSchema,
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

// Get all embeddings
export const getAllEmbeddingsRoute = createRoute({
  method: "get",
  path: "/embeddings",
  tags: ["Embeddings"],
  summary: "Get all embeddings",
  description:
    "Retrieve a list of all stored embeddings with optional filtering by URI or model name",
  request: {
    query: EmbeddingQuerySchema,
  },
  responses: {
    200: {
      description: "Embeddings retrieved successfully",
      content: {
        "application/json": {
          schema: EmbeddingsListResponseSchema,
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

// Delete embedding
export const deleteEmbeddingRoute = createRoute({
  method: "delete",
  path: "/embeddings/{id}",
  tags: ["Embeddings"],
  summary: "Delete embedding by ID",
  description: "Delete a specific embedding by its numeric ID",
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
