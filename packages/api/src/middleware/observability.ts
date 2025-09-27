/**
 * Basic observability middleware for EES API
 * Provides request logging with correlation IDs and basic metrics
 */

import type { Context, Next } from 'hono'
import { randomUUID } from 'crypto'
import { createPinoLogger, createLoggerConfig } from "@/core/shared/observability/logger"
import { health, HealthLayer } from "@/core/shared/observability/health"
import { Effect } from "effect"

// Initialize shared logger for middleware
const logger = createPinoLogger(createLoggerConfig())

/**
 * Basic request logging middleware with correlation IDs
 * Logs all HTTP requests with structured data
 */
export const requestLoggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now()
  const method = c.req.method
  const path = c.req.path
  const userAgent = c.req.header('user-agent') || 'unknown'
  const ip = c.req.header('cf-connecting-ip') ||
             c.req.header('x-forwarded-for') ||
             c.req.header('x-real-ip') ||
             'unknown'

  // Generate or extract request ID
  const requestId = c.req.header('x-request-id') || randomUUID()
  const userId = c.req.header('x-user-id')

  // Add correlation headers to response
  c.header('x-request-id', requestId)
  if (userId) {
    c.header('x-user-id', userId)
  }

  // Log request start
  logger.info({
    requestId,
    userId,
    method,
    path,
    userAgent,
    ip,
    contentLength: c.req.header('content-length'),
    contentType: c.req.header('content-type'),
  }, 'HTTP request started')

  let statusCode = 200
  let error: unknown = null

  try {
    await next()
    statusCode = c.res.status
  } catch (err) {
    error = err
    statusCode = 500
    throw err
  } finally {
    const duration = Date.now() - startTime

    // Log request completion
    if (error) {
      logger.error({
        requestId,
        userId,
        method,
        path,
        statusCode,
        duration,
        error: String(error),
      }, 'HTTP request failed')
    } else {
      logger.info({
        requestId,
        userId,
        method,
        path,
        statusCode,
        duration,
      }, 'HTTP request completed')
    }
  }
}

/**
 * Basic metrics collection middleware
 * Records simple metrics for monitoring
 */
export const metricsMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now()
  const method = c.req.method
  const path = c.req.path

  try {
    await next()
    const duration = Date.now() - startTime
    const statusCode = c.res.status

    // Log metrics data
    logger.info({
      metric: 'http_request',
      method,
      path,
      statusCode,
      duration,
    }, 'HTTP metrics')
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error({
      metric: 'http_error',
      method,
      path,
      statusCode: 500,
      duration,
      error: String(error),
    }, 'HTTP error metrics')
    throw error
  }
}

/**
 * Error logging middleware
 * Ensures all errors are properly logged
 */
export const errorLoggingMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    const requestId = c.req.header('x-request-id') || 'unknown'

    logger.error({
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: c.res.status || 500,
    }, 'Unhandled request error')

    throw error
  }
}

/**
 * Memory monitoring middleware
 * Periodically logs memory usage
 */
export const memoryMonitoringMiddleware = (() => {
  let lastUpdate = 0
  const updateInterval = 30000 // Update every 30 seconds

  return async (_c: Context, next: Next) => {
    const now = Date.now()

    if (now - lastUpdate > updateInterval) {
      lastUpdate = now
      const memUsage = process.memoryUsage()

      logger.info({
        metric: 'memory_usage',
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      }, 'Memory usage')
    }

    await next()
  }
})()

/**
 * Enhanced health check endpoint middleware with dependency monitoring
 */
export const healthCheckMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path

  if (path === '/health') {
    try {
      // Use the Effect-based health service with a simple fallback
      const healthResult = await Effect.runPromise(
        health.get.pipe(
          Effect.timeout(5000), // 5 second timeout
          Effect.catchAll(() =>
            Effect.succeed({
              status: 'degraded' as const,
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              version: process.env['SERVICE_VERSION'] || '1.0.0',
              environment: process.env['NODE_ENV'] || 'development',
              dependencies: {},
              summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
              message: 'Health service unavailable'
            })
          ),
          Effect.provide(HealthLayer)
        )
      )

      const statusCode = healthResult.status === 'healthy' ? 200 :
                        healthResult.status === 'degraded' ? 200 : 503

      return c.json(healthResult, statusCode)
    } catch (error) {
      logger.error({
        error: String(error),
        path: '/health'
      }, 'Health check failed')

      return c.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env['SERVICE_VERSION'] || '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
        error: 'Health check failed'
      }, 503)
    }
  } else if (path === '/health/ready') {
    try {
      const ready = await Effect.runPromise(
        health.ready.pipe(
          Effect.timeout(3000),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.provide(HealthLayer)
        )
      )

      return c.json({
        ready,
        timestamp: new Date().toISOString()
      }, ready ? 200 : 503)
    } catch (error) {
      return c.json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: String(error)
      }, 503)
    }
  } else if (path === '/health/live') {
    try {
      const alive = await Effect.runPromise(
        health.alive.pipe(
          Effect.timeout(3000),
          Effect.catchAll(() => Effect.succeed(true)), // Liveness is more permissive
          Effect.provide(HealthLayer)
        )
      )

      return c.json({
        alive,
        timestamp: new Date().toISOString()
      }, alive ? 200 : 503)
    } catch (error) {
      return c.json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: String(error)
      }, 503)
    }
  }

  return await next()
}

/**
 * Enhanced Prometheus metrics endpoint with comprehensive application metrics
 */
export const metricsEndpointMiddleware = async (c: Context, next: Next) => {
  if (c.req.path === '/metrics') {
    const basicMetrics = `
# HELP ees_info EES service information
# TYPE ees_info gauge
ees_info{version="${process.env['SERVICE_VERSION'] || '1.0.0'}",environment="${process.env['NODE_ENV'] || 'development'}"} 1

# HELP ees_uptime_seconds EES service uptime in seconds
# TYPE ees_uptime_seconds counter
ees_uptime_seconds ${process.uptime()}

# HELP ees_memory_usage_bytes Memory usage by type
# TYPE ees_memory_usage_bytes gauge
ees_memory_usage_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}
ees_memory_usage_bytes{type="heap_total"} ${process.memoryUsage().heapTotal}
ees_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}
ees_memory_usage_bytes{type="external"} ${process.memoryUsage().external}
`.trim()

    c.header('Content-Type', 'text/plain')
    return c.text(basicMetrics)
  }

  return await next()
}

/**
 * Rate limit violation tracking middleware
 */
export const rateLimitMetricsMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    // Check if this is a rate limiting error (status 429)
    if (c.res.status === 429) {
      const endpoint = c.req.path
      const limitType = determineLimitType(endpoint)

      logger.warn({
        metric: 'rate_limit_violation',
        endpoint,
        limitType,
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent'),
      }, 'Rate limit violation')
    }

    throw error
  }
}

/**
 * Determine rate limit type based on endpoint
 */
function determineLimitType(endpoint: string): string {
  if (endpoint.includes('/embeddings') && !endpoint.includes('/search')) {
    return 'embedding'
  } else if (endpoint.includes('/search')) {
    return 'search'
  } else if (endpoint.includes('/models')) {
    return 'read'
  } else {
    return 'general'
  }
}