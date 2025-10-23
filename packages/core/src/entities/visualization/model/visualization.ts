// Core visualization types for the domain

export type ReductionMethod = "pca" | "tsne" | "umap"

export type VisualizationDimensions = 2 | 3

export type ClusteringMethod = "kmeans" | "dbscan" | "hierarchical"

export interface VisualizationPoint {
  id: number
  uri: string
  model_name: string
  coordinates: number[]
  text_preview?: string
  cluster?: number
}

export interface VisualizeEmbeddingRequest {
  model_name?: string
  method: ReductionMethod
  dimensions: VisualizationDimensions
  limit?: number
  perplexity?: number
  n_neighbors?: number
  min_dist?: number
  include_uris?: string[] // URIs that must be included (added on top of limit)
  clustering?: {
    enabled: boolean
    method: ClusteringMethod
    n_clusters?: number // for kmeans and hierarchical
    eps?: number // for DBSCAN
    min_samples?: number // for DBSCAN
    auto_clusters?: boolean // Use BIC to automatically determine n_clusters
    min_clusters?: number // Minimum clusters to test (for BIC)
    max_clusters?: number // Maximum clusters to test (for BIC)
  }
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
  clustering?: {
    method: ClusteringMethod
    n_clusters: number
    parameters: {
      n_clusters?: number
      eps?: number
      min_samples?: number
    }
  }
  debug_info?: {
    include_uris_requested?: string[]
    include_uris_found?: number
    include_uris_failed?: string[]
  }
}
