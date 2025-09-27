/**
 * Request correlation ID utilities for distributed tracing
 * Provides unique identifiers to track requests across the system
 */

import { Context, Layer, Effect } from "effect"
import { randomUUID } from "crypto"

/**
 * Correlation context for request tracking
 */
export interface CorrelationContext {
  readonly requestId: string
  readonly userId?: string | undefined
  readonly sessionId?: string | undefined
  readonly traceId?: string | undefined
}

/**
 * Correlation service interface
 */
export interface CorrelationService {
  readonly getCurrentContext: () => Effect.Effect<CorrelationContext | null>
  readonly setContext: (context: CorrelationContext) => Effect.Effect<void>
  readonly withContext: <R, E, A>(
    context: CorrelationContext,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>
  readonly generateRequestId: () => Effect.Effect<string>
}

/**
 * Fiber-local storage for correlation context
 */
const CorrelationContext = Context.GenericTag<CorrelationContext | null>("CorrelationContext")

/**
 * Correlation service implementation
 */
class CorrelationServiceImpl implements CorrelationService {
  getCurrentContext = (): Effect.Effect<CorrelationContext | null> =>
    Effect.gen(function* () {
      const context = yield* Effect.serviceOption(CorrelationContext)
      return context._tag === "Some" ? context.value : null
    })

  setContext = (context: CorrelationContext): Effect.Effect<void> =>
    Effect.provideService(Effect.void, CorrelationContext, context)

  withContext = <R, E, A>(
    context: CorrelationContext,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, CorrelationContext, context)

  generateRequestId = (): Effect.Effect<string> =>
    Effect.sync(() => randomUUID())
}

/**
 * Correlation service tag for dependency injection
 */
export const CorrelationServiceTag = Context.GenericTag<CorrelationService>("CorrelationService")

/**
 * Create correlation service layer
 */
export const CorrelationLayer = Layer.succeed(
  CorrelationServiceTag,
  new CorrelationServiceImpl()
)

/**
 * Convenience functions for correlation management
 */
export const correlation = {
  /**
   * Get current correlation context
   */
  current: Effect.gen(function* () {
    const service = yield* CorrelationServiceTag
    return yield* service.getCurrentContext()
  }),

  /**
   * Generate a new request ID
   */
  generateRequestId: Effect.gen(function* () {
    const service = yield* CorrelationServiceTag
    return yield* service.generateRequestId()
  }),

  /**
   * Run an effect with correlation context
   */
  withContext: <R, E, A>(
    context: CorrelationContext,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R | CorrelationService> =>
    Effect.gen(function* () {
      const service = yield* CorrelationServiceTag
      return yield* service.withContext(context, effect)
    }),

  /**
   * Run an effect with a new request ID
   */
  withNewRequest: <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    userId?: string
  ): Effect.Effect<A, E, R | CorrelationService> =>
    Effect.gen(function* () {
      const service = yield* CorrelationServiceTag
      const requestId = yield* service.generateRequestId()

      const context: CorrelationContext = {
        requestId,
        ...(userId && { userId }),
      }

      return yield* service.withContext(context, effect)
    }),

  /**
   * Extract correlation context from current fiber
   */
  extract: Effect.gen(function* () {
    const service = yield* CorrelationServiceTag
    const context = yield* service.getCurrentContext()
    return context || null
  }),
}

/**
 * Helper to create correlation context from HTTP headers
 */
export const createCorrelationFromHeaders = (headers: {
  'x-request-id'?: string
  'x-user-id'?: string
  'x-session-id'?: string
  'x-trace-id'?: string
}): CorrelationContext => ({
  requestId: headers['x-request-id'] || randomUUID(),
  ...(headers['x-user-id'] && { userId: headers['x-user-id'] }),
  ...(headers['x-session-id'] && { sessionId: headers['x-session-id'] }),
  ...(headers['x-trace-id'] && { traceId: headers['x-trace-id'] }),
})

/**
 * Helper to convert correlation context to HTTP headers
 */
export const correlationToHeaders = (context: CorrelationContext): Record<string, string> => {
  const headers: Record<string, string> = {
    'x-request-id': context.requestId,
  }

  if (context.userId) {
    headers['x-user-id'] = context.userId
  }

  if (context.sessionId) {
    headers['x-session-id'] = context.sessionId
  }

  if (context.traceId) {
    headers['x-trace-id'] = context.traceId
  }

  return headers
}