import { createRoute } from "@hono/zod-openapi"
import {
  VisualizeEmbeddingRequestSchema,
  VisualizeEmbeddingResponseSchema,
} from "@ees/core"
import { createResponsesWithErrors } from "@/shared/openapi-responses"

/**
 * Visualize embeddings route
 * Performs dimensionality reduction (PCA, t-SNE, or UMAP) on stored embeddings for 2D/3D visualization
 */
export const visualizeEmbeddingsRoute = createRoute({
  method: "post",
  path: "/embeddings/visualize",
  tags: ["Embeddings"],
  summary: "Visualize embeddings with dimensionality reduction",
  description: "Reduce high-dimensional embeddings to 2D/3D coordinates using PCA, t-SNE, or UMAP for visualization purposes",
  request: {
    body: {
      content: {
        "application/json": {
          schema: VisualizeEmbeddingRequestSchema,
        },
      },
    },
  },
  responses: createResponsesWithErrors({
    200: {
      description: "Visualization data with reduced coordinates",
      content: {
        "application/json": {
          schema: VisualizeEmbeddingResponseSchema,
        },
      },
    },
  }),
})
