/**
 * Provider Management Route Definitions
 * Provides OpenAPI schemas for provider information and management
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Provider information schema
 */
const ProviderInfoSchema = z.object({
  name: z.string().openapi({
    description: "Provider name",
    example: "ollama"
  }),
  displayName: z.string().optional().openapi({
    description: "Human-readable provider name",
    example: "Ollama"
  }),
  description: z.string().optional().openapi({
    description: "Provider description",
    example: "Local AI model provider"
  }),
  status: z.enum(["online", "offline", "unknown"]).openapi({
    description: "Provider availability status",
    example: "online"
  }),
  version: z.string().optional().openapi({
    description: "Provider version if available",
    example: "0.1.0"
  }),
  modelCount: z.number().optional().openapi({
    description: "Number of available models",
    example: 5
  })
})

/**
 * Provider model information schema
 */
const ProviderModelSchema = z.object({
  name: z.string().openapi({
    description: "Model identifier",
    example: "nomic-embed-text"
  }),
  displayName: z.string().optional().openapi({
    description: "Human-readable model name",
    example: "Nomic Embed Text"
  }),
  provider: z.string().openapi({
    description: "Provider name",
    example: "ollama"
  }),
  dimensions: z.number().optional().openapi({
    description: "Vector dimensions",
    example: 768
  }),
  maxTokens: z.number().optional().openapi({
    description: "Maximum input tokens",
    example: 8192
  }),
  pricePerToken: z.number().optional().openapi({
    description: "Cost per token",
    example: 0.0001
  }),
  size: z.number().optional().openapi({
    description: "Model size in bytes",
    example: 274301440
  }),
  modified_at: z.string().optional().openapi({
    description: "Last modified timestamp",
    example: "2024-01-01T00:00:00Z"
  }),
  digest: z.string().optional().openapi({
    description: "Model digest/hash",
    example: "sha256:abc123"
  })
})

/**
 * Ollama status schema
 */
const OllamaStatusSchema = z.object({
  status: z.enum(["online", "offline"]).openapi({
    description: "Ollama service status",
    example: "online"
  }),
  version: z.string().optional().openapi({
    description: "Ollama version if available",
    example: "0.1.0"
  }),
  models: z.array(z.string()).optional().openapi({
    description: "Available model names",
    example: ["nomic-embed-text", "llama2"]
  }),
  responseTime: z.number().optional().openapi({
    description: "Response time in milliseconds",
    example: 25
  }),
  baseUrl: z.string().optional().openapi({
    description: "Ollama service base URL",
    example: "http://localhost:11434"
  }),
  memory: z.object({
    used: z.number().optional(),
    total: z.number().optional()
  }).optional().openapi({
    description: "Memory usage information"
  })
})

/**
 * Current provider response schema
 */
const CurrentProviderSchema = z.object({
  provider: z.string().openapi({
    description: "Currently active provider name",
    example: "ollama"
  }),
  configuration: z.record(z.string(), z.unknown()).optional().openapi({
    description: "Provider-specific configuration"
  })
})

/**
 * Error response schema
 */
const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    description: "Error message",
    example: "Provider not available"
  })
})

/**
 * List providers route
 * Returns all available providers with their status
 */
export const listProvidersRoute = createRoute({
  method: "get",
  path: "/providers",
  summary: "List available providers",
  description: "Get a list of all configured embedding providers with their current status",
  tags: ["Providers"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(ProviderInfoSchema),
        },
      },
      description: "List of available providers",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Get current provider route
 * Returns the currently active provider
 */
export const getCurrentProviderRoute = createRoute({
  method: "get",
  path: "/providers/current",
  summary: "Get current provider",
  description: "Get information about the currently active embedding provider",
  tags: ["Providers"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CurrentProviderSchema,
        },
      },
      description: "Current provider information",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * List provider models route
 * Returns models available from a specific provider or all providers
 */
export const listProviderModelsRoute = createRoute({
  method: "get",
  path: "/providers/models",
  summary: "List provider models",
  description: "Get models available from providers, optionally filtered by provider name",
  tags: ["Providers"],
  request: {
    query: z.object({
      provider: z.string().optional().openapi({
        description: "Filter by specific provider name",
        example: "ollama"
      })
    })
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(ProviderModelSchema),
        },
      },
      description: "List of available models",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Provider not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
})

/**
 * Get Ollama status route
 * Returns Ollama service status and available models
 */
export const getOllamaStatusRoute = createRoute({
  method: "get",
  path: "/providers/ollama/status",
  summary: "Get Ollama status",
  description: "Check Ollama service status and get list of available models",
  tags: ["Providers"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: OllamaStatusSchema,
        },
      },
      description: "Ollama status information",
    },
    503: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("offline"),
            error: z.string()
          }),
        },
      },
      description: "Ollama service unavailable",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
})

// Export types for use in handlers
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>
export type ProviderModel = z.infer<typeof ProviderModelSchema>
export type OllamaStatus = z.infer<typeof OllamaStatusSchema>
export type CurrentProvider = z.infer<typeof CurrentProviderSchema>