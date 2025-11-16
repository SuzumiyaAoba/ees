import { createRoute } from "@hono/zod-openapi"
import {
  RerankRequestSchema,
  RerankResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

// Reranking route
export const rerankingRoute = createRoute({
  method: "post",
  path: "/rerank",
  tags: ["Reranking"],
  summary: "Rerank documents by relevance to query",
  description: "Rerank a list of documents based on their relevance to a given query using AI-powered reranking models",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RerankRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Reranked results",
      content: {
        "application/json": {
          schema: RerankResponseSchema,
        },
      },
    },
  }),
})
