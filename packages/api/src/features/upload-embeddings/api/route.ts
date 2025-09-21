/**
 * File Upload Route Definition
 * Provides OpenAPI schema for uploading files and generating embeddings
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * File upload response item schema
 */
const UploadResultItemSchema = z.object({
  id: z.number().optional().openapi({
    description: "Embedding ID if successful",
    example: 123
  }),
  uri: z.string().openapi({
    description: "Generated URI for the file content",
    example: "document.txt"
  }),
  status: z.enum(["success", "error"]).openapi({
    description: "Upload processing status"
  }),
  error: z.string().optional().openapi({
    description: "Error message if processing failed",
    example: "Unsupported file type"
  }),
  created_at: z.string().optional().openapi({
    description: "Creation timestamp if successful",
    example: "2024-01-01T00:00:00Z"
  })
})

/**
 * File upload response schema
 */
const UploadResponseSchema = z.object({
  successful: z.number().openapi({
    description: "Number of successfully processed files",
    example: 2
  }),
  failed: z.number().openapi({
    description: "Number of failed file processing",
    example: 1
  }),
  results: z.array(UploadResultItemSchema).openapi({
    description: "Detailed results per file"
  }),
  model_name: z.string().openapi({
    description: "Model used for embedding generation",
    example: "nomic-embed-text"
  }),
  message: z.string().openapi({
    description: "Overall processing message",
    example: "File upload completed successfully"
  })
})

/**
 * Error response schema
 */
const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    description: "Error message describing what went wrong",
    example: "No files provided or invalid file format"
  })
})

/**
 * Upload files route
 * Accepts multipart/form-data with files and optional model specification
 */
export const uploadFilesRoute = createRoute({
  method: "post",
  path: "/embeddings/upload",
  summary: "Upload files and generate embeddings",
  description: "Upload one or more files, extract text content, and automatically generate embeddings",
  tags: ["Embeddings"],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.union([
              z.instanceof(File),
              z.array(z.instanceof(File))
            ]).openapi({
              description: "File(s) to upload and process",
              type: "string",
              format: "binary"
            }),
            model_name: z.string().optional().openapi({
              description: "Optional model name for embedding generation",
              example: "nomic-embed-text"
            })
          })
        }
      },
      description: "Files and optional configuration",
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UploadResponseSchema,
        },
      },
      description: "Files processed successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid request - no files provided or unsupported format",
    },
    413: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "File too large",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error during file processing",
    },
  },
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type UploadResultItem = z.infer<typeof UploadResultItemSchema>