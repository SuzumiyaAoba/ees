/**
 * Console wrapper for CLI applications
 * Provides a clean interface for CLI output while satisfying linting rules
 */

export function log(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI output is intentional
  console.log(message)
}

export function error(message: string): void {
  // biome-ignore lint/suspicious/noConsole: CLI error output is intentional
  console.error(message)
}
