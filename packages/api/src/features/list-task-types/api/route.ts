/**
 * List Task Types Route Definition
 * Provides OpenAPI schema for listing supported task types for a model
 */

import { createRoute, z } from "@hono/zod-openapi"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

/**
 * Task type metadata schema
 */
const TaskTypeMetadataSchema = z.object({
  value: z.string().openapi({
    description: "Task type identifier",
    example: "retrieval_query"
  }),
  label: z.string().openapi({
    description: "Human-readable label for the task type",
    example: "Retrieval (Query)"
  }),
  description: z.string().openapi({
    description: "Description of the task type and its use case",
    example: "Document search and information retrieval"
  })
})

/**
 * List task types response schema
 */
const ListTaskTypesResponseSchema = z.object({
  model_name: z.string().openapi({
    description: "Model name that was queried",
    example: "embeddinggemma"
  }),
  task_types: z.array(TaskTypeMetadataSchema).openapi({
    description: "Array of supported task types for the model"
  }),
  count: z.number().openapi({
    description: "Total number of supported task types",
    example: 8
  })
})

/**
 * Query parameter schema
 */
const QueryParamSchema = z.object({
  model: z.string().openapi({
    param: {
      name: "model",
      in: "query",
      required: true,
      description: "Model name to get supported task types for",
      example: "embeddinggemma"
    }
  })
})

/**
 * List supported task types for a model route
 */
export const listTaskTypesRoute = createRoute({
  method: "get",
  path: "/models/task-types",
  summary: "List supported task types for a model",
  description: "Get all supported task types with metadata for a specific embedding model",
  tags: ["Models"],
  request: {
    query: QueryParamSchema
  },
  responses: createResponsesWithErrors({
    200: {
      content: {
        "application/json": {
          schema: ListTaskTypesResponseSchema,
        },
      },
      description: "Successfully retrieved supported task types",
    },
  }),
})

export type ListTaskTypesResponse = z.infer<typeof ListTaskTypesResponseSchema>
export type TaskTypeMetadata = z.infer<typeof TaskTypeMetadataSchema>
