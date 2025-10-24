import { z } from "@hono/zod-openapi"
import { TaskTypeSchema } from "@/entities/embedding/model/openapi"

// Request schemas
export const CreateUploadDirectoryRequestSchema = z
  .object({
    name: z.string().min(1, "Name is required").openapi({
      description: "User-friendly name for the directory",
      example: "Documentation",
    }),
    path: z.string().min(1, "Path is required").openapi({
      description: "Absolute path to the directory",
      example: "/Users/username/Documents",
    }),
    model_name: z.string().optional().default("nomic-embed-text").openapi({
      description: "Default embedding model for this directory",
      example: "nomic-embed-text",
    }),
    task_types: z.array(TaskTypeSchema).optional().openapi({
      description: "Task types to generate for each file in the directory",
      example: ["retrieval_document", "clustering"],
    }),
    description: z.string().optional().openapi({
      description: "Optional description of the directory",
      example: "Project documentation and guides",
    }),
  })
  .openapi("CreateUploadDirectoryRequest")

export const UpdateUploadDirectoryRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "User-friendly name for the directory",
      example: "Updated Documentation",
    }),
    model_name: z.string().optional().openapi({
      description: "Default embedding model for this directory",
      example: "nomic-embed-text",
    }),
    description: z.string().optional().openapi({
      description: "Optional description of the directory",
      example: "Updated project documentation",
    }),
  })
  .openapi("UpdateUploadDirectoryRequest")

export const IdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .openapi({
      param: { name: "id", in: "path" },
      description: "Directory ID",
      example: "1",
    }),
})

// Response schemas
export const UploadDirectorySchema = z
  .object({
    id: z.number().openapi({
      description: "Unique identifier",
      example: 1,
    }),
    name: z.string().openapi({
      description: "User-friendly name",
      example: "Documentation",
    }),
    path: z.string().openapi({
      description: "Absolute path to directory",
      example: "/Users/username/Documents",
    }),
    model_name: z.string().openapi({
      description: "Default embedding model",
      example: "nomic-embed-text",
    }),
    task_types: z.array(z.string()).nullable().openapi({
      description: "Task types to generate for each file",
      example: ["retrieval_document", "clustering"],
    }),
    description: z.string().nullable().openapi({
      description: "Optional description",
      example: "Project documentation",
    }),
    last_synced_at: z.string().nullable().openapi({
      description: "Last sync timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
    created_at: z.string().nullable().openapi({
      description: "Creation timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
    updated_at: z.string().nullable().openapi({
      description: "Last update timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
  })
  .openapi("UploadDirectory")

export const CreateUploadDirectoryResponseSchema = z
  .object({
    id: z.number().openapi({
      description: "ID of created directory",
      example: 1,
    }),
    message: z.string().openapi({
      description: "Success message",
      example: "Upload directory created successfully",
    }),
  })
  .openapi("CreateUploadDirectoryResponse")

export const UploadDirectoryListResponseSchema = z
  .object({
    directories: z.array(UploadDirectorySchema).openapi({
      description: "List of upload directories",
    }),
    count: z.number().openapi({
      description: "Number of directories",
      example: 5,
    }),
  })
  .openapi("UploadDirectoryListResponse")

export const SyncUploadDirectoryResponseSchema = z
  .object({
    directory_id: z.number().openapi({
      description: "ID of synced directory",
      example: 1,
    }),
    files_processed: z.number().openapi({
      description: "Number of files processed",
      example: 10,
    }),
    files_created: z.number().openapi({
      description: "Number of new embeddings created",
      example: 5,
    }),
    files_updated: z.number().openapi({
      description: "Number of embeddings updated",
      example: 3,
    }),
    files_failed: z.number().openapi({
      description: "Number of files that failed to process",
      example: 2,
    }),
    files: z.array(z.string()).openapi({
      description: "List of files that were collected for processing",
      example: ["file1.txt", "file2.md", "docs/readme.md"],
    }),
    message: z.string().openapi({
      description: "Success message",
      example: "Directory synced successfully",
    }),
  })
  .openapi("SyncUploadDirectoryResponse")

export const DeleteUploadDirectoryResponseSchema = z
  .object({
    message: z.string().openapi({
      description: "Success message",
      example: "Upload directory deleted successfully",
    }),
  })
  .openapi("DeleteUploadDirectoryResponse")

// Error schemas
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Error message",
      example: "Failed to create upload directory",
    }),
  })
  .openapi("ErrorResponse")

export const NotFoundResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Not found error message",
      example: "Upload directory not found",
    }),
  })
  .openapi("NotFoundResponse")
