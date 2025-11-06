/**
 * OpenAPI route definitions for Connection Management
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Connection configuration schema
 */
export const ConnectionSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Local LM Studio" }),
  type: z.enum(["ollama", "openai-compatible"]).openapi({ example: "openai-compatible" }),
  baseUrl: z.string().url().openapi({ example: "http://localhost:1234" }),
  defaultModel: z.string().openapi({ example: "nomic-embed-text" }),
  metadata: z.record(z.string(), z.unknown()).nullish().openapi({ example: null }),
  isActive: z.boolean().openapi({ example: true }),
  createdAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
  updatedAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
})

export type Connection = z.infer<typeof ConnectionSchema>

/**
 * Create connection request schema
 */
export const CreateConnectionSchema = z.object({
  name: z.string().min(1).openapi({ example: "Local LM Studio" }),
  type: z.enum(["ollama", "openai-compatible"]).openapi({ example: "openai-compatible" }),
  baseUrl: z.string().url().openapi({ example: "http://localhost:1234" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  defaultModel: z.string().min(1).openapi({ example: "nomic-embed-text" }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
  isActive: z.boolean().optional().default(false).openapi({ example: false }),
})

export type CreateConnection = z.infer<typeof CreateConnectionSchema>

/**
 * Update connection request schema
 */
export const UpdateConnectionSchema = z.object({
  name: z.string().min(1).optional().openapi({ example: "Updated LM Studio" }),
  baseUrl: z.string().url().optional().openapi({ example: "http://localhost:1234" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  defaultModel: z.string().optional().openapi({ example: "nomic-embed-text" }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
  isActive: z.boolean().optional().openapi({ example: true }),
})

export type UpdateConnection = z.infer<typeof UpdateConnectionSchema>

/**
 * Test connection request schema
 */
export const TestConnectionSchema = z.object({
  id: z.number().optional().openapi({ example: 1 }),
  baseUrl: z.string().url().optional().openapi({ example: "http://localhost:1234" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  type: z.enum(["ollama", "openai-compatible"]).optional().openapi({ example: "openai-compatible" }),
})

export type TestConnection = z.infer<typeof TestConnectionSchema>

/**
 * Test connection response schema
 */
export const TestConnectionResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "Connection successful" }),
  models: z.array(z.string()).optional().openapi({ example: ["nomic-embed-text", "mxbai-embed-large"] }),
})

export type TestConnectionResponse = z.infer<typeof TestConnectionResponseSchema>

/**
 * Connections list response schema
 */
export const ConnectionsListResponseSchema = z.object({
  connections: z.array(ConnectionSchema),
  total: z.number().openapi({ example: 5 }),
})

export type ConnectionsListResponse = z.infer<typeof ConnectionsListResponseSchema>

/**
 * Route: List all connections
 */
export const listConnectionsRoute = createRoute({
  method: "get",
  path: "/connections",
  tags: ["connections"],
  summary: "List all connection configurations",
  description: "Get a list of all configured provider connections",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ConnectionsListResponseSchema,
        },
      },
      description: "List of connections",
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
 * Route: Get connection by ID
 */
export const getConnectionRoute = createRoute({
  method: "get",
  path: "/connections/{id}",
  tags: ["connections"],
  summary: "Get connection by ID",
  description: "Get a specific connection configuration by its ID",
  request: {
    params: z.object({
      id: z.string().transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ConnectionSchema,
        },
      },
      description: "Connection found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Connection not found",
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
 * Route: Get active connection
 */
export const getActiveConnectionRoute = createRoute({
  method: "get",
  path: "/connections/active",
  tags: ["connections"],
  summary: "Get active connection",
  description: "Get the currently active provider connection",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.union([ConnectionSchema, z.null()]),
        },
      },
      description: "Active connection (or null if none)",
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
 * Route: Create connection
 */
export const createConnectionRoute = createRoute({
  method: "post",
  path: "/connections",
  tags: ["connections"],
  summary: "Create a new connection",
  description: "Create a new provider connection configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateConnectionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ConnectionSchema,
        },
      },
      description: "Connection created",
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
 * Route: Update connection
 */
export const updateConnectionRoute = createRoute({
  method: "patch",
  path: "/connections/{id}",
  tags: ["connections"],
  summary: "Update connection",
  description: "Update an existing connection configuration",
  request: {
    params: z.object({
      id: z.string().transform(Number).openapi({ example: "1" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateConnectionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ConnectionSchema,
        },
      },
      description: "Connection updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Connection not found",
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
 * Route: Delete connection
 */
export const deleteConnectionRoute = createRoute({
  method: "delete",
  path: "/connections/{id}",
  tags: ["connections"],
  summary: "Delete connection",
  description: "Delete a connection configuration",
  request: {
    params: z.object({
      id: z.string().transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    204: {
      description: "Connection deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Connection not found",
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
 * Route: Set active connection
 */
export const setActiveConnectionRoute = createRoute({
  method: "post",
  path: "/connections/{id}/activate",
  tags: ["connections"],
  summary: "Set active connection",
  description: "Set a connection as the currently active provider",
  request: {
    params: z.object({
      id: z.string().transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    204: {
      description: "Connection activated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Connection not found",
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
 * Route: Test connection
 */
export const testConnectionRoute = createRoute({
  method: "post",
  path: "/connections/test",
  tags: ["connections"],
  summary: "Test connection",
  description: "Test a connection configuration to verify it works",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TestConnectionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TestConnectionResponseSchema,
        },
      },
      description: "Test result",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string(), success: z.boolean() }),
        },
      },
      description: "Connection test failed",
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
 * Available models response schema
 */
export const AvailableModelsResponseSchema = z.object({
  models: z.array(z.object({
    name: z.string().openapi({ example: "nomic-embed-text" }),
    provider: z.string().openapi({ example: "ollama" }),
    dimensions: z.number().optional().openapi({ example: 768 }),
  })),
})

export type AvailableModelsResponse = z.infer<typeof AvailableModelsResponseSchema>

/**
 * Route: List available models from active connection
 */
export const listAvailableModelsRoute = createRoute({
  method: "get",
  path: "/connections/models",
  tags: ["connections"],
  summary: "List available models",
  description: "Get a list of models available from the currently active connection",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AvailableModelsResponseSchema,
        },
      },
      description: "List of available models",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "No active connection found",
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
