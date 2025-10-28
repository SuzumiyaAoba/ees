import { createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import {
  CreateUploadDirectoryRequestSchema,
  CreateUploadDirectoryResponseSchema,
  UpdateUploadDirectoryRequestSchema,
  UploadDirectoryIdParamSchema,
  UploadDirectorySchema,
  UploadDirectoryListResponseSchema,
  SyncUploadDirectoryResponseSchema,
  SyncJobStatusSchema,
  JobIdParamSchema,
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
  description: "Start background sync job to scan and process files in the directory",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Background sync job started successfully",
      content: {
        "application/json": {
          schema: SyncUploadDirectoryResponseSchema,
        },
      },
    },
  }),
})

/**
 * Get sync job status route
 */
export const getSyncJobStatusRoute = createRoute({
  method: "get",
  path: "/upload-directories/{id}/sync/jobs/{job_id}",
  tags: ["Upload Directories"],
  summary: "Get sync job status",
  description: "Retrieve the status of a specific sync job",
  request: {
    params: JobIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Sync job status retrieved successfully",
      content: {
        "application/json": {
          schema: SyncJobStatusSchema,
        },
      },
    },
  }),
})

/**
 * Get latest sync job route
 */
export const getLatestSyncJobRoute = createRoute({
  method: "get",
  path: "/upload-directories/{id}/sync/jobs/latest",
  tags: ["Upload Directories"],
  summary: "Get latest sync job",
  description: "Retrieve the latest sync job for a directory",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Latest sync job retrieved successfully",
      content: {
        "application/json": {
          schema: SyncJobStatusSchema,
        },
      },
    },
  }),
})

/**
 * Cancel incomplete sync jobs route
 */
export const cancelIncompleteSyncJobsRoute = createRoute({
  method: "delete",
  path: "/upload-directories/{id}/sync/jobs",
  tags: ["Upload Directories"],
  summary: "Cancel incomplete sync jobs",
  description: "Cancel all pending or running sync jobs for a directory",
  request: {
    params: UploadDirectoryIdParamSchema,
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Incomplete jobs cancelled successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  }),
})
