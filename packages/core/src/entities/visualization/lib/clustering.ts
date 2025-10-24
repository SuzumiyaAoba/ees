/**
 * Clustering algorithms for visualization
 * Implements K-means, DBSCAN, and Hierarchical clustering
 */

import type { ClusteringMethod } from "@/entities/visualization/model/visualization"

export interface ClusteringResult {
  labels: number[]
  n_clusters: number
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
 * K-means clustering implementation
 * @param points - Array of data points (each point is an array of coordinates)
 * @param k - Number of clusters
 * @param maxIterations - Maximum number of iterations
 * @param seed - Random seed for reproducibility (default: 42)
 * @returns Cluster labels for each point
 */
export function kmeans(
  points: number[][],
  k: number,
  maxIterations = 100,
  seed = 42,
): ClusteringResult {
  const n = points.length
  const firstPoint = points[0]
  if (!firstPoint) {
    throw new Error("Cannot perform k-means on empty dataset")
  }
  const dim = firstPoint.length

  // Initialize centroids randomly with seeded random
  const seededRandom = createSeededRandom(seed)
  const centroids: number[][] = []
  const usedIndices = new Set<number>()

  for (let i = 0; i < k; i++) {
    let randomIndex: number
    do {
      randomIndex = Math.floor(seededRandom() * n)
    } while (usedIndices.has(randomIndex))
    usedIndices.add(randomIndex)
    const point = points[randomIndex]
    if (!point) {
      throw new Error(`Point at index ${randomIndex} is undefined`)
    }
    centroids.push([...point])
  }

  let labels = new Array<number>(n).fill(0)
  let changed = true
  let iterations = 0

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    // Assignment step
    for (let i = 0; i < n; i++) {
      let minDist = Number.POSITIVE_INFINITY
      let closestCluster = 0
      const point = points[i]
      if (!point) continue

      for (let j = 0; j < k; j++) {
        const centroid = centroids[j]
        if (!centroid) continue
        const dist = euclideanDistance(point, centroid)
        if (dist < minDist) {
          minDist = dist
          closestCluster = j
        }
      }

      if (labels[i] !== closestCluster) {
        labels[i] = closestCluster
        changed = true
      }
    }

    // Update step
    const newCentroids: number[][] = Array.from({ length: k }, () =>
      new Array<number>(dim).fill(0),
    )
    const counts = new Array<number>(k).fill(0)

    for (let i = 0; i < n; i++) {
      const cluster = labels[i]
      const point = points[i]
      if (cluster === undefined || !point) continue
      const count = counts[cluster]
      if (count !== undefined) {
        counts[cluster] = count + 1
      }
      for (let d = 0; d < dim; d++) {
        const coord = point[d]
        const newCentroid = newCentroids[cluster]
        if (coord !== undefined && newCentroid) {
          const currentVal = newCentroid[d]
          if (currentVal !== undefined) {
            newCentroid[d] = currentVal + coord
          }
        }
      }
    }

    for (let j = 0; j < k; j++) {
      const count = counts[j]
      if (count && count > 0) {
        const centroid = centroids[j]
        const newCentroid = newCentroids[j]
        if (centroid && newCentroid) {
          for (let d = 0; d < dim; d++) {
            const newVal = newCentroid[d]
            if (newVal !== undefined) {
              centroid[d] = newVal / count
            }
          }
        }
      }
    }
  }

  return { labels, n_clusters: k }
}

/**
 * DBSCAN clustering implementation
 * @param points - Array of data points
 * @param eps - Maximum distance between two samples
 * @param minSamples - Minimum number of samples in a neighborhood
 * @returns Cluster labels (-1 for noise points)
 */
export function dbscan(
  points: number[][],
  eps: number,
  minSamples: number,
): ClusteringResult {
  const n = points.length
  const labels = new Array<number>(n).fill(-1)
  let clusterId = 0

  for (let i = 0; i < n; i++) {
    const currentLabel = labels[i]
    if (currentLabel !== undefined && currentLabel !== -1) continue

    const neighbors = getNeighbors(points, i, eps)

    if (neighbors.length < minSamples) {
      labels[i] = -1 // Noise point
      continue
    }

    // Start new cluster
    labels[i] = clusterId
    const seeds = [...neighbors]

    for (let j = 0; j < seeds.length; j++) {
      const neighborIdx = seeds[j]
      if (neighborIdx === undefined) continue

      const neighborLabel = labels[neighborIdx]
      if (neighborLabel === undefined) continue

      if (neighborLabel === -1) {
        labels[neighborIdx] = clusterId
      }

      if (neighborLabel !== -1) continue

      labels[neighborIdx] = clusterId

      const neighborNeighbors = getNeighbors(points, neighborIdx, eps)

      if (neighborNeighbors.length >= minSamples) {
        seeds.push(...neighborNeighbors)
      }
    }

    clusterId++
  }

  return { labels, n_clusters: clusterId }
}

/**
 * Hierarchical clustering (agglomerative)
 * @param points - Array of data points
 * @param nClusters - Target number of clusters
 * @returns Cluster labels
 */
export function hierarchical(
  points: number[][],
  nClusters: number,
): ClusteringResult {
  const n = points.length

  // Initialize each point as its own cluster
  const clusters: number[][] = points.map((_, i) => [i])
  const labels = new Array<number>(n).fill(0)

  // Distance matrix
  const distMatrix: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  )

  for (let i = 0; i < n; i++) {
    const pointI = points[i]
    if (!pointI) continue
    for (let j = i + 1; j < n; j++) {
      const pointJ = points[j]
      if (!pointJ) continue
      const dist = euclideanDistance(pointI, pointJ)
      const rowI = distMatrix[i]
      const rowJ = distMatrix[j]
      if (rowI && rowJ) {
        rowI[j] = dist
        rowJ[i] = dist
      }
    }
  }

  // Merge clusters until we have the desired number
  while (clusters.length > nClusters) {
    let minDist = Number.POSITIVE_INFINITY
    let mergeI = 0
    let mergeJ = 1

    // Find closest pair of clusters
    for (let i = 0; i < clusters.length; i++) {
      const clusterI = clusters[i]
      if (!clusterI) continue
      for (let j = i + 1; j < clusters.length; j++) {
        const clusterJ = clusters[j]
        if (!clusterJ) continue
        const dist = clusterDistance(clusterI, clusterJ, distMatrix)
        if (dist < minDist) {
          minDist = dist
          mergeI = i
          mergeJ = j
        }
      }
    }

    // Merge clusters
    const targetCluster = clusters[mergeI]
    const sourceCluster = clusters[mergeJ]
    if (targetCluster && sourceCluster) {
      targetCluster.push(...sourceCluster)
    }
    clusters.splice(mergeJ, 1)
  }

  // Assign labels
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    if (!cluster) continue
    for (const pointIdx of cluster) {
      if (pointIdx !== undefined) {
        labels[pointIdx] = i
      }
    }
  }

  return { labels, n_clusters: nClusters }
}

/**
 * Calculate BIC (Bayesian Information Criterion) for K-means clustering
 * Lower BIC indicates better model fit
 */
export function calculateBIC(
  points: number[][],
  labels: number[],
  k: number,
): number {
  const n = points.length
  const dim = points[0]?.length ?? 0

  // Calculate within-cluster sum of squares
  let wcss = 0
  for (let i = 0; i < n; i++) {
    const point = points[i]
    const label = labels[i]
    if (!point || label === undefined) continue

    // Find centroid of this cluster
    const clusterPoints = points.filter((_, idx) => labels[idx] === label)
    const centroid = new Array<number>(dim).fill(0)

    for (const p of clusterPoints) {
      if (!p) continue
      for (let d = 0; d < dim; d++) {
        const val = p[d]
        const cVal = centroid[d]
        if (val !== undefined && cVal !== undefined) {
          centroid[d] = cVal + val
        }
      }
    }

    for (let d = 0; d < dim; d++) {
      const cVal = centroid[d]
      if (cVal !== undefined) {
        centroid[d] = cVal / clusterPoints.length
      }
    }

    // Calculate squared distance to centroid
    for (let d = 0; d < dim; d++) {
      const pVal = point[d]
      const cVal = centroid[d]
      if (pVal !== undefined && cVal !== undefined) {
        wcss += (pVal - cVal) ** 2
      }
    }
  }

  // Calculate variance estimate
  const variance = wcss / (n - k)

  // Calculate log-likelihood (assuming Gaussian distribution)
  const logLikelihood = -n * Math.log(variance) / 2

  // Number of free parameters: k * dim (centroids) + k (cluster assignments)
  const numParams = k * dim + k

  // BIC = -2 * log(L) + log(n) * numParams
  const bic = -2 * logLikelihood + Math.log(n) * numParams

  return bic
}

/**
 * Find optimal number of clusters using BIC
 * Tests k from minK to maxK and returns the k with lowest BIC
 */
export function findOptimalClusters(
  points: number[][],
  minK = 2,
  maxK = 10,
  seed = 42,
): { optimalK: number; bicScores: Array<{ k: number; bic: number }> } {
  const bicScores: Array<{ k: number; bic: number }> = []
  let optimalK = minK
  let lowestBIC = Number.POSITIVE_INFINITY

  for (let k = minK; k <= maxK; k++) {
    const result = kmeans(points, k, 50, seed) // Use fewer iterations for speed
    const bic = calculateBIC(points, result.labels, k)

    bicScores.push({ k, bic })

    if (bic < lowestBIC) {
      lowestBIC = bic
      optimalK = k
    }
  }

  return { optimalK, bicScores }
}

/**
 * Apply clustering to reduced coordinates
 */
export function applyClustering(
  coordinates: number[][],
  method: ClusteringMethod,
  params: {
    n_clusters?: number
    eps?: number
    min_samples?: number
    auto_clusters?: boolean
    min_clusters?: number
    max_clusters?: number
    seed?: number
  },
): ClusteringResult {
  const seed = params.seed ?? 42

  switch (method) {
    case "kmeans": {
      let k = params.n_clusters ?? 5

      // Use BIC to determine optimal k if auto_clusters is enabled
      if (params.auto_clusters) {
        const minK = params.min_clusters ?? 2
        const maxK = params.max_clusters ?? 10
        const optimal = findOptimalClusters(coordinates, minK, maxK, seed)
        k = optimal.optimalK
      }

      return kmeans(coordinates, k, 100, seed)
    }
    case "dbscan": {
      const eps = params.eps ?? 0.5
      const minSamples = params.min_samples ?? 5
      return dbscan(coordinates, eps, minSamples)
    }
    case "hierarchical": {
      let k = params.n_clusters ?? 5

      // Use BIC to determine optimal k if auto_clusters is enabled
      if (params.auto_clusters) {
        const minK = params.min_clusters ?? 2
        const maxK = params.max_clusters ?? 10
        const optimal = findOptimalClusters(coordinates, minK, maxK, seed)
        k = optimal.optimalK
      }

      return hierarchical(coordinates, k)
    }
    default:
      throw new Error(`Unknown clustering method: ${method}`)
  }
}

// Helper functions

function euclideanDistance(p1: number[], p2: number[]): number {
  let sum = 0
  for (let i = 0; i < p1.length; i++) {
    const val1 = p1[i]
    const val2 = p2[i]
    if (val1 !== undefined && val2 !== undefined) {
      sum += (val1 - val2) ** 2
    }
  }
  return Math.sqrt(sum)
}

function getNeighbors(
  points: number[][],
  index: number,
  eps: number,
): number[] {
  const neighbors: number[] = []
  const currentPoint = points[index]
  if (!currentPoint) return neighbors

  for (let i = 0; i < points.length; i++) {
    if (i === index) continue
    const otherPoint = points[i]
    if (!otherPoint) continue
    if (euclideanDistance(currentPoint, otherPoint) <= eps) {
      neighbors.push(i)
    }
  }
  return neighbors
}

function clusterDistance(
  cluster1: number[],
  cluster2: number[],
  distMatrix: number[][],
): number {
  let minDist = Number.POSITIVE_INFINITY

  for (const i of cluster1) {
    const row = distMatrix[i]
    if (!row) continue
    for (const j of cluster2) {
      const dist = row[j]
      if (dist !== undefined && dist < minDist) {
        minDist = dist
      }
    }
  }

  return minDist
}
