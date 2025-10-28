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
    task_types: z.array(TaskTypeSchema).optional().openapi({
      description: "Task types to generate for each file in the directory",
      example: ["retrieval_document", "clustering"],
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
    job_id: z.number().openapi({
      description: "ID of background sync job",
      example: 1,
    }),
    directory_id: z.number().openapi({
      description: "ID of synced directory",
      example: 1,
    }),
    message: z.string().openapi({
      description: "Success message",
      example: "Sync job started in background. Use job_id to check progress.",
    }),
  })
  .openapi("SyncUploadDirectoryResponse")

export const SyncJobStatusSchema = z
  .object({
    id: z.number().openapi({
      description: "Job ID",
      example: 1,
    }),
    directory_id: z.number().openapi({
      description: "Directory ID",
      example: 1,
    }),
    status: z.enum(["pending", "running", "completed", "failed"]).openapi({
      description: "Current job status",
      example: "running",
    }),
    total_files: z.number().openapi({
      description: "Total files to process",
      example: 10,
    }),
    processed_files: z.number().openapi({
      description: "Number of files processed so far",
      example: 5,
    }),
    created_files: z.number().openapi({
      description: "Number of new embeddings created",
      example: 3,
    }),
    updated_files: z.number().openapi({
      description: "Number of embeddings updated",
      example: 1,
    }),
    failed_files: z.number().openapi({
      description: "Number of files that failed to process",
      example: 1,
    }),
    failed_file_paths: z.string().nullable().openapi({
      description: "JSON array of failed file paths with error messages",
      example: JSON.stringify([{ path: "docs/file.txt", error: "Failed to read file" }]),
    }),
    current_file: z.string().nullable().openapi({
      description: "Currently processing file",
      example: "docs/readme.md",
    }),
    error_message: z.string().nullable().openapi({
      description: "Error message if job failed",
      example: null,
    }),
    started_at: z.string().nullable().openapi({
      description: "Job start timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
    completed_at: z.string().nullable().openapi({
      description: "Job completion timestamp",
      example: null,
    }),
    created_at: z.string().openapi({
      description: "Job creation timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
    updated_at: z.string().openapi({
      description: "Last update timestamp",
      example: "2024-01-01T00:00:00.000Z",
    }),
  })
  .openapi("SyncJobStatus")

export const JobIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .openapi({
      param: { name: "id", in: "path" },
      description: "Directory ID",
      example: "1",
    }),
  job_id: z
    .string()
    .regex(/^\d+$/)
    .openapi({
      param: { name: "job_id", in: "path" },
      description: "Job ID",
      example: "1",
    }),
})

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
