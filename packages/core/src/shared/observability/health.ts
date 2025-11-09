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
 * Health service tag for dependency injection
 */
export const HealthServiceTag = Context.GenericTag<HealthService>("HealthService")

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
 * Comprehensive health service implementation with dependency monitoring
 */
class ComprehensiveHealthService implements HealthService {
  private readonly startTime = Date.now()
  private readonly healthChecks: Map<string, HealthCheckConfig> = new Map()

  constructor() {
    this.setupDefaultHealthChecks()
  }

  private setupDefaultHealthChecks() {
    // Ollama service connectivity check
    // Note: With connection management, Ollama is optional (configured via database)
    this.addHealthCheck({
      name: "ollama",
      check: standardHealthChecks.httpService(
        "Ollama",
        `${process.env["EES_OLLAMA_BASE_URL"] || "http://localhost:11434"}/api/version`,
        3000
      ),
      timeout: 3000,
      critical: false, // Non-critical - providers are now managed via database
    })

    // Database connectivity check
    this.addHealthCheck({
      name: "database",
      check: standardHealthChecks.database(() =>
        Effect.tryPromise({
          try: async () => {
            // Simple database connection test
            await import("@/shared/database/connection")
            return { connected: true }
          },
          catch: (error) => {
            throw new Error(`Database connection failed: ${String(error)}`)
          },
        })
      ),
      timeout: 2000,
      critical: true,
    })

    // Memory usage check
    this.addHealthCheck({
      name: "memory",
      check: standardHealthChecks.memory(1024), // 1GB threshold
      timeout: 1000,
      critical: false,
    })

    // Disk space check
    this.addHealthCheck({
      name: "disk",
      check: standardHealthChecks.diskSpace(),
      timeout: 1000,
      critical: false,
    })

    // Embedding provider availability check
    // With connection management, provider config is stored in database
    this.addHealthCheck({
      name: "embedding_provider",
      check: () =>
        Effect.succeed({
          status: "healthy" as const,
          responseTime: 1,
          message: "Embedding provider managed via database",
          lastChecked: new Date().toISOString(),
          details: {
            mode: "connection-management",
            note: "Provider connections are configured via /connections API",
          },
        }),
      timeout: 1000,
      critical: false,
    })
  }

  addHealthCheck(config: HealthCheckConfig): void {
    this.healthChecks.set(config.name, config)
  }

  removeHealthCheck(name: string): void {
    this.healthChecks.delete(name)
  }

  getHealth = (): Effect.Effect<SystemHealth> =>
    Effect.gen((function* (this: ComprehensiveHealthService) {
      const dependencies: Record<string, DependencyHealth> = {}
      let healthyCount = 0
      let degradedCount = 0
      let unhealthyCount = 0

      // Run all health checks concurrently
      const healthCheckEffects = Array.from(this.healthChecks.entries()).map(
        ([name, config]) =>
          config.check().pipe(
            Effect.timeout(config.timeout),
            Effect.catchAll((error) =>
              Effect.succeed({
                status: "unhealthy" as const,
                message: `Health check timeout or error: ${String(error)}`,
                lastChecked: new Date().toISOString(),
                responseTime: config.timeout,
              })
            ),
            Effect.map((result) => ({ name, result, critical: config.critical }))
          )
      )

      const results = yield* Effect.all(healthCheckEffects, { concurrency: "unbounded" })

      // Process results
      let overallStatus: HealthStatus = "healthy"

      for (const { name, result, critical } of results) {
        dependencies[name] = result

        switch (result.status) {
          case "healthy":
            healthyCount++
            break
          case "degraded":
            degradedCount++
            if (critical) {
              overallStatus = "degraded"
            }
            break
          case "unhealthy":
            unhealthyCount++
            if (critical) {
              overallStatus = "unhealthy"
            } else if (overallStatus === "healthy") {
              overallStatus = "degraded"
            }
            break
        }
      }

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env["SERVICE_VERSION"] || "1.0.0",
        environment: process.env["NODE_ENV"] || "development",
        dependencies,
        summary: {
          total: this.healthChecks.size,
          healthy: healthyCount,
          degraded: degradedCount,
          unhealthy: unhealthyCount,
        },
      }
    }).bind(this))

  getReadiness = (): Effect.Effect<boolean> =>
    Effect.gen((function* (this: ComprehensiveHealthService) {
      const health = yield* this.getHealth()
      // System is ready if overall status is healthy or degraded (but not unhealthy)
      return health.status !== "unhealthy"
    }).bind(this))

  getLiveness = (): Effect.Effect<boolean> =>
    Effect.gen((function* (this: ComprehensiveHealthService) {
      // Liveness check is more basic - just check if the service can respond
      try {
        const memUsage = process.memoryUsage()
        // Consider alive if we can access memory info and it's not excessive
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024
        return heapUsedMB < 2048 // 2GB threshold for liveness
      } catch {
        return false
      }
    }).bind(this))
}

/**
 * Create health service layer - defaults to Comprehensive, can be set to Simple via EES_HEALTH_MODE=simple
 */
export const HealthLayer = Layer.succeed(
  HealthServiceTag,
  process.env["EES_HEALTH_MODE"] === "simple"
    ? new SimpleHealthService()
    : new ComprehensiveHealthService()
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