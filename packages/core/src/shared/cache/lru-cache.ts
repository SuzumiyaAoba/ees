/**
 * LRU Cache Service with Effect integration
 * Provides in-memory caching with TTL support and LRU eviction
 */

import QuickLRU from "@alloc/quick-lru"
import { Context, Data, Effect, Layer, Option } from "effect"

/**
 * Cache error types
 */
export class CacheError extends Data.TaggedError("CacheError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Cache item with optional expiration time
 */
interface CacheItem<T> {
  value: T
  expires?: number
}

/**
 * Cache service interface
 * Provides operations for get, set, delete, and clear with TTL support
 */
export interface CacheService {
  /**
   * Get a value from cache
   * Returns None if key doesn't exist or has expired
   */
  readonly get: <T>(key: string) => Effect.Effect<Option.Option<T>, CacheError>

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  readonly set: <T>(
    key: string,
    value: T,
    ttl?: number
  ) => Effect.Effect<void, CacheError>

  /**
   * Delete a value from cache
   */
  readonly delete: (key: string) => Effect.Effect<void, CacheError>

  /**
   * Clear all values from cache
   */
  readonly clear: () => Effect.Effect<void, CacheError>

  /**
   * Get cache statistics
   */
  readonly getStats: () => Effect.Effect<CacheStats, CacheError>
}

export const CacheService = Context.GenericTag<CacheService>("CacheService")

/**
 * Cache statistics
 */
export interface CacheStats {
  readonly size: number
  readonly maxSize: number
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  readonly maxSize: number
  readonly defaultTtl?: number
}

/**
 * Create an LRU cache service with Effect integration
 */
const make = (options: CacheOptions) =>
  Effect.sync(() => {
    const cache = new QuickLRU<string, CacheItem<unknown>>({
      maxSize: options.maxSize,
    })

    const get = <T>(key: string): Effect.Effect<Option.Option<T>, CacheError> =>
      Effect.try({
        try: () => {
          const item = cache.get(key)
          if (!item) return Option.none()

          // Check expiration
          if (item.expires && Date.now() > item.expires) {
            cache.delete(key)
            return Option.none()
          }

          return Option.some(item.value as T)
        },
        catch: (error) =>
          new CacheError({ message: "Failed to get value from cache", cause: error }),
      })

    const set = <T>(
      key: string,
      value: T,
      ttl?: number
    ): Effect.Effect<void, CacheError> =>
      Effect.try({
        try: () => {
          const expires: number | undefined = ttl
            ? Date.now() + ttl
            : options.defaultTtl
              ? Date.now() + options.defaultTtl
              : undefined

          const item: CacheItem<unknown> = expires !== undefined
            ? { value, expires }
            : { value }

          cache.set(key, item)
        },
        catch: (error) =>
          new CacheError({ message: "Failed to set value in cache", cause: error }),
      })

    const deleteKey = (key: string): Effect.Effect<void, CacheError> =>
      Effect.try({
        try: () => {
          cache.delete(key)
        },
        catch: (error) =>
          new CacheError({ message: "Failed to delete value from cache", cause: error }),
      })

    const clear = (): Effect.Effect<void, CacheError> =>
      Effect.try({
        try: () => {
          cache.clear()
        },
        catch: (error) => new CacheError({ message: "Failed to clear cache", cause: error }),
      })

    const getStats = (): Effect.Effect<CacheStats, CacheError> =>
      Effect.try({
        try: () => ({
          size: cache.size,
          maxSize: options.maxSize,
        }),
        catch: (error) => new CacheError({ message: "Failed to get cache stats", cause: error }),
      })

    return {
      get,
      set,
      delete: deleteKey,
      clear,
      getStats,
    }
  })

/**
 * Create a cache service layer with the given options
 */
export const CacheServiceLive = (options: CacheOptions): Layer.Layer<CacheService> =>
  Layer.effect(CacheService, make(options))

/**
 * Create a default cache service layer
 * Uses default configuration from environment
 */
export const CacheServiceLiveDefault: Layer.Layer<CacheService> =
  Layer.effect(
    CacheService,
    make({
      maxSize: Number(process.env["EES_CACHE_MAX_SIZE"] || 1000),
      defaultTtl: Number(process.env["EES_CACHE_DEFAULT_TTL"]),
    })
  )
