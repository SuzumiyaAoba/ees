import { TSNE } from "@keckelt/tsne"
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
 * Seeded random number generator using mulberry32 algorithm
 * Provides deterministic pseudo-random numbers for reproducible results
 */
const createSeededRandom = (seed: number) => {
  let state = seed
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Performs t-SNE (t-Distributed Stochastic Neighbor Embedding) dimensionality reduction
 *
 * t-SNE is a non-linear dimensionality reduction technique that:
 * - Preserves local structure and clusters
 * - Good for visualization of high-dimensional data
 * - Deterministic when using a fixed seed
 * - Slower than PCA, especially for large datasets
 *
 * @param vectors - Array of high-dimensional vectors (embeddings)
 * @param dimensions - Target dimensions (2 for 2D, 3 for 3D)
 * @param perplexity - Perplexity parameter (5-50, default 30)
 * @param seed - Random seed for reproducibility (default 42)
 * @returns Effect that yields reduced coordinates or TSNEReducerError
 */
export const reduceTSNE = (
  vectors: number[][],
  dimensions: VisualizationDimensions,
  perplexity = 30,
  seed = 42
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

      // Temporarily replace Math.random with seeded random for deterministic results
      const originalRandom = Math.random
      const seededRandom = createSeededRandom(seed)
      Math.random = seededRandom

      try {
        const tsne = new TSNE({
          dim: dimensions,
          perplexity: perplexity,
          earlyExaggeration: 4.0,
          learningRate: 100,
          nIter: 1000,
          metric: "euclidean",
        })

        tsne.initDataRaw(vectors)

        for (let i = 0; i < 1000; i++) {
          tsne.step()
        }

        const output = tsne.getSolution()
        return {
          coordinates: output,
        }
      } finally {
        // Restore original Math.random
        Math.random = originalRandom
      }
    },
    catch: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown t-SNE error"
      return TSNEReducerError(`t-SNE reduction failed: ${errorMessage}`)
    },
  })
