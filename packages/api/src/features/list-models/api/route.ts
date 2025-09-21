/**
 * List Models Route Definition
 * Provides OpenAPI schema for listing available models from environment config and providers
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Model information schema
 */
const ModelSchema = z.object({
  name: z.string().openapi({
    description: "Model identifier as recognized by the provider",
    example: "nomic-embed-text"
  }),
  displayName: z.string().optional().openapi({
    description: "Human-readable display name",
    example: "Nomic Embed Text"
  }),
  provider: z.string().openapi({
    description: "Provider that hosts this model",
    example: "ollama"
  }),
  dimensions: z.number().openapi({
    description: "Vector dimensions produced by this model",
    example: 768
  }),
  maxTokens: z.number().optional().openapi({
    description: "Maximum tokens the model can process",
    example: 8192
  }),
  available: z.boolean().openapi({
    description: "Whether the model is currently available",
    example: true
  }),
  description: z.string().optional().openapi({
    description: "Description of the model and its capabilities",
    example: "Ollama model: nomic-embed-text"
  }),
  version: z.string().optional().openapi({
    description: "Model version identifier",
    example: "1.0"
  }),
  languages: z.array(z.string()).optional().openapi({
    description: "Supported languages",
    example: ["en", "es", "fr"]
  }),
  pricePerToken: z.number().optional().openapi({
    description: "Cost per token for API-based providers",
    example: 0.0001
  })
})

/**
 * List models response schema
 */
const ListModelsResponseSchema = z.object({
  models: z.array(ModelSchema).openapi({
    description: "Array of available models"
  }),
  count: z.number().openapi({
    description: "Total number of available models",
    example: 5
  }),
  providers: z.array(z.string()).openapi({
    description: "List of configured providers",
    example: ["ollama", "openai"]
  })
})

/**
 * Error response schema
 */
const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    description: "Error message describing what went wrong",
    example: "Failed to retrieve models from providers"
  })
})

/**
 * List available models route
 * Returns all models available through configured providers
 */
export const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  summary: "List available models",
  description: "Retrieve all available embedding models from configured providers including Ollama and cloud providers",
  tags: ["Models"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ListModelsResponseSchema,
        },
      },
      description: "Successfully retrieved available models",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error - failed to retrieve models",
    },
  },
})

export type ListModelsResponse = z.infer<typeof ListModelsResponseSchema>
export type ModelInfo = z.infer<typeof ModelSchema>