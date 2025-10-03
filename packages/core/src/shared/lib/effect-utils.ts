/**
 * Effect utility functions to reduce boilerplate and improve composability
 *
 * This module provides reusable patterns for common Effect operations:
 * - Service delegation (accessing and calling service methods)
 * - Database queries (wrapping database operations with error handling)
 * - Effect composition (combining and transforming Effects)
 */

import { Context, Effect } from "effect"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Access a service from the Effect context and call a method on it
 * Eliminates the boilerplate of `Effect.gen(function* () { const service = yield* ServiceTag; return service.method(...) })`
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.gen(function* () {
 *   const embeddingService = yield* EmbeddingService
 *   return yield* embeddingService.createEmbedding(uri, text, model)
 * })
 *
 * // After:
 * withService(EmbeddingService, service => service.createEmbedding(uri, text, model))
 * ```
 */
export function withService<T, A, E, R>(
  tag: Context.Tag<T, T>,
  fn: (service: T) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | T> {
  return Effect.flatMap(tag, fn)
}

/**
 * Wrap a database operation in Effect.tryPromise with standardized error handling
 * Automatically creates DatabaseQueryError with proper message and cause
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.tryPromise({
 *   try: () => db.select().from(table).where(eq(table.id, id)),
 *   catch: (error) => new DatabaseQueryError({
 *     message: "Failed to query embedding",
 *     cause: error
 *   })
 * })
 *
 * // After:
 * dbQuery(
 *   () => db.select().from(table).where(eq(table.id, id)),
 *   "Failed to query embedding"
 * )
 * ```
 */
export function dbQuery<A>(
  operation: () => Promise<A>,
  errorMessage: string,
  query?: string
): Effect.Effect<A, DatabaseQueryError> {
  return Effect.tryPromise({
    try: operation,
    catch: (error) =>
      new DatabaseQueryError({
        message: errorMessage,
        ...(query !== undefined && { query }),
        cause: error,
      }),
  })
}

/**
 * Execute a database operation and transform the result
 * Combines dbQuery with Effect.map for cleaner code
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.flatMap(
 *   dbQuery(() => db.select().from(table), "Failed to fetch"),
 *   rows => Effect.succeed(rows.length > 0)
 * )
 *
 * // After:
 * dbQueryMap(
 *   () => db.select().from(table),
 *   rows => rows.length > 0,
 *   "Failed to fetch"
 * )
 * ```
 */
export function dbQueryMap<A, B>(
  operation: () => Promise<A>,
  transform: (result: A) => B,
  errorMessage: string,
  query?: string
): Effect.Effect<B, DatabaseQueryError> {
  return Effect.map(
    dbQuery(operation, errorMessage, query),
    transform
  )
}

/**
 * Execute a database operation and conditionally fail if result is null/undefined
 * Useful for operations that should fail when no record is found
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.gen(function* () {
 *   const result = yield* dbQuery(() => db.select()..., "Failed to find")
 *   if (!result || result.length === 0) {
 *     return null
 *   }
 *   return result[0]
 * })
 *
 * // After:
 * dbQueryRequired(
 *   () => db.select()...,
 *   result => result[0],
 *   "Failed to find record"
 * )
 * ```
 */
export function dbQueryRequired<A, B>(
  operation: () => Promise<A>,
  transform: (result: A) => B | null,
  errorMessage: string,
  query?: string
): Effect.Effect<B | null, DatabaseQueryError> {
  return Effect.map(
    dbQuery(operation, errorMessage, query),
    (result) => transform(result) ?? null
  )
}

/**
 * Wrap a Promise-returning function in Effect.tryPromise with custom error creation
 * More generic than dbQuery, allows any error type
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.tryPromise({
 *   try: () => fetch(url),
 *   catch: (error) => new ProviderConnectionError({
 *     provider: "openai",
 *     message: "Failed to connect",
 *     cause: error
 *   })
 * })
 *
 * // After:
 * tryPromiseWithError(
 *   () => fetch(url),
 *   error => new ProviderConnectionError({
 *     provider: "openai",
 *     message: "Failed to connect",
 *     cause: error
 *   })
 * )
 * ```
 */
export function tryPromiseWithError<A, E>(
  operation: () => Promise<A>,
  onError: (cause: unknown) => E
): Effect.Effect<A, E> {
  return Effect.tryPromise({
    try: operation,
    catch: onError,
  })
}

/**
 * Execute multiple Effects in parallel and collect results
 * Wrapper around Effect.all with cleaner API
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.all([effect1, effect2, effect3], { concurrency: 5 })
 *
 * // After:
 * parallel([effect1, effect2, effect3], 5)
 * ```
 */
export function parallel<Effects extends readonly Effect.Effect<unknown, unknown, unknown>[]>(
  effects: Effects,
  concurrency?: number | "unbounded"
): Effect.Effect<
  { [K in keyof Effects]: Effect.Effect.Success<Effects[K]> },
  Effect.Effect.Error<Effects[number]>,
  Effect.Effect.Context<Effects[number]>
> {
  return Effect.all(effects, { concurrency }) as never
}

/**
 * Execute multiple Effects in parallel and collect results into an object
 *
 * @example
 * ```typescript
 * // Before:
 * Effect.all({
 *   user: getUserEffect,
 *   posts: getPostsEffect,
 *   comments: getCommentsEffect
 * })
 *
 * // After:
 * parallelObject({
 *   user: getUserEffect,
 *   posts: getPostsEffect,
 *   comments: getCommentsEffect
 * })
 * ```
 */
export function parallelObject<
  R extends Record<string, Effect.Effect<unknown, unknown, unknown>>
>(
  effects: R
): Effect.Effect<
  { [K in keyof R]: Effect.Effect.Success<R[K]> },
  Effect.Effect.Error<R[keyof R]>,
  Effect.Effect.Context<R[keyof R]>
> {
  return Effect.all(effects) as never
}

/**
 * Tap into an Effect to perform a side effect without changing the value
 * Wrapper around Effect.tap with clearer naming
 *
 * @example
 * ```typescript
 * // Log intermediate value without changing the Effect
 * pipe(
 *   getUserEffect,
 *   tapEffect(user => Effect.log(`User: ${user.name}`)),
 *   Effect.map(user => user.email)
 * )
 * ```
 */
export function tapEffect<A, E, R, X, E2, R2>(
  fn: (a: A) => Effect.Effect<X, E2, R2>
): (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2, R | R2> {
  return (effect) => Effect.tap(effect, fn)
}

/**
 * Convert a Result value (nullable) to an Option
 * Useful for database queries that may return null
 *
 * @example
 * ```typescript
 * pipe(
 *   dbQuery(() => findUser(id), "User not found"),
 *   Effect.map(toOption)
 * )
 * ```
 */
export function toOption<A>(value: A | null | undefined): A | null {
  return value ?? null
}
