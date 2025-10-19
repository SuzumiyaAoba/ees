import { z } from "@hono/zod-openapi"

// Enums
export const ReductionMethodSchema = z
  .enum(["pca", "tsne", "umap"])
  .openapi({
    description: "Dimensionality reduction algorithm",
    example: "pca",
  })

export const VisualizationDimensionsSchema = z
  .union([z.literal(2), z.literal(3)])
  .openapi({
    description: "Number of dimensions for visualization (2D or 3D)",
    example: 2,
  })

// Request schema
export const VisualizeEmbeddingRequestSchema = z
  .object({
    model_name: z.string().optional().openapi({
      description: "Filter embeddings by model name (optional, visualizes all if not specified)",
      example: "nomic-embed-text",
    }),
    method: ReductionMethodSchema.default("pca"),
    dimensions: VisualizationDimensionsSchema.default(2),
    limit: z.number().int().min(1).max(10000).optional().openapi({
      description: "Maximum number of embeddings to visualize (max 10000)",
      example: 100,
    }),
    perplexity: z.number().min(5).max(50).optional().default(30).openapi({
      description: "Perplexity parameter for t-SNE (typically 5-50, ignored for PCA and UMAP)",
      example: 30,
    }),
    n_neighbors: z.number().int().min(2).max(100).optional().default(15).openapi({
      description: "Number of neighbors for UMAP (typically 2-100, ignored for PCA and t-SNE)",
      example: 15,
    }),
    min_dist: z.number().min(0).max(1).optional().default(0.1).openapi({
      description: "Minimum distance for UMAP (0-1, ignored for PCA and t-SNE)",
      example: 0.1,
    }),
    include_uris: z.array(z.string()).optional().openapi({
      description: "URIs that must be included in the visualization (useful for highlighting specific embeddings)",
      example: ["temp://input-123456"],
    }),
  })
  .openapi("VisualizeEmbeddingRequest")

// Response schemas
export const VisualizationPointSchema = z
  .object({
    id: z.number().openapi({
      description: "Embedding ID",
      example: 123,
    }),
    uri: z.string().openapi({
      description: "Resource URI",
      example: "file://document.txt",
    }),
    model_name: z.string().openapi({
      description: "Model used for embedding",
      example: "nomic-embed-text",
    }),
    coordinates: z.array(z.number()).openapi({
      description: "Reduced dimensional coordinates (2D or 3D)",
      example: [0.15, -0.32],
    }),
    text_preview: z.string().optional().openapi({
      description: "Text preview (first 100 characters)",
      example: "This is a sample text for embedding generation...",
    }),
  })
  .openapi("VisualizationPoint")

export const VisualizeEmbeddingResponseSchema = z
  .object({
    points: z.array(VisualizationPointSchema).openapi({
      description: "Array of visualization points with reduced coordinates",
    }),
    method: ReductionMethodSchema,
    dimensions: VisualizationDimensionsSchema,
    total_points: z.number().openapi({
      description: "Total number of points visualized",
      example: 100,
    }),
    parameters: z
      .object({
        perplexity: z.number().optional().openapi({
          description: "Perplexity used for t-SNE",
          example: 30,
        }),
        n_neighbors: z.number().optional().openapi({
          description: "Number of neighbors used for UMAP",
          example: 15,
        }),
        min_dist: z.number().optional().openapi({
          description: "Minimum distance used for UMAP",
          example: 0.1,
        }),
      })
      .openapi({
        description: "Parameters used for dimensionality reduction",
      }),
  })
  .openapi("VisualizeEmbeddingResponse")
