/**
 * CLI Logger for user-facing output
 * Provides clean, formatted output for CLI applications
 * This is separate from structured logging (LoggerService) and should only be used for user-facing messages
 */

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const

/**
 * Check if output supports colors
 */
const supportsColor = (): boolean => {
  return (
    process.stdout.isTTY &&
    process.env["TERM"] !== "dumb" &&
    process.env["NO_COLOR"] === undefined
  )
}

/**
 * Format message with color if supported
 */
function formatMessage(message: string, color?: string): string {
  if (!supportsColor() || !color) {
    return message
  }
  return `${color}${message}${colors.reset}`
}

/**
 * Standard output for informational messages
 */
export function log(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI output is intentional
  console.log(message)
}

/**
 * Output for success messages
 */
export function success(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI output is intentional
  console.log(formatMessage(`✓ ${message}`, colors.green))
}

/**
 * Output for error messages
 */
export function error(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI error output is intentional
  console.error(formatMessage(`✗ ${message}`, colors.red))
}

/**
 * Output for warning messages
 */
export function warn(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI warning output is intentional
  console.warn(formatMessage(`⚠ ${message}`, colors.yellow))
}

/**
 * Output for info messages
 */
export function info(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI info output is intentional
  console.log(formatMessage(`ℹ ${message}`, colors.blue))
}

/**
 * Output for debug messages
 */
export function debug(message: string): void {
  if (process.env["DEBUG"] === "true") {
    // biome-ignore lint/suspicious/noConsole: CLI debug output is intentional
    console.log(formatMessage(`[DEBUG] ${message}`, colors.dim))
  }
}

/**
 * Format table data for CLI output
 */
export function table(data: Array<Record<string, unknown>>): void {
  // biome-ignore lint/suspicious/noConsole: CLI table output is intentional
  console.table(data)
}

/**
 * Output JSON data (for programmatic consumption)
 */
export function json(data: unknown): void {
  // biome-ignore lint/suspicious/noConsole: CLI JSON output is intentional
  console.log(JSON.stringify(data, null, 2))
}
