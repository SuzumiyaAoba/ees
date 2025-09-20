/**
 * API route definitions for the EES (Embeddings API Service)
 * Contains OpenAPI route specifications for health check and service endpoints
 */

import { createRoute } from "@hono/zod-openapi"

/**
 * Root/health check endpoint route definition
 * Provides basic service status and identification
 */
export const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check endpoint",
  description: "Returns API service information",
  responses: {
    200: {
      description: "API service information",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "EES - Embeddings API Service",
          },
        },
      },
    },
  },
})
