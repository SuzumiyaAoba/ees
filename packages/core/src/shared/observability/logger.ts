/**
 * Structured logging system for EES
 * Provides production-ready logging with correlation IDs, structured data, and environment-based configuration
 */

import { Context, Layer, Effect } from "effect"
import pino, { type Logger as PinoLogger } from "pino"

/**
 * Log levels supported by the system
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

/**
 * Base log context that can be attached to all log entries
 */
export interface LogContext {
  readonly requestId?: string
  readonly userId?: string
  readonly operation?: string
  readonly provider?: string
  readonly modelName?: string
  readonly [key: string]: unknown
}

/**
 * Sensitive field patterns that should be redacted from logs
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /auth/i,
  /token/i,
  /password/i,
  /secret/i,
  /credential/i,
  /private[_-]?key/i,
] as const

/**
 * Check if a key name suggests sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
}

/**
 * Sanitize sensitive data from log context
 * Recursively redacts values for keys that match sensitive patterns
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) {
      // Redact sensitive values
      sanitized[key] = "[REDACTED]"
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as LogContext)
    } else if (Array.isArray(value)) {
      // Sanitize arrays of objects
      sanitized[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? sanitizeContext(item as LogContext)
          : item
      )
    } else {
      // Keep non-sensitive primitive values
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Logger service interface
 */
export interface Logger {
  readonly trace: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly debug: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly info: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly warn: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly error: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly fatal: (message: string, context?: LogContext) => Effect.Effect<void>
  readonly withContext: (context: LogContext) => Logger
}

/**
 * Logger implementation using Pino
 */
class PinoLoggerService implements Logger {
  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly baseContext: LogContext = {}
  ) {}

  trace = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.trace(sanitized, message)
    })

  debug = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.debug(sanitized, message)
    })

  info = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.info(sanitized, message)
    })

  warn = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.warn(sanitized, message)
    })

  error = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.error(sanitized, message)
    })

  fatal = (message: string, context?: LogContext): Effect.Effect<void> =>
    Effect.sync(() => {
      const sanitized = context ? sanitizeContext({ ...this.baseContext, ...context }) : this.baseContext
      this.pinoLogger.fatal(sanitized, message)
    })

  withContext = (context: LogContext): Logger =>
    new PinoLoggerService(this.pinoLogger, { ...this.baseContext, ...context })
}

/**
 * Logger service tag for dependency injection
 */
export const LoggerService = Context.GenericTag<Logger>("LoggerService")

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  readonly level: LogLevel
  readonly development?: boolean
  readonly serviceName?: string
  readonly version?: string
}

/**
 * Create logger configuration from environment
 */
export const createLoggerConfig = (): LoggerConfig => ({
  level: (process.env['LOG_LEVEL'] as LogLevel) ||
         (process.env['NODE_ENV'] === 'development' ? 'debug' :
          process.env['NODE_ENV'] === 'test' ? 'warn' : 'info'),
  development: process.env['NODE_ENV'] === 'development',
  serviceName: process.env['SERVICE_NAME'] || 'ees-api',
  version: process.env['SERVICE_VERSION'] || '1.0.0',
})

/**
 * Create Pino logger instance with configuration
 */
export const createPinoLogger = (config: LoggerConfig): PinoLogger => {
  const pinoConfig: pino.LoggerOptions = {
    name: config.serviceName || 'ees-api',
    level: config.level,
    // Format for development vs production
    ...(config.development
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          // Production JSON format
          formatters: {
            level: (label: string) => ({ level: label }),
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        }),
    base: {
      service: config.serviceName || 'ees-api',
      version: config.version || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
    },
  }

  return pino(pinoConfig)
}

/**
 * Create logger layer for dependency injection
 */
export const createLoggerLayer = (config?: LoggerConfig): Layer.Layer<Logger> => {
  const loggerConfig = config || createLoggerConfig()

  return Layer.succeed(
    LoggerService,
    new PinoLoggerService(createPinoLogger(loggerConfig))
  )
}

/**
 * Default logger layer using environment configuration
 */
export const LoggerLayer = createLoggerLayer()

/**
 * Convenience functions for common logging patterns
 */
export const log = {
  trace: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.trace(message, context)
    }),

  debug: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.debug(message, context)
    }),

  info: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.info(message, context)
    }),

  warn: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.warn(message, context)
    }),

  error: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.error(message, context)
    }),

  fatal: (message: string, context?: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      yield* logger.fatal(message, context)
    }),

  withContext: (context: LogContext) =>
    Effect.gen(function* () {
      const logger = yield* LoggerService
      return logger.withContext(context)
    }),
}

/**
 * Helper for operation logging with automatic context
 */
export const withOperationLogging = <R, E, A>(
  operation: string,
  effect: Effect.Effect<A, E, R>,
  context?: LogContext
): Effect.Effect<A, E, R | Logger> =>
  Effect.gen(function* () {
    const logger = yield* LoggerService
    const operationLogger = logger.withContext({ operation, ...context })

    yield* operationLogger.debug(`Starting ${operation}`)

    const result = yield* Effect.either(effect)

    if (result._tag === "Left") {
      yield* operationLogger.error(`Failed ${operation}`, {
        error: String(result.left)
      })
      return yield* Effect.fail(result.left)
    } else {
      yield* operationLogger.debug(`Completed ${operation}`)
      return result.right
    }
  })