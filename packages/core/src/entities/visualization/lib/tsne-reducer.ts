import TSNE from "tsne-js"
import { Effect } from "effect"
import type { VisualizationDimensions } from "@/entities/visualization/model/visualization"

export interface TSNEReducerError {
  readonly _tag: "TSNEReducerError"
  readonly message: string
}

export const TSNEReducerError = (message: string): TSNEReducerError => ({
  _tag: "TSNEReducerError",
  message,
})

export interface TSNEReducedCoordinates {
  coordinates: number[][]
}

/**
 * Performs t-SNE (t-Distributed Stochastic Neighbor Embedding) dimensionality reduction
 *
 * t-SNE is a non-linear dimensionality reduction technique that:
 * - Preserves local structure and clusters
 * - Good for visualization of high-dimensional data
 * - Non-deterministic (different runs produce different results)
 * - Slower than PCA, especially for large datasets
 *
 * @param vectors - Array of high-dimensional vectors (embeddings)
 * @param dimensions - Target dimensions (2 for 2D, 3 for 3D)
 * @param perplexity - Perplexity parameter (5-50, default 30)
 * @returns Effect that yields reduced coordinates or TSNEReducerError
 */
export const reduceTSNE = (
  vectors: number[][],
  dimensions: VisualizationDimensions,
  perplexity = 30
): Effect.Effect<TSNEReducedCoordinates, TSNEReducerError> =>
  Effect.try({
    try: () => {
      if (vectors.length === 0) {
        throw new Error("No vectors provided for t-SNE reduction")
      }

      if (vectors.length < perplexity * 3) {
        throw new Error(
          `t-SNE requires at least ${perplexity * 3} vectors for perplexity=${perplexity}, got ${vectors.length}. Consider reducing perplexity or adding more data.`
        )
      }

      const model = new TSNE({
        dim: dimensions,
        perplexity: perplexity,
        earlyExaggeration: 4.0,
        learningRate: 100,
        nIter: 1000,
        metric: "euclidean",
      })

      model.init({
        data: vectors,
        type: "dense",
      })

      model.run()

      const output = model.getOutput()
      return {
        coordinates: output,
      }
    },
    catch: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown t-SNE error"
      return TSNEReducerError(`t-SNE reduction failed: ${errorMessage}`)
    },
  })
