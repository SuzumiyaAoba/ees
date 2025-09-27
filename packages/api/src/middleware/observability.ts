/**
 * Basic observability middleware for EES API
 * Provides request logging with correlation IDs and basic metrics
 */

import type { Context, Next } from 'hono'
import { randomUUID } from 'crypto'

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
  console.log(JSON.stringify({
    level: 'info',
    message: 'HTTP request started',
    timestamp: new Date().toISOString(),
    requestId,
    userId,
    method,
    path,
    userAgent,
    ip,
    contentLength: c.req.header('content-length'),
    contentType: c.req.header('content-type'),
  }))

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
      console.log(JSON.stringify({
        level: 'error',
        message: 'HTTP request failed',
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        method,
        path,
        statusCode,
        duration,
        error: String(error),
      }))
    } else {
      console.log(JSON.stringify({
        level: 'info',
        message: 'HTTP request completed',
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        method,
        path,
        statusCode,
        duration,
      }))
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
    console.log(JSON.stringify({
      level: 'info',
      message: 'HTTP metrics',
      timestamp: new Date().toISOString(),
      metric: 'http_request',
      method,
      path,
      statusCode,
      duration,
    }))
  } catch (error) {
    const duration = Date.now() - startTime
    console.log(JSON.stringify({
      level: 'error',
      message: 'HTTP error metrics',
      timestamp: new Date().toISOString(),
      metric: 'http_error',
      method,
      path,
      statusCode: 500,
      duration,
      error: String(error),
    }))
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

    console.log(JSON.stringify({
      level: 'error',
      message: 'Unhandled request error',
      timestamp: new Date().toISOString(),
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: c.res.status || 500,
    }))

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

      console.log(JSON.stringify({
        level: 'info',
        message: 'Memory usage',
        timestamp: new Date().toISOString(),
        metric: 'memory_usage',
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      }))
    }

    await next()
  }
})()

/**
 * Basic health check endpoint middleware
 */
export const healthCheckMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path

  if (path === '/health') {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['SERVICE_VERSION'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
    }

    return c.json(healthInfo, 200)
  } else if (path === '/health/ready') {
    return c.json({ ready: true, timestamp: new Date().toISOString() }, 200)
  } else if (path === '/health/live') {
    return c.json({ alive: true, timestamp: new Date().toISOString() }, 200)
  }

  return await next()
}

/**
 * Placeholder metrics endpoint (for future Prometheus integration)
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

      console.log(JSON.stringify({
        level: 'warn',
        message: 'Rate limit violation',
        timestamp: new Date().toISOString(),
        metric: 'rate_limit_violation',
        endpoint,
        limitType,
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent'),
      }))
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