/**
 * Security middleware configuration for EES API
 * Implements rate limiting, CORS, security headers, and input validation
 */

import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from 'hono-rate-limiter'
import type { Context, Next } from 'hono'
import { ENV_KEYS, getEnvBoolean, getEnvNumber } from '@ees/core'

/**
 * Rate limit configuration structure
 */
interface RateLimitConfig {
  readonly enabled: boolean
  readonly windowMs: number
  readonly limits: {
    readonly general: number
    readonly embedding: number
    readonly search: number
    readonly read: number
  }
}

/**
 * Get rate limit configuration from environment or use defaults
 */
function getRateLimitConfig(): RateLimitConfig {
  const enabled = getEnvBoolean(ENV_KEYS.RATE_LIMIT_ENABLED, true)
  const windowMs = getEnvNumber(ENV_KEYS.RATE_LIMIT_WINDOW_MS, 60000) // 1 minute default

  return {
    enabled,
    windowMs,
    limits: {
      general: getEnvNumber(ENV_KEYS.RATE_LIMIT_GENERAL, 100),
      embedding: getEnvNumber(ENV_KEYS.RATE_LIMIT_EMBEDDING, 10),
      search: getEnvNumber(ENV_KEYS.RATE_LIMIT_SEARCH, 20),
      read: getEnvNumber(ENV_KEYS.RATE_LIMIT_READ, 200),
    }
  }
}

/**
 * Rate limiting configuration based on endpoint type and sensitivity
 */
const createRateLimiter = (config: {
  windowMs: number
  limit: number
  message: { error: string; retryAfter: string }
}) => {
  // Return a function that checks environment at runtime
  return async (c: Context, next: Next) => {
    const rateLimitConfig = getRateLimitConfig()

    // Disable rate limiting in test environment or if explicitly disabled
    if (process.env['NODE_ENV'] === 'test' || !rateLimitConfig.enabled) {
      return await next()
    }

    // Apply rate limiting in non-test environments
    const limiter = rateLimiter({
      ...config,
      standardHeaders: true,
      keyGenerator: (c: Context) => c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
    })

    return await limiter(c, next)
  }
}

// Get rate limit configuration at module load time
const config = getRateLimitConfig()

export const rateLimitConfig = {
  // General API endpoints - moderate limits
  general: createRateLimiter({
    windowMs: config.windowMs,
    limit: config.limits.general,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: `${config.windowMs / 1000} seconds`
    },
  }),

  // Embedding generation - more restrictive (expensive operations)
  embedding: createRateLimiter({
    windowMs: config.windowMs,
    limit: config.limits.embedding,
    message: {
      error: 'Too many embedding requests, please try again later.',
      retryAfter: `${config.windowMs / 1000} seconds`
    },
  }),

  // Search operations - moderate restrictions
  search: createRateLimiter({
    windowMs: config.windowMs,
    limit: config.limits.search,
    message: {
      error: 'Too many search requests, please try again later.',
      retryAfter: `${config.windowMs / 1000} seconds`
    },
  }),

  // Read operations - more lenient
  read: createRateLimiter({
    windowMs: config.windowMs,
    limit: config.limits.read,
    message: {
      error: 'Too many read requests, please try again later.',
      retryAfter: `${config.windowMs / 1000} seconds`
    },
  })
}

/**
 * CORS configuration for different environments
 */
export const corsConfig = {
  development: cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  }),

  production: cors({
    origin: (origin) => {
      // Allow requests from same domain and specified origins
      const allowedOrigins = [
        process.env['FRONTEND_URL'],
        process.env['ADMIN_URL'],
      ].filter(Boolean)

      if (!origin || allowedOrigins.includes(origin)) {
        return origin
      }

      // Reject unauthorized origins
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),

  // Get environment-appropriate CORS config
  get current() {
    const env = process.env['NODE_ENV'] || 'development'
    return env === 'production' ? this.production : this.development
  }
}

/**
 * Security headers configuration using Hono's built-in secureHeaders
 */
export const securityHeadersConfig = secureHeaders({
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  crossOriginOpenerPolicy: false,   // Disable for API compatibility
  crossOriginResourcePolicy: false, // Handled by CORS instead
  originAgentCluster: '?1',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: process.env['NODE_ENV'] === 'production'
    ? 'max-age=31536000; includeSubDomains'
    : false,
  xContentTypeOptions: 'nosniff',
  xDnsPrefetchControl: 'off',
  xDownloadOptions: 'noopen',
  xFrameOptions: 'DENY',
  xPermittedCrossDomainPolicies: 'none',
  xXssProtection: '1; mode=block',
})

/**
 * Request size limits middleware
 * Prevents large payload attacks and resource exhaustion
 */
export const requestSizeLimits = async (c: Context, next: Next) => {
  const contentLength = c.req.header('content-length')

  if (contentLength) {
    const size = parseInt(contentLength, 10)
    const maxSize = getMaxSizeForPath(c.req.path)

    if (size > maxSize) {
      return c.json({
        error: 'Request too large',
        maxSize: formatBytes(maxSize),
        receivedSize: formatBytes(size)
      }, 413)
    }
  }

  return await next()
}

/**
 * Get maximum allowed request size based on endpoint
 */
function getMaxSizeForPath(path: string): number {
  // 50MB for batch operations
  if (path.includes('/batch')) {
    return 50 * 1024 * 1024
  }

  // 10MB for file uploads
  if (path.includes('/upload')) {
    return 10 * 1024 * 1024
  }

  // 1MB for regular API requests
  return 1024 * 1024
}

/**
 * Format bytes for human-readable error messages
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Text length validation middleware
 * Prevents memory exhaustion from extremely large text inputs
 */
export const textLengthValidation = async (c: Context, next: Next) => {
  const path = c.req.path

  // Only validate on endpoints that accept text content
  if (!path.includes('/embeddings') || c.req.method !== 'POST') {
    return await next()
  }

  try {
    const body = await c.req.json()
    const maxLength = 50000 // 50k characters max per embedding

    // Validate single embedding text
    if (body.text && body.text.length > maxLength) {
      return c.json({
        error: 'Text too long',
        maxLength,
        receivedLength: body.text.length
      }, 400)
    }

    // Validate batch embedding texts
    if (body.texts && Array.isArray(body.texts)) {
      for (const item of body.texts) {
        if (item.text && item.text.length > maxLength) {
          return c.json({
            error: 'Text too long in batch request',
            maxLength,
            receivedLength: item.text.length,
            uri: item.uri
          }, 400)
        }
      }
    }

    return await next()
  } catch (error) {
    // If JSON parsing fails, let the main handler deal with it
    return await next()
  }
}

/**
 * Security middleware factory that applies all security measures
 */
export function createSecurityMiddleware() {
  return {
    // Core security headers
    secureHeaders: securityHeadersConfig,

    // CORS configuration
    cors: corsConfig.current,

    // Rate limiting
    rateLimits: rateLimitConfig,

    // Request validation
    requestSizeLimits,
    textLengthValidation,
  }
}