/**
 * Provider CRUD API Route Definitions
 * Handles database CRUD operations for provider configurations
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Provider schema
 */
export const ProviderSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Local Ollama" }),
  type: z.enum(["ollama", "openai-compatible"]).openapi({ example: "ollama" }),
  baseUrl: z.string().url().openapi({ example: "http://localhost:11434" }),
  apiKey: z.string().nullish().openapi({ example: null }),
  metadata: z.record(z.string(), z.unknown()).nullish().openapi({ example: null }),
  createdAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
  updatedAt: z.string().nullish().openapi({ example: "2024-01-01T00:00:00Z" }),
})

export type Provider = z.infer<typeof ProviderSchema>

/**
 * Create provider request schema
 */
export const CreateProviderSchema = z.object({
  name: z.string().min(1).openapi({ example: "Local Ollama" }),
  type: z.enum(["ollama", "openai-compatible"]).openapi({ example: "ollama" }),
  baseUrl: z.string().url().openapi({ example: "http://localhost:11434" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
})

export type CreateProviderRequest = z.infer<typeof CreateProviderSchema>

/**
 * Update provider request schema
 */
export const UpdateProviderSchema = z.object({
  name: z.string().min(1).optional().openapi({ example: "Updated Ollama" }),
  baseUrl: z.string().url().optional().openapi({ example: "http://localhost:11434" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({ example: {} }),
})

export type UpdateProviderRequest = z.infer<typeof UpdateProviderSchema>

/**
 * Test provider request schema
 */
export const TestProviderSchema = z.object({
  id: z.number().optional().openapi({ example: 1 }),
  baseUrl: z.string().url().optional().openapi({ example: "http://localhost:11434" }),
  apiKey: z.string().optional().openapi({ example: "sk-..." }),
  type: z.enum(["ollama", "openai-compatible"]).optional().openapi({ example: "ollama" }),
})

export type ProviderTestRequest = z.infer<typeof TestProviderSchema>

/**
 * Test provider response schema
 */
export const TestProviderResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "Connection successful" }),
  models: z.array(z.string()).optional().openapi({ example: ["nomic-embed-text"] }),
})

export type ProviderTestResponse = z.infer<typeof TestProviderResponseSchema>

/**
 * Providers list response schema
 */
export const ProvidersListResponseSchema = z.object({
  providers: z.array(ProviderSchema),
  total: z.number().openapi({ example: 5 }),
})

export type ProvidersListResponse = z.infer<typeof ProvidersListResponseSchema>

/**
 * Route: List all providers
 */
export const listProvidersRoute = createRoute({
  method: "get",
  path: "/providers",
  tags: ["providers"],
  summary: "List all provider configurations",
  description: "Get a list of all configured embedding providers",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ProvidersListResponseSchema,
        },
      },
      description: "List of providers",
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
 * Route: Get provider by ID
 */
export const getProviderRoute = createRoute({
  method: "get",
  path: "/providers/{id}",
  tags: ["providers"],
  summary: "Get provider by ID",
  description: "Get a specific provider configuration by its ID",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ProviderSchema,
        },
      },
      description: "Provider found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Provider not found",
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
 * Route: Create provider
 */
export const createProviderRoute = createRoute({
  method: "post",
  path: "/providers",
  tags: ["providers"],
  summary: "Create a new provider",
  description: "Create a new embedding provider configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateProviderSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ProviderSchema,
        },
      },
      description: "Provider created",
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
 * Route: Update provider
 */
export const updateProviderRoute = createRoute({
  method: "patch",
  path: "/providers/{id}",
  tags: ["providers"],
  summary: "Update provider",
  description: "Update an existing provider configuration",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateProviderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ProviderSchema,
        },
      },
      description: "Provider updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Provider not found",
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
 * Route: Delete provider
 */
export const deleteProviderRoute = createRoute({
  method: "delete",
  path: "/providers/{id}",
  tags: ["providers"],
  summary: "Delete provider",
  description: "Delete a provider configuration",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/, "ID must be a positive integer").transform(Number).openapi({ example: "1" }),
    }),
  },
  responses: {
    204: {
      description: "Provider deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Provider not found",
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
 * Route: Test provider
 */
export const testProviderRoute = createRoute({
  method: "post",
  path: "/providers/test",
  tags: ["providers"],
  summary: "Test provider connection",
  description: "Test a provider configuration to verify it works",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TestProviderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TestProviderResponseSchema,
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
      description: "Provider test failed",
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
