/**
 * Enhanced health check system for monitoring system and dependency status
 * Provides comprehensive health monitoring for production deployment
 */

import { Context, Layer, Effect } from "effect"

/**
 * Health status levels
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy"

/**
 * Individual dependency health check result
 */
export interface DependencyHealth {
  readonly status: HealthStatus
  readonly responseTime?: number
  readonly message?: string
  readonly lastChecked: string
  readonly details?: Record<string, unknown>
}

/**
 * Overall system health status
 */
export interface SystemHealth {
  readonly status: HealthStatus
  readonly timestamp: string
  readonly uptime: number
  readonly version: string
  readonly environment: string
  readonly dependencies: Record<string, DependencyHealth>
  readonly summary: {
    readonly total: number
    readonly healthy: number
    readonly degraded: number
    readonly unhealthy: number
  }
}

/**
 * Health check function type
 */
export type HealthCheck = () => Effect.Effect<DependencyHealth>

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly name: string
  readonly check: HealthCheck
  readonly timeout: number // milliseconds
  readonly critical: boolean // affects overall status
}

/**
 * Simple health service interface
 */
export interface HealthService {
  readonly getHealth: () => Effect.Effect<SystemHealth>
  readonly getReadiness: () => Effect.Effect<boolean>
  readonly getLiveness: () => Effect.Effect<boolean>
}

/**
 * Simple health service implementation
 */
class SimpleHealthService implements HealthService {
  private readonly startTime = Date.now()

  getHealth = (): Effect.Effect<SystemHealth> =>
    Effect.succeed({
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env['SERVICE_VERSION'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      dependencies: {},
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
      },
    })

  getReadiness = (): Effect.Effect<boolean> =>
    Effect.succeed(true)

  getLiveness = (): Effect.Effect<boolean> =>
    Effect.succeed(true)
}

/**
 * Health service tag for dependency injection
 */
export const HealthServiceTag = Context.GenericTag<HealthService>("HealthService")

/**
 * Create health service layer
 */
export const HealthLayer = Layer.succeed(
  HealthServiceTag,
  new SimpleHealthService()
)

/**
 * Convenience functions for health management
 */
export const health = {
  /**
   * Get overall system health
   */
  get: Effect.gen(function* () {
    const service = yield* HealthServiceTag
    return yield* service.getHealth()
  }),

  /**
   * Check if system is ready to serve traffic
   */
  ready: Effect.gen(function* () {
    const service = yield* HealthServiceTag
    return yield* service.getReadiness()
  }),

  /**
   * Check if system is alive
   */
  alive: Effect.gen(function* () {
    const service = yield* HealthServiceTag
    return yield* service.getLiveness()
  }),
}

/**
 * Standard health checks for common dependencies
 */
export const standardHealthChecks = {
  /**
   * Database connectivity health check
   */
  database: (testQuery: () => Effect.Effect<unknown>): HealthCheck =>
    () =>
      Effect.gen(function* () {
        const startTime = Date.now()

        try {
          yield* testQuery()
          const responseTime = Date.now() - startTime

          return {
            status: responseTime < 100 ? "healthy" : "degraded",
            responseTime,
            message: responseTime < 100 ? "Database responsive" : "Database slow",
            lastChecked: new Date().toISOString(),
            details: { responseTimeMs: responseTime },
          } as const
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: Date.now() - startTime,
            message: `Database connection failed: ${String(error)}`,
            lastChecked: new Date().toISOString(),
          } as const
        }
      }),

  /**
   * HTTP service health check
   */
  httpService: (
    name: string,
    url: string,
    timeout = 5000
  ): HealthCheck =>
    () =>
      Effect.gen(function* () {
        const startTime = Date.now()

        try {
          const response = yield* Effect.promise(() =>
            fetch(url, {
              method: "GET",
              headers: { "User-Agent": "EES-Health-Check/1.0" },
              signal: AbortSignal.timeout(timeout),
            })
          )

          const responseTime = Date.now() - startTime

          if (!response.ok) {
            return {
              status: "degraded",
              responseTime,
              message: `${name} returned ${response.status}`,
              lastChecked: new Date().toISOString(),
              details: {
                statusCode: response.status,
                statusText: response.statusText
              },
            } as const
          }

          return {
            status: responseTime < 1000 ? "healthy" : "degraded",
            responseTime,
            message: `${name} responsive`,
            lastChecked: new Date().toISOString(),
            details: {
              statusCode: response.status,
              responseTimeMs: responseTime
            },
          } as const
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: Date.now() - startTime,
            message: `${name} health check failed: ${String(error)}`,
            lastChecked: new Date().toISOString(),
          } as const
        }
      }),

  /**
   * Memory usage health check
   */
  memory: (maxHeapMB = 1024): HealthCheck =>
    () =>
      Effect.gen(function* () {
        const memUsage = process.memoryUsage()
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024

        const status: HealthStatus =
          heapUsedMB > maxHeapMB ? "unhealthy" :
          heapUsedMB > maxHeapMB * 0.8 ? "degraded" : "healthy"

        return {
          status,
          message: `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${maxHeapMB}MB`,
          lastChecked: new Date().toISOString(),
          details: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
            externalMB: Math.round(memUsage.external / 1024 / 1024),
          },
        } as const
      }),

  /**
   * Disk space health check
   */
  diskSpace: (): HealthCheck =>
    () =>
      Effect.gen(function* () {
        try {
          // Simple check using process.cwd() as proxy for available space
          yield* Effect.promise(() =>
            import('fs').then(fs => fs.promises.stat(process.cwd()))
          )

          return {
            status: "healthy",
            message: "Disk accessible",
            lastChecked: new Date().toISOString(),
            details: {
              cwd: process.cwd(),
              accessible: true,
            },
          } as const
        } catch (error) {
          return {
            status: "unhealthy",
            message: `Disk access failed: ${String(error)}`,
            lastChecked: new Date().toISOString(),
          } as const
        }
      }),
}