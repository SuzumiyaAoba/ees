import { createRoute } from "@hono/zod-openapi"
import {
  CreateUploadDirectoryRequestSchema,
  CreateUploadDirectoryResponseSchema,
  UpdateUploadDirectoryRequestSchema,
  UploadDirectoryIdParamSchema,
  UploadDirectorySchema,
  UploadDirectoryListResponseSchema,
  SyncUploadDirectoryResponseSchema,
  DeleteUploadDirectoryResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

/**
 * Create upload directory route
 */
export const createUploadDirectoryRoute = createRoute({
  method: "post",
  path: "/upload-directories",
  tags: ["Upload Directories"],
  summary: "Create a new upload directory",
  description: "Register a new directory path for document management and embedding generation",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUploadDirectoryRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Upload directory created successfully",
      content: {
        "application/json": {
          schema: CreateUploadDirectoryResponseSchema,
        },
      },
    },
  }),
})

/**
 * List upload directories route
 */
export const listUploadDirectoriesRoute = createRoute({
  method: "get",
  path: "/upload-directories",
  tags: ["Upload Directories"],
  summary: "List all upload directories",
  description: "Retrieve all registered upload directories with their metadata",
  responses: createResponsesWithErrors({
    200: {
      description: "List of upload directories",
      content: {
        "application/json": {
          schema: UploadDirectoryListResponseSchema,
        },
      },
    },
  }),
})

/**
 * Get upload directory by ID route
 */
export const getUploadDirectoryRoute = createRoute({
  method: "get",
  path: "/upload-directories/{id}",
  tags: ["Upload Directories"],
  summary: "Get upload directory by ID",
  description: "Retrieve a specific upload directory by its ID",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Upload directory details",
      content: {
        "application/json": {
          schema: UploadDirectorySchema,
        },
      },
    },
  }),
})

/**
 * Update upload directory route
 */
export const updateUploadDirectoryRoute = createRoute({
  method: "patch",
  path: "/upload-directories/{id}",
  tags: ["Upload Directories"],
  summary: "Update upload directory",
  description: "Update an existing upload directory's metadata (name, model, description)",
  request: {
    params: UploadDirectoryIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateUploadDirectoryRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Upload directory updated successfully",
      content: {
        "application/json": {
          schema: UploadDirectorySchema,
        },
      },
    },
  }),
})

/**
 * Delete upload directory route
 */
export const deleteUploadDirectoryRoute = createRoute({
  method: "delete",
  path: "/upload-directories/{id}",
  tags: ["Upload Directories"],
  summary: "Delete upload directory",
  description: "Remove an upload directory from the system",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Upload directory deleted successfully",
      content: {
        "application/json": {
          schema: DeleteUploadDirectoryResponseSchema,
        },
      },
    },
  }),
})

/**
 * Sync upload directory route
 */
export const syncUploadDirectoryRoute = createRoute({
  method: "post",
  path: "/upload-directories/{id}/sync",
  tags: ["Upload Directories"],
  summary: "Sync upload directory",
  description: "Scan and process files in the directory, creating or updating embeddings as needed",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Directory synced successfully",
      content: {
        "application/json": {
          schema: SyncUploadDirectoryResponseSchema,
        },
      },
    },
  }),
})
