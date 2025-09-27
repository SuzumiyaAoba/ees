/**
 * Application metrics collection system using Prometheus
 * Provides business and system metrics for monitoring and alerting
 */

import { Context, Layer, Effect } from "effect"
import {
  Counter,
  Histogram,
  Gauge,
  register,
  collectDefaultMetrics,
  type Registry,
} from "prom-client"

/**
 * Business metrics for EES operations
 */
export interface BusinessMetrics {
  readonly embeddingCreated: Counter<"provider" | "model">
  readonly embeddingCreationDuration: Histogram<"provider" | "model">
  readonly embeddingCreationErrors: Counter<"provider" | "model" | "error_type">
  readonly searchOperations: Counter<"metric_type">
  readonly searchDuration: Histogram<"metric_type">
  readonly batchOperations: Counter<"operation_type">
  readonly batchSize: Histogram<"operation_type">
  readonly providerRequests: Counter<"provider" | "operation">
  readonly providerErrors: Counter<"provider" | "error_type">
  readonly providerDuration: Histogram<"provider" | "operation">
}

/**
 * System metrics for infrastructure monitoring
 */
export interface SystemMetrics {
  readonly httpRequests: Counter<"method" | "route" | "status_code">
  readonly httpDuration: Histogram<"method" | "route">
  readonly rateLimitViolations: Counter<"endpoint" | "limit_type">
  readonly databaseConnections: Gauge<"pool">
  readonly databaseQueryDuration: Histogram<"operation">
  readonly memoryUsage: Gauge<"type">
  readonly activeConnections: Gauge<"type">
}

/**
 * Combined metrics interface
 */
export interface Metrics {
  readonly business: BusinessMetrics
  readonly system: SystemMetrics
  readonly registry: Registry
}

/**
 * Metrics service interface
 */
export interface MetricsService {
  readonly getMetrics: () => Effect.Effect<Metrics>
  readonly recordEmbeddingCreated: (
    provider: string,
    model: string,
    duration: number
  ) => Effect.Effect<void>
  readonly recordEmbeddingError: (
    provider: string,
    model: string,
    errorType: string
  ) => Effect.Effect<void>
  readonly recordSearchOperation: (
    metricType: string,
    duration: number
  ) => Effect.Effect<void>
  readonly recordBatchOperation: (
    operationType: string,
    batchSize: number
  ) => Effect.Effect<void>
  readonly recordProviderRequest: (
    provider: string,
    operation: string,
    duration: number
  ) => Effect.Effect<void>
  readonly recordProviderError: (
    provider: string,
    errorType: string
  ) => Effect.Effect<void>
  readonly recordHttpRequest: (
    method: string,
    route: string,
    statusCode: string,
    duration: number
  ) => Effect.Effect<void>
  readonly recordRateLimitViolation: (
    endpoint: string,
    limitType: string
  ) => Effect.Effect<void>
  readonly updateDatabaseConnections: (
    pool: string,
    count: number
  ) => Effect.Effect<void>
  readonly recordDatabaseQuery: (
    operation: string,
    duration: number
  ) => Effect.Effect<void>
  readonly updateMemoryUsage: () => Effect.Effect<void>
  readonly updateActiveConnections: (
    type: string,
    count: number
  ) => Effect.Effect<void>
  readonly getPrometheusMetrics: () => Effect.Effect<string>
}

/**
 * Create business metrics
 */
const createBusinessMetrics = (): BusinessMetrics => ({
  embeddingCreated: new Counter({
    name: "ees_embeddings_created_total",
    help: "Total number of embeddings created",
    labelNames: ["provider", "model"],
  }),

  embeddingCreationDuration: new Histogram({
    name: "ees_embedding_creation_duration_seconds",
    help: "Duration of embedding creation operations",
    labelNames: ["provider", "model"],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  embeddingCreationErrors: new Counter({
    name: "ees_embedding_creation_errors_total",
    help: "Total number of embedding creation errors",
    labelNames: ["provider", "model", "error_type"],
  }),

  searchOperations: new Counter({
    name: "ees_search_operations_total",
    help: "Total number of search operations",
    labelNames: ["metric_type"],
  }),

  searchDuration: new Histogram({
    name: "ees_search_duration_seconds",
    help: "Duration of search operations",
    labelNames: ["metric_type"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  batchOperations: new Counter({
    name: "ees_batch_operations_total",
    help: "Total number of batch operations",
    labelNames: ["operation_type"],
  }),

  batchSize: new Histogram({
    name: "ees_batch_size",
    help: "Size of batch operations",
    labelNames: ["operation_type"],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  }),

  providerRequests: new Counter({
    name: "ees_provider_requests_total",
    help: "Total number of requests to embedding providers",
    labelNames: ["provider", "operation"],
  }),

  providerErrors: new Counter({
    name: "ees_provider_errors_total",
    help: "Total number of provider errors",
    labelNames: ["provider", "error_type"],
  }),

  providerDuration: new Histogram({
    name: "ees_provider_request_duration_seconds",
    help: "Duration of provider requests",
    labelNames: ["provider", "operation"],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),
})

/**
 * Create system metrics
 */
const createSystemMetrics = (): SystemMetrics => ({
  httpRequests: new Counter({
    name: "ees_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
  }),

  httpDuration: new Histogram({
    name: "ees_http_request_duration_seconds",
    help: "Duration of HTTP requests",
    labelNames: ["method", "route"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),

  rateLimitViolations: new Counter({
    name: "ees_rate_limit_violations_total",
    help: "Total number of rate limit violations",
    labelNames: ["endpoint", "limit_type"],
  }),

  databaseConnections: new Gauge({
    name: "ees_database_connections",
    help: "Number of active database connections",
    labelNames: ["pool"],
  }),

  databaseQueryDuration: new Histogram({
    name: "ees_database_query_duration_seconds",
    help: "Duration of database queries",
    labelNames: ["operation"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  }),

  memoryUsage: new Gauge({
    name: "ees_memory_usage_bytes",
    help: "Memory usage by type",
    labelNames: ["type"],
  }),

  activeConnections: new Gauge({
    name: "ees_active_connections",
    help: "Number of active connections by type",
    labelNames: ["type"],
  }),
})

/**
 * Metrics service implementation
 */
class MetricsServiceImpl implements MetricsService {
  private readonly metrics: Metrics

  constructor() {
    // Enable default system metrics collection
    collectDefaultMetrics({ prefix: "ees_" })

    const business = createBusinessMetrics()
    const system = createSystemMetrics()

    this.metrics = {
      business,
      system,
      registry: register,
    }
  }

  getMetrics = (): Effect.Effect<Metrics> =>
    Effect.succeed(this.metrics)

  recordEmbeddingCreated = (
    provider: string,
    model: string,
    duration: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.embeddingCreated.inc({ provider, model })
      this.metrics.business.embeddingCreationDuration.observe({ provider, model }, duration)
    })

  recordEmbeddingError = (
    provider: string,
    model: string,
    errorType: string
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.embeddingCreationErrors.inc({ provider, model, error_type: errorType })
    })

  recordSearchOperation = (
    metricType: string,
    duration: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.searchOperations.inc({ metric_type: metricType })
      this.metrics.business.searchDuration.observe({ metric_type: metricType }, duration)
    })

  recordBatchOperation = (
    operationType: string,
    batchSize: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.batchOperations.inc({ operation_type: operationType })
      this.metrics.business.batchSize.observe({ operation_type: operationType }, batchSize)
    })

  recordProviderRequest = (
    provider: string,
    operation: string,
    duration: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.providerRequests.inc({ provider, operation })
      this.metrics.business.providerDuration.observe({ provider, operation }, duration)
    })

  recordProviderError = (
    provider: string,
    errorType: string
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.business.providerErrors.inc({ provider, error_type: errorType })
    })

  recordHttpRequest = (
    method: string,
    route: string,
    statusCode: string,
    duration: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.system.httpRequests.inc({ method, route, status_code: statusCode })
      this.metrics.system.httpDuration.observe({ method, route }, duration)
    })

  recordRateLimitViolation = (
    endpoint: string,
    limitType: string
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.system.rateLimitViolations.inc({ endpoint, limit_type: limitType })
    })

  updateDatabaseConnections = (
    pool: string,
    count: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.system.databaseConnections.set({ pool }, count)
    })

  recordDatabaseQuery = (
    operation: string,
    duration: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.system.databaseQueryDuration.observe({ operation }, duration)
    })

  updateMemoryUsage = (): Effect.Effect<void> =>
    Effect.sync(() => {
      const memUsage = process.memoryUsage()
      this.metrics.system.memoryUsage.set({ type: "heap_used" }, memUsage.heapUsed)
      this.metrics.system.memoryUsage.set({ type: "heap_total" }, memUsage.heapTotal)
      this.metrics.system.memoryUsage.set({ type: "rss" }, memUsage.rss)
      this.metrics.system.memoryUsage.set({ type: "external" }, memUsage.external)
    })

  updateActiveConnections = (
    type: string,
    count: number
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      this.metrics.system.activeConnections.set({ type }, count)
    })

  getPrometheusMetrics = (): Effect.Effect<string> =>
    Effect.promise(() => this.metrics.registry.metrics())
}

/**
 * Metrics service tag for dependency injection
 */
export const MetricsServiceTag = Context.GenericTag<MetricsService>("MetricsService")

/**
 * Create metrics service layer
 */
export const MetricsLayer = Layer.succeed(
  MetricsServiceTag,
  new MetricsServiceImpl()
)

/**
 * Convenience functions for metrics recording
 */
export const metrics = {
  recordEmbeddingCreated: (provider: string, model: string, duration: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordEmbeddingCreated(provider, model, duration)
    }),

  recordEmbeddingError: (provider: string, model: string, errorType: string) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordEmbeddingError(provider, model, errorType)
    }),

  recordSearchOperation: (metricType: string, duration: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordSearchOperation(metricType, duration)
    }),

  recordBatchOperation: (operationType: string, batchSize: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordBatchOperation(operationType, batchSize)
    }),

  recordProviderRequest: (provider: string, operation: string, duration: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordProviderRequest(provider, operation, duration)
    }),

  recordProviderError: (provider: string, errorType: string) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordProviderError(provider, errorType)
    }),

  recordHttpRequest: (method: string, route: string, statusCode: string, duration: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordHttpRequest(method, route, statusCode, duration)
    }),

  recordRateLimitViolation: (endpoint: string, limitType: string) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordRateLimitViolation(endpoint, limitType)
    }),

  updateDatabaseConnections: (pool: string, count: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.updateDatabaseConnections(pool, count)
    }),

  recordDatabaseQuery: (operation: string, duration: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.recordDatabaseQuery(operation, duration)
    }),

  updateMemoryUsage: () =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.updateMemoryUsage()
    }),

  updateActiveConnections: (type: string, count: number) =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      yield* service.updateActiveConnections(type, count)
    }),

  getPrometheusMetrics: () =>
    Effect.gen(function* () {
      const service = yield* MetricsServiceTag
      return yield* service.getPrometheusMetrics()
    }),
}

/**
 * Helper to time operations and record metrics
 */
export const withMetricsTimer = <R, E, A>(
  operation: Effect.Effect<A, E, R>,
  recorder: (duration: number) => Effect.Effect<void>
): Effect.Effect<A, E, R | MetricsService> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    const result = yield* operation
    const duration = (Date.now() - startTime) / 1000 // Convert to seconds
    yield* recorder(duration)
    return result
  })