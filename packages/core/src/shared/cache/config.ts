/**
 * Cache configuration and TTL constants
 */

import { getEnvWithDefault } from "@/shared/lib/env"

/**
 * Cache TTL (Time To Live) configuration in milliseconds
 */
export const CacheTTL = {
  /** Embedding lookup cache: 1 hour */
  EMBEDDING: Number(
    getEnvWithDefault("EES_CACHE_EMBEDDING_TTL", String(60 * 60 * 1000))
  ),

  /** Search results cache: 5 minutes */
  SEARCH: Number(
    getEnvWithDefault("EES_CACHE_SEARCH_TTL", String(5 * 60 * 1000))
  ),

  /** Model list cache: 24 hours */
  MODELS: Number(
    getEnvWithDefault("EES_CACHE_MODELS_TTL", String(24 * 60 * 60 * 1000))
  ),

  /** Provider status cache: 30 seconds */
  PROVIDER_STATUS: Number(
    getEnvWithDefault("EES_CACHE_PROVIDER_STATUS_TTL", String(30 * 1000))
  ),
} as const

/**
 * Cache key prefix constants
 */
export const CacheKeyPrefix = {
  EMBEDDING: "embedding",
  SEARCH: "search",
  MODELS: "models",
  PROVIDER_STATUS: "provider_status",
} as const

/**
 * Generate cache key for embedding lookup
 */
export const embeddingCacheKey = (model: string, uri: string): string =>
  `${CacheKeyPrefix.EMBEDDING}:${model}:${uri}`

/**
 * Generate cache key for search results
 */
export const searchCacheKey = (
  model: string,
  queryHash: string,
  limit: number,
  metric: string
): string => `${CacheKeyPrefix.SEARCH}:${model}:${queryHash}:${limit}:${metric}`

/**
 * Generate cache key for model list
 */
export const modelsCacheKey = (provider: string): string =>
  `${CacheKeyPrefix.MODELS}:${provider}`

/**
 * Generate cache key for provider status
 */
export const providerStatusCacheKey = (provider: string): string =>
  `${CacheKeyPrefix.PROVIDER_STATUS}:${provider}`

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly enabled: boolean
  readonly maxSize: number
  readonly ttl: typeof CacheTTL
}

/**
 * Get cache configuration from environment
 */
export const getCacheConfig = (): CacheConfig => ({
  enabled: getEnvWithDefault("EES_CACHE_ENABLED", "true") === "true",
  maxSize: Number(getEnvWithDefault("EES_CACHE_MAX_SIZE", "1000")),
  ttl: CacheTTL,
})

/**
 * Simple hash function for cache keys
 * Uses FNV-1a hash algorithm
 */
export const hashString = (str: string): string => {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}
