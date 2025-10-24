/**
 * Visualization service for dimensionality reduction of embeddings
 * Supports PCA, t-SNE, and UMAP algorithms for 2D/3D visualization
 */

import { Context, Effect, Layer } from "effect"
import { EmbeddingRepository, EmbeddingRepositoryLive } from "@/entities/embedding/repository/embedding-repository"
import { DatabaseQueryError } from "@/shared/errors/database"
import { reducePCA, PCAReducerError } from "@/entities/visualization/lib/pca-reducer"
import { reduceTSNE, TSNEReducerError } from "@/entities/visualization/lib/tsne-reducer"
import { reduceUMAP, UMAPReducerError } from "@/entities/visualization/lib/umap-reducer"
import { applyClustering } from "@/entities/visualization/lib/clustering"
import type {
  VisualizeEmbeddingRequest,
  VisualizeEmbeddingResponse,
  VisualizationPoint,
  ReductionMethod,
} from "@/entities/visualization/model/visualization"

/**
 * Error type for visualization operations
 */
export interface VisualizationError {
  readonly _tag: "VisualizationError"
  readonly message: string
}

export const VisualizationError = (message: string): VisualizationError => ({
  _tag: "VisualizationError",
  message,
})

/**
 * Visualization service interface
 */
export interface VisualizationService {
  /**
   * Visualize embeddings using dimensionality reduction
   * @param request - Visualization request with method and parameters
   * @returns Effect containing visualization data
   */
  readonly visualizeEmbeddings: (
    request: VisualizeEmbeddingRequest
  ) => Effect.Effect<
    VisualizeEmbeddingResponse,
    | DatabaseQueryError
    | PCAReducerError
    | TSNEReducerError
    | UMAPReducerError
    | VisualizationError
  >
}

export const VisualizationService = Context.GenericTag<VisualizationService>(
  "VisualizationService"
)

/**
 * Implementation of the visualization service
 */
const makeVisualizationService = Effect.gen(function* () {
  const embeddingRepo = yield* EmbeddingRepository

  const visualizeEmbeddings = (
    request: VisualizeEmbeddingRequest
  ): Effect.Effect<
    VisualizeEmbeddingResponse,
    | DatabaseQueryError
    | PCAReducerError
    | TSNEReducerError
    | UMAPReducerError
    | VisualizationError
  > =>
    Effect.gen(function* () {
      const options: {
        model_name?: string
        task_type?: string
        limit?: number
      } = {}

      if (request.model_name !== undefined) {
        options.model_name = request.model_name
      }

      if (request.task_type !== undefined) {
        options.task_type = request.task_type
      }

      if (request.limit !== undefined) {
        options.limit = request.limit
      }

      const listResult = yield* embeddingRepo.findAll(options)

      // Track debug information for include_uris
      const debugInfo: {
        include_uris_requested?: string[]
        include_uris_found?: number
        include_uris_failed?: string[]
      } = {}

      // If include_uris is specified, fetch those embeddings separately and add them
      // Note: include_uris embeddings are added on top of the limit (not counted against it)
      let allEmbeddings = listResult.embeddings
      if (request.include_uris && request.include_uris.length > 0) {
        debugInfo.include_uris_requested = request.include_uris
        // Use explicitly provided model_name or fall back to first embedding's model
        const modelName = request.model_name ?? allEmbeddings[0]?.model_name
        
        if (!modelName) {
          // If no model name available, fail with clear error
          return yield* Effect.fail(
            VisualizationError(
              "Cannot process include_uris: model_name must be specified when no existing embeddings found"
            )
          )
        }

        // Fetch embeddings by URIs that must be included
        const includeEmbeddings = yield* Effect.all(
          request.include_uris.map((uri) =>
            embeddingRepo.findByUri(uri, modelName).pipe(
              Effect.catchAll(() => Effect.succeed(null))
            )
          )
        )

        const successfulFetches = includeEmbeddings.filter(e => e !== null)
        const failedUris = request.include_uris.filter(
          (_uri, idx) => includeEmbeddings[idx] === null
        )
        
        debugInfo.include_uris_found = successfulFetches.length
        debugInfo.include_uris_failed = failedUris

        // Filter out nulls and embeddings already in the list
        const existingUris = new Set(allEmbeddings.map((e) => e.uri))
        const newEmbeddings = includeEmbeddings.filter(
          (e): e is NonNullable<typeof e> => e !== null && !existingUris.has(e.uri)
        )

        // Add include_uris embeddings on top of the existing list
        // This allows limit + include_uris.length total embeddings
        if (newEmbeddings.length > 0) {
          allEmbeddings = [...newEmbeddings, ...allEmbeddings]
        }
      }

      if (allEmbeddings.length === 0) {
        yield* Effect.fail(
          VisualizationError("No embeddings found for visualization")
        )
      }

      const minSamplesRequired = getMinSamplesRequired(
        request.method,
        request.dimensions,
        request
      )

      if (allEmbeddings.length < minSamplesRequired) {
        yield* Effect.fail(
          VisualizationError(
            `Insufficient data for ${request.method.toUpperCase()} visualization. ` +
              `Found ${allEmbeddings.length} embeddings, need at least ${minSamplesRequired}. ` +
              `Try reducing parameters or adding more data.`
          )
        )
      }

      const vectors = allEmbeddings.map((emb) => emb.embedding)

      const reduced = yield* performReduction(
        request.method,
        vectors,
        request.dimensions,
        request
      )

      let points: VisualizationPoint[] = allEmbeddings.map(
        (emb, idx) => ({
          id: emb.id,
          uri: emb.uri,
          model_name: emb.model_name,
          ...(emb.task_type ? { task_type: emb.task_type } : {}),
          coordinates: reduced.coordinates[idx] ?? [],
          text_preview: emb.text.substring(0, 100),
        })
      )

      // Apply clustering if enabled
      let clusteringInfo: VisualizeEmbeddingResponse["clustering"]
      if (request.clustering?.enabled) {
        const params: {
          n_clusters?: number
          eps?: number
          min_samples?: number
          auto_clusters?: boolean
          min_clusters?: number
          max_clusters?: number
        } = {}

        if (request.clustering.n_clusters !== undefined) {
          params.n_clusters = request.clustering.n_clusters
        }
        if (request.clustering.eps !== undefined) {
          params.eps = request.clustering.eps
        }
        if (request.clustering.min_samples !== undefined) {
          params.min_samples = request.clustering.min_samples
        }
        if (request.clustering.auto_clusters !== undefined) {
          params.auto_clusters = request.clustering.auto_clusters
        }
        if (request.clustering.min_clusters !== undefined) {
          params.min_clusters = request.clustering.min_clusters
        }
        if (request.clustering.max_clusters !== undefined) {
          params.max_clusters = request.clustering.max_clusters
        }

        const clusteringResult = applyClustering(
          reduced.coordinates,
          request.clustering.method,
          params
        )

        // Add cluster labels to points
        points = points.map((point, idx) => {
          const label = clusteringResult.labels[idx]
          if (label !== undefined) {
            return { ...point, cluster: label }
          }
          return point
        })

        const clusteringParams: {
          n_clusters?: number
          eps?: number
          min_samples?: number
        } = {}
        if (request.clustering.n_clusters !== undefined) {
          clusteringParams.n_clusters = request.clustering.n_clusters
        }
        if (request.clustering.eps !== undefined) {
          clusteringParams.eps = request.clustering.eps
        }
        if (request.clustering.min_samples !== undefined) {
          clusteringParams.min_samples = request.clustering.min_samples
        }

        clusteringInfo = {
          method: request.clustering.method,
          n_clusters: clusteringResult.n_clusters,
          parameters: clusteringParams,
        }
      }

      const parameters = {
        ...(request.method === "tsne" && { perplexity: request.perplexity }),
        ...(request.method === "umap" && {
          n_neighbors: request.n_neighbors,
          min_dist: request.min_dist,
        }),
      }

      return {
        points,
        method: request.method,
        dimensions: request.dimensions,
        total_points: points.length,
        parameters,
        ...(clusteringInfo && { clustering: clusteringInfo }),
        ...(debugInfo.include_uris_requested && { debug_info: debugInfo }),
      }
    })

  return { visualizeEmbeddings }
})

/**
 * Get minimum samples required for the selected method
 */
const getMinSamplesRequired = (
  method: ReductionMethod,
  dimensions: number,
  request: VisualizeEmbeddingRequest
): number => {
  switch (method) {
    case "pca":
      return dimensions
    case "tsne":
      return (request.perplexity ?? 30) * 3
    case "umap":
      return (request.n_neighbors ?? 15) + 1
  }
}

/**
 * Perform dimensionality reduction based on selected method
 */
const performReduction = (
  method: ReductionMethod,
  vectors: number[][],
  dimensions: 2 | 3,
  request: VisualizeEmbeddingRequest
): Effect.Effect<
  { coordinates: number[][] },
  PCAReducerError | TSNEReducerError | UMAPReducerError
> => {
  switch (method) {
    case "pca":
      return reducePCA(vectors, dimensions)
    case "tsne":
      return reduceTSNE(vectors, dimensions, request.perplexity)
    case "umap":
      return reduceUMAP(
        vectors,
        dimensions,
        request.n_neighbors,
        request.min_dist
      )
  }
}

/**
 * Live layer for visualization service
 */
export const VisualizationServiceLive = Layer.effect(
  VisualizationService,
  makeVisualizationService
).pipe(Layer.provide(EmbeddingRepositoryLive))
