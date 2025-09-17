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
  // biome-ignore lint/style/noNonNullAssertion: NODE_ENV is always defined in Node.js
  return process.env.NODE_ENV! === "test"
}

/**
 * Get port number from environment with default fallback
 * @param defaultPort - Default port number
 * @returns Port number
 */
export function getPort(defaultPort = 3000): number {
  // biome-ignore lint/style/noNonNullAssertion: PORT is commonly defined environment variable
  return Number(process.env.PORT!) || defaultPort
}
