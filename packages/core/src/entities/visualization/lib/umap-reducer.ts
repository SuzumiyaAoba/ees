import { UMAP } from "umap-js"
import { Effect } from "effect"
import type { VisualizationDimensions } from "@/entities/visualization/model/visualization"

export interface UMAPReducerError {
  readonly _tag: "UMAPReducerError"
  readonly message: string
}

export const UMAPReducerError = (message: string): UMAPReducerError => ({
  _tag: "UMAPReducerError",
  message,
})

export interface UMAPReducedCoordinates {
  coordinates: number[][]
}

/**
 * Performs UMAP (Uniform Manifold Approximation and Projection) dimensionality reduction
 *
 * UMAP is a non-linear dimensionality reduction technique that:
 * - Preserves both local and global structure
 * - Faster than t-SNE while maintaining quality
 * - More deterministic than t-SNE
 * - Good balance between speed and quality
 *
 * @param vectors - Array of high-dimensional vectors (embeddings)
 * @param dimensions - Target dimensions (2 for 2D, 3 for 3D)
 * @param nNeighbors - Number of neighbors to consider (2-100, default 15)
 * @param minDist - Minimum distance between points (0-1, default 0.1)
 * @returns Effect that yields reduced coordinates or UMAPReducerError
 */
export const reduceUMAP = (
  vectors: number[][],
  dimensions: VisualizationDimensions,
  nNeighbors = 15,
  minDist = 0.1
): Effect.Effect<UMAPReducedCoordinates, UMAPReducerError> =>
  Effect.try({
    try: () => {
      if (vectors.length === 0) {
        throw new Error("No vectors provided for UMAP reduction")
      }

      if (vectors.length < nNeighbors + 1) {
        throw new Error(
          `UMAP requires at least ${nNeighbors + 1} vectors for nNeighbors=${nNeighbors}, got ${vectors.length}. Consider reducing nNeighbors or adding more data.`
        )
      }

      const umap = new UMAP({
        nComponents: dimensions,
        nNeighbors: nNeighbors,
        minDist: minDist,
        spread: 1.0,
        random: Math.random,
      })

      const embedding = umap.fit(vectors)

      return {
        coordinates: embedding,
      }
    },
    catch: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown UMAP error"
      return UMAPReducerError(`UMAP reduction failed: ${errorMessage}`)
    },
  })
