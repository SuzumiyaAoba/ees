import { z } from "@hono/zod-openapi"

// Request schemas
export const CreateEmbeddingRequestSchema = z
  .object({
    uri: z.string().min(1).openapi({
      description: "Unique identifier for the resource being embedded",
      example: "file://document.txt",
    }),
    text: z.string().min(1).openapi({
      description: "Text content to generate embedding for",
      example: "This is a sample text for embedding generation.",
    }),
    model_name: z.string().optional().default("embeddinggemma:300m").openapi({
      description: "Name of the embedding model to use",
      example: "embeddinggemma:300m",
    }),
  })
  .openapi("CreateEmbeddingRequest")

export const UriParamSchema = z.object({
  uri: z.string().openapi({
    param: { name: "uri", in: "path" },
    description: "URI-encoded resource identifier",
    example: "file%3A%2F%2Fdocument.txt",
  }),
})

export const IdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .openapi({
      param: { name: "id", in: "path" },
      description: "Numeric ID of the embedding",
      example: "123",
    }),
})

export const EmbeddingQuerySchema = z.object({
  uri: z
    .string()
    .optional()
    .openapi({
      param: { name: "uri", in: "query" },
      description: "Filter by URI (exact match)",
      example: "file://document.txt",
    }),
  model_name: z
    .string()
    .optional()
    .openapi({
      param: { name: "model_name", in: "query" },
      description: "Filter by model name (exact match)",
      example: "embeddinggemma:300m",
    }),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val))
    .optional()
    .default(1)
    .openapi({
      param: { name: "page", in: "query" },
      description: "Page number (starts from 1)",
      example: "1",
    }),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val))
    .optional()
    .default(10)
    .openapi({
      param: { name: "limit", in: "query" },
      description: "Number of items per page (max 100)",
      example: "10",
    }),
})

// Response schemas
export const CreateEmbeddingResponseSchema = z
  .object({
    id: z.number().openapi({
      description: "Unique identifier of the created embedding",
      example: 123,
    }),
    uri: z.string().openapi({
      description: "Resource URI",
      example: "file://document.txt",
    }),
    model_name: z.string().openapi({
      description: "Model used for embedding generation",
      example: "embeddinggemma:300m",
    }),
    message: z.string().openapi({
      description: "Success message",
      example: "Embedding created successfully",
    }),
  })
  .openapi("CreateEmbeddingResponse")

export const EmbeddingSchema = z
  .object({
    id: z.number().openapi({
      description: "Unique identifier",
      example: 123,
    }),
    uri: z.string().openapi({
      description: "Resource URI",
      example: "file://document.txt",
    }),
    text: z.string().openapi({
      description: "Original text content",
      example: "This is a sample text for embedding generation.",
    }),
    model_name: z.string().openapi({
      description: "Model used for embedding",
      example: "embeddinggemma:300m",
    }),
    embedding: z.array(z.number()).openapi({
      description: "Embedding vector",
      example: [0.1, 0.2, 0.3, 0.4, 0.5],
    }),
    created_at: z.string().openapi({
      description: "Creation timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
    updated_at: z.string().openapi({
      description: "Last update timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
  })
  .openapi("Embedding")

export const EmbeddingsListResponseSchema = z
  .object({
    embeddings: z.array(EmbeddingSchema).openapi({
      description: "List of embeddings",
    }),
    count: z.number().openapi({
      description: "Total count of embeddings",
      example: 5,
    }),
    page: z.number().openapi({
      description: "Current page number",
      example: 1,
    }),
    limit: z.number().openapi({
      description: "Number of items per page",
      example: 10,
    }),
    total_pages: z.number().openapi({
      description: "Total number of pages",
      example: 3,
    }),
    has_next: z.boolean().openapi({
      description: "Whether there is a next page",
      example: true,
    }),
    has_prev: z.boolean().openapi({
      description: "Whether there is a previous page",
      example: false,
    }),
  })
  .openapi("EmbeddingsListResponse")

export const DeleteEmbeddingResponseSchema = z
  .object({
    message: z.string().openapi({
      description: "Success message",
      example: "Embedding deleted successfully",
    }),
  })
  .openapi("DeleteEmbeddingResponse")

// Error schemas
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Error message",
      example: "Failed to create embedding",
    }),
  })
  .openapi("ErrorResponse")

export const NotFoundResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Not found error message",
      example: "Embedding not found",
    }),
  })
  .openapi("NotFoundResponse")

export const ValidationErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Validation error message",
      example: "Invalid ID parameter",
    }),
  })
  .openapi("ValidationErrorResponse")
