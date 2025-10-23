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

export const ClusteringMethodSchema = z
  .enum(["kmeans", "dbscan", "hierarchical"])
  .openapi({
    description: "Clustering algorithm",
    example: "kmeans",
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
      description: "URIs that must be included in the visualization. These are added on top of the limit (e.g., limit=100 + 1 include_uri = 101 total points)",
      example: ["temp://input-123456"],
    }),
    clustering: z
      .object({
        enabled: z.boolean().openapi({
          description: "Enable automatic clustering",
          example: true,
        }),
        method: ClusteringMethodSchema.openapi({
          description: "Clustering algorithm to use",
          example: "kmeans",
        }),
        n_clusters: z.number().int().min(2).max(20).optional().openapi({
          description: "Number of clusters for K-means and Hierarchical (2-20, ignored for DBSCAN and when auto_clusters is true)",
          example: 5,
        }),
        eps: z.number().min(0.1).max(10).optional().openapi({
          description: "Epsilon parameter for DBSCAN (ignored for K-means and Hierarchical)",
          example: 0.5,
        }),
        min_samples: z.number().int().min(1).max(50).optional().openapi({
          description: "Minimum samples parameter for DBSCAN (ignored for K-means and Hierarchical)",
          example: 5,
        }),
        auto_clusters: z.boolean().optional().openapi({
          description: "Use BIC to automatically determine optimal number of clusters (K-means and Hierarchical only)",
          example: true,
        }),
        min_clusters: z.number().int().min(2).max(20).optional().openapi({
          description: "Minimum number of clusters to test when using BIC (default: 2)",
          example: 2,
        }),
        max_clusters: z.number().int().min(2).max(20).optional().openapi({
          description: "Maximum number of clusters to test when using BIC (default: 10)",
          example: 10,
        }),
      })
      .optional()
      .openapi({
        description: "Clustering configuration",
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
    cluster: z.number().optional().openapi({
      description: "Cluster ID assigned by clustering algorithm (-1 for noise points in DBSCAN)",
      example: 0,
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
    clustering: z
      .object({
        method: ClusteringMethodSchema.openapi({
          description: "Clustering algorithm used",
        }),
        n_clusters: z.number().openapi({
          description: "Number of clusters found",
          example: 5,
        }),
        parameters: z
          .object({
            n_clusters: z.number().optional().openapi({
              description: "Number of clusters requested (K-means/Hierarchical)",
            }),
            eps: z.number().optional().openapi({
              description: "Epsilon used (DBSCAN)",
            }),
            min_samples: z.number().optional().openapi({
              description: "Minimum samples used (DBSCAN)",
            }),
          })
          .openapi({
            description: "Parameters used for clustering",
          }),
      })
      .optional()
      .openapi({
        description: "Clustering information",
      }),
    debug_info: z
      .object({
        include_uris_requested: z.array(z.string()).optional().openapi({
          description: "URIs that were requested to be included",
        }),
        include_uris_found: z.number().optional().openapi({
          description: "Number of requested URIs that were found",
        }),
        include_uris_failed: z.array(z.string()).optional().openapi({
          description: "URIs that failed to be fetched",
        }),
      })
      .optional()
      .openapi({
        description: "Debug information for troubleshooting",
      }),
  })
  .openapi("VisualizeEmbeddingResponse")
