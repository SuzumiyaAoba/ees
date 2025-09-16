import { createRoute } from "@hono/zod-openapi"

// Root endpoint
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
