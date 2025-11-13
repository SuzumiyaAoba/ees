/**
 * OpenAPI route definitions for Model Management
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Model configuration schema
 */
export const ModelSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  providerId: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "nomic-embed-text" }),
  displayName: z.string().nullish().openapi({ example: "Nomic Embed Text" }),
  isActive: z.boolean().openapi({ example: true }),
  metadata: z.record(z.string(), z.unknown()).nullish().openapi({ example: null }),
  createdAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
  updatedAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
})

export type Model = z.infer<typeof ModelSchema>

/**
 * Create model request schema
 */
export const CreateModelSchema = z.object({
  providerId: z.number().openapi({ example: 1 }),
  name: z.string().min(1).openapi({ example: "nomic-embed-text" }),
  displayName: z.string().optional().openapi({ example: "Nomic Embed Text" }),
  isActive: z.boolean().optional().default(false).openapi({ example: false }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
})

export type CreateModel = z.infer<typeof CreateModelSchema>

/**
 * Update model request schema
 */
export const UpdateModelSchema = z.object({
  name: z.string().min(1).optional().openapi({ example: "nomic-embed-text-v2" }),
  displayName: z.string().optional().openapi({ example: "Nomic Embed Text V2" }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
})

export type UpdateModel = z.infer<typeof UpdateModelSchema>

/**
 * Models list response schema
 */
export const ModelsListResponseSchema = z.object({
  models: z.array(ModelSchema),
  total: z.number().openapi({ example: 5 }),
})

export type ModelsListResponse = z.infer<typeof ModelsListResponseSchema>

/**
 * Route: List all models
 */
export const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  tags: ["models"],
  summary: "List all model configurations",
  description: "Get a list of all configured models, optionally filtered by provider",
  request: {
    query: z.object({
      providerId: z.string().regex(/^\d+$/, "Provider ID must be a positive integer").transform(Number).optional().openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ModelsListResponseSchema,
        },
      },
      description: "List of models",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Route: Get model by ID
 */
export const getModelRoute = createRoute({
  method: "get",
  path: "/models/{id}",
  tags: ["models"],
  summary: "Get model by ID",
  description: "Get a specific model configuration by its ID",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ModelSchema,
        },
      },
      description: "Model found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Model not found",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Route: Create new model
 */
export const createModelRoute = createRoute({
  method: "post",
  path: "/models",
  tags: ["models"],
  summary: "Create new model configuration",
  description: "Register a new model configuration for a provider",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateModelSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ModelSchema,
        },
      },
      description: "Model created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Invalid request",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Route: Update model
 */
export const updateModelRoute = createRoute({
  method: "patch",
  path: "/models/{id}",
  tags: ["models"],
  summary: "Update model configuration",
  description: "Update an existing model configuration",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateModelSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ModelSchema,
        },
      },
      description: "Model updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Model not found",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Route: Delete model
 */
export const deleteModelRoute = createRoute({
  method: "delete",
  path: "/models/{id}",
  tags: ["models"],
  summary: "Delete model configuration",
  description: "Delete a model configuration (cannot delete active model)",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "Model deleted successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Cannot delete active model",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Model not found",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Route: Activate model
 */
export const activateModelRoute = createRoute({
  method: "post",
  path: "/models/{id}/activate",
  tags: ["models"],
  summary: "Activate model",
  description: "Set a model as the active model (deactivates all others)",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "Model activated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Model not found",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Internal server error",
    },
  },
})
