// Core visualization types for the domain

export type ReductionMethod = "pca" | "tsne" | "umap"

export type VisualizationDimensions = 2 | 3

export interface VisualizationPoint {
  id: number
  uri: string
  model_name: string
  coordinates: number[]
  text_preview?: string
}

export interface VisualizeEmbeddingRequest {
  model_name?: string
  method: ReductionMethod
  dimensions: VisualizationDimensions
  limit?: number
  perplexity?: number
  n_neighbors?: number
  min_dist?: number
  include_uris?: string[] // URIs that must be included in the visualization
}

export interface VisualizeEmbeddingResponse {
  points: VisualizationPoint[]
  method: ReductionMethod
  dimensions: VisualizationDimensions
  total_points: number
  parameters: {
    perplexity?: number
    n_neighbors?: number
    min_dist?: number
  }
}
