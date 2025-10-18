import { PCA } from "ml-pca"
import { Effect } from "effect"
import type { VisualizationDimensions } from "@/entities/visualization/model/visualization"

export interface PCAReducerError {
  readonly _tag: "PCAReducerError"
  readonly message: string
}

export const PCAReducerError = (message: string): PCAReducerError => ({
  _tag: "PCAReducerError",
  message,
})

export interface PCAReducedCoordinates {
  coordinates: number[][]
}

/**
 * Performs Principal Component Analysis (PCA) dimensionality reduction
 *
 * PCA is a linear dimensionality reduction technique that:
 * - Preserves global structure and variance
 * - Is deterministic (same input produces same output)
 * - Fast and computationally efficient
 * - Works well for linearly separable data
 *
 * @param vectors - Array of high-dimensional vectors (embeddings)
 * @param dimensions - Target dimensions (2 for 2D, 3 for 3D)
 * @returns Effect that yields reduced coordinates or PCAReducerError
 */
export const reducePCA = (
  vectors: number[][],
  dimensions: VisualizationDimensions
): Effect.Effect<PCAReducedCoordinates, PCAReducerError> =>
  Effect.try({
    try: () => {
      if (vectors.length === 0) {
        throw new Error("No vectors provided for PCA reduction")
      }

      if (vectors.length < dimensions) {
        throw new Error(
          `PCA requires at least ${dimensions} vectors for ${dimensions}D reduction, got ${vectors.length}`
        )
      }

      const pca = new PCA(vectors)
      const reducedVectors = pca.predict(vectors, { nComponents: dimensions })

      return {
        coordinates: reducedVectors.to2DArray(),
      }
    },
    catch: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown PCA error"
      return PCAReducerError(`PCA reduction failed: ${errorMessage}`)
    },
  })
