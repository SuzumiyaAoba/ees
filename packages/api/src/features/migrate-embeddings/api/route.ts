/**
 * Migration Route Definition
 * Provides OpenAPI schema for migrating embeddings between models
 */

import { createRoute, z } from "@hono/zod-openapi"

/**
 * Migration request schema
 */
const MigrationRequestSchema = z.object({
  fromModel: z.string().openapi({
    description: "Source model name to migrate from",
    example: "text-embedding-ada-002"
  }),
  toModel: z.string().openapi({
    description: "Target model name to migrate to",
    example: "nomic-embed-text"
  }),
  options: z.object({
    preserveOriginal: z.boolean().optional().openapi({
      description: "Whether to preserve original embeddings during migration",
      example: false
    }),
    batchSize: z.number().int().min(1).max(1000).optional().openapi({
      description: "Batch size for processing",
      example: 100
    }),
    continueOnError: z.boolean().optional().openapi({
      description: "Whether to continue on individual failures",
      example: true
    }),
    metadata: z.record(z.string(), z.unknown()).optional().openapi({
      description: "Custom metadata to add to migrated embeddings"
    })
  }).optional().openapi({
    description: "Migration configuration options"
  })
})

/**
 * Migration result item schema
 */
const MigrationResultItemSchema = z.object({
  id: z.number().openapi({
    description: "Embedding ID",
    example: 123
  }),
  uri: z.string().openapi({
    description: "Embedding URI",
    example: "document-1"
  }),
  status: z.enum(["success", "error"]).openapi({
    description: "Migration status for this embedding"
  }),
  error: z.string().optional().openapi({
    description: "Error message if migration failed"
  })
})

/**
 * Migration response schema
 */
const MigrationResponseSchema = z.object({
  totalProcessed: z.number().openapi({
    description: "Total number of embeddings processed",
    example: 150
  }),
  successful: z.number().openapi({
    description: "Number of successfully migrated embeddings",
    example: 148
  }),
  failed: z.number().openapi({
    description: "Number of failed migrations",
    example: 2
  }),
  duration: z.number().openapi({
    description: "Migration duration in milliseconds",
    example: 45000
  }),
  details: z.array(MigrationResultItemSchema).openapi({
    description: "Detailed results per embedding"
  })
})

/**
 * Model compatibility check schema
 */
const CompatibilityCheckRequestSchema = z.object({
  sourceModel: z.string().openapi({
    description: "Source model name",
    example: "text-embedding-ada-002"
  }),
  targetModel: z.string().openapi({
    description: "Target model name",
    example: "nomic-embed-text"
  })
})

/**
 * Model compatibility response schema
 */
const CompatibilityResponseSchema = z.object({
  compatible: z.boolean().openapi({
    description: "Whether models are compatible",
    example: true
  }),
  reason: z.string().optional().openapi({
    description: "Reason for incompatibility if applicable",
    example: "Different vector dimensions: 1536 vs 768"
  }),
  similarityScore: z.number().optional().openapi({
    description: "Similarity score between models (0-1)",
    example: 0.85
  })
})

/**
 * Error response schema
 */
const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    description: "Error message describing what went wrong",
    example: "Source model not found"
  })
})

/**
 * Migrate embeddings route
 * Migrates embeddings from one model to another
 */
export const migrateEmbeddingsRoute = createRoute({
  method: "post",
  path: "/models/migrate",
  summary: "Migrate embeddings between models",
  description: "Migrate all embeddings from one model to another, regenerating vectors with the target model",
  tags: ["Models"],
  requestBody: {
    content: {
      "application/json": {
        schema: MigrationRequestSchema as any,
      },
    },
    description: "Migration configuration",
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: MigrationResponseSchema,
        },
      },
      description: "Migration completed successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid request or model incompatibility",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Source or target model not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error during migration",
    },
  },
})

/**
 * Check model compatibility route
 * Validates if models can be migrated between each other
 */
export const checkCompatibilityRoute = createRoute({
  method: "post",
  path: "/models/compatibility",
  summary: "Check model compatibility",
  description: "Validate if embeddings can be migrated between two models",
  tags: ["Models"],
  requestBody: {
    content: {
      "application/json": {
        schema: CompatibilityCheckRequestSchema as any,
      },
    },
    description: "Models to check compatibility for",
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CompatibilityResponseSchema,
        },
      },
      description: "Compatibility check completed",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "One or both models not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error during compatibility check",
    },
  },
})

export type MigrationRequest = z.infer<typeof MigrationRequestSchema>
export type MigrationResponse = z.infer<typeof MigrationResponseSchema>
export type CompatibilityCheckRequest = z.infer<typeof CompatibilityCheckRequestSchema>
export type CompatibilityResponse = z.infer<typeof CompatibilityResponseSchema>