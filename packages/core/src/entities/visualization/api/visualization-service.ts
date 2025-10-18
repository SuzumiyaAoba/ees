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
        limit?: number
      } = {}

      if (request.model_name !== undefined) {
        options.model_name = request.model_name
      }

      if (request.limit !== undefined) {
        options.limit = request.limit
      }

      const listResult = yield* embeddingRepo.findAll(options)

      if (listResult.embeddings.length === 0) {
        yield* Effect.fail(
          VisualizationError("No embeddings found for visualization")
        )
      }

      const minSamplesRequired = getMinSamplesRequired(
        request.method,
        request.dimensions,
        request
      )

      if (listResult.embeddings.length < minSamplesRequired) {
        yield* Effect.fail(
          VisualizationError(
            `Insufficient data for ${request.method.toUpperCase()} visualization. ` +
              `Found ${listResult.embeddings.length} embeddings, need at least ${minSamplesRequired}. ` +
              `Try reducing parameters or adding more data.`
          )
        )
      }

      const vectors = listResult.embeddings.map((emb) => emb.embedding)

      const reduced = yield* performReduction(
        request.method,
        vectors,
        request.dimensions,
        request
      )

      const points: VisualizationPoint[] = listResult.embeddings.map(
        (emb, idx) => ({
          id: emb.id,
          uri: emb.uri,
          model_name: emb.model_name,
          coordinates: reduced.coordinates[idx] ?? [],
          text_preview: emb.text.substring(0, 100),
        })
      )

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
