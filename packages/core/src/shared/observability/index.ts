/**
 * Observability system exports
 * Centralized exports for logging, metrics, health checks, and correlation
 */

// Logging
export * from './logger'

// Metrics
export * from './metrics'

// Health checks
export * from './health'

// Correlation and tracing
export * from './correlation'

// Combined observability layer
import { Layer } from 'effect'
import { LoggerLayer } from './logger'
import { MetricsLayer } from './metrics'
import { HealthLayer } from './health'
import { CorrelationLayer } from './correlation'

/**
 * Combined observability layer with all services
 */
export const ObservabilityLayer = Layer.mergeAll(
  LoggerLayer,
  MetricsLayer,
  HealthLayer,
  CorrelationLayer
)