/**
 * Environment variable access helpers
 * Provides type-safe access to environment variables while maintaining
 * compatibility with both TypeScript strict mode and Biome linting rules
 */

/**
 * Get environment variable with proper typing
 * @param key - Environment variable key
 * @returns Environment variable value or undefined
 */
export function getEnv(key: string): string | undefined {
  return process.env[key]
}

/**
 * Get environment variable with default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if environment variable is not set
 * @returns Environment variable value or default value
 */
export function getEnvWithDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/**
 * Check if running in test environment
 * @returns True if NODE_ENV is set to "test"
 */
export function isTestEnv(): boolean {
  return process.env['NODE_ENV'] === "test"
}

/**
 * Get port number from environment with default fallback
 * @param defaultPort - Default port number
 * @returns Port number
 */
export function getPort(defaultPort = 3000): number {
  return Number(process.env['PORT']) || defaultPort
}

/**
 * Get numeric environment variable with default fallback
 * @param key - Environment variable key
 * @param defaultValue - Default value if environment variable is not set or invalid
 * @returns Numeric value
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (!value) return defaultValue

  const parsed = Number(value)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

/**
 * Get boolean environment variable with default fallback
 * Values "true", "1", "yes" are considered true (case-insensitive)
 * Values "false", "0", "no" are considered false (case-insensitive)
 * @param key - Environment variable key
 * @param defaultValue - Default value if environment variable is not set
 * @returns Boolean value
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (!value) return defaultValue

  const normalized = value.toLowerCase().trim()
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false
  }

  return defaultValue
}
