/**
 * Generic provider configuration factory
 * Eliminates code duplication in provider configuration functions
 */

import { getEnv, getEnvWithDefault } from "../lib/env"
import type { ProviderConfig } from "../providers/types"

/**
 * Configuration template for creating provider configurations
 */
export interface ProviderConfigTemplate<T extends ProviderConfig> {
  readonly type: T['type']
  readonly requiredEnvKeys: {
    readonly apiKey?: string
    readonly baseUrl?: string
    readonly [key: string]: string | undefined
  }
  readonly optionalEnvKeys: {
    readonly baseUrl?: string
    readonly organization?: string
    readonly apiVersion?: string
    readonly [key: string]: string | undefined
  }
  readonly defaults: {
    readonly model: string
    readonly baseUrl?: string
    readonly [key: string]: any
  }
  readonly transform?: (baseConfig: any) => T
}

/**
 * Create a provider configuration from a template
 * @param template Configuration template defining env vars and defaults
 * @returns Provider configuration or null if required env vars are missing
 */
export function createProviderConfig<T extends ProviderConfig>(
  template: ProviderConfigTemplate<T>
): T | null {
  // Check required environment variables
  const required = template.requiredEnvKeys
  const missingRequired: string[] = []

  // Build base configuration object
  const config: any = {
    type: template.type,
  }

  // Handle required API key
  if (required.apiKey) {
    const apiKey = getEnv(required.apiKey)
    if (!apiKey) {
      return null
    }
    config.apiKey = apiKey
  }

  // Handle required base URL
  if (required.baseUrl) {
    const baseUrl = getEnv(required.baseUrl)
    if (!baseUrl) {
      return null
    }
    config.baseUrl = baseUrl
  }

  // Handle other required environment variables
  for (const [configKey, envKey] of Object.entries(required)) {
    if (configKey !== 'apiKey' && configKey !== 'baseUrl' && envKey) {
      const value = getEnv(envKey)
      if (!value) {
        missingRequired.push(envKey)
      } else {
        config[configKey] = value
      }
    }
  }

  // Return null if any required variables are missing
  if (missingRequired.length > 0) {
    return null
  }

  // Add default model
  const modelEnvKey = template.optionalEnvKeys?.['defaultModel'] ||
                     `EES_${template.type.toUpperCase()}_DEFAULT_MODEL`

  config.defaultModel = getEnvWithDefault(modelEnvKey, template.defaults.model)

  // Add default base URL if not already set and defined in defaults
  if (!config.baseUrl && template.defaults.baseUrl) {
    const baseUrlEnvKey = template.optionalEnvKeys['baseUrl'] ||
                         `EES_${template.type.toUpperCase()}_BASE_URL`
    config.baseUrl = getEnvWithDefault(baseUrlEnvKey, template.defaults.baseUrl)
  }

  // Add optional environment variables
  for (const [configKey, envKey] of Object.entries(template.optionalEnvKeys)) {
    if (configKey !== 'defaultModel' && envKey) {
      const value = getEnv(envKey)
      if (value) {
        config[configKey] = value
      }
    }
  }

  // Apply custom transformation if provided
  return template.transform ? template.transform(config) : (config as T)
}

/**
 * Create a simple provider configuration without API key requirement
 * Used for providers like Ollama that don't require authentication
 */
export function createSimpleProviderConfig<T extends ProviderConfig>(
  template: Omit<ProviderConfigTemplate<T>, 'requiredEnvKeys'> & {
    requiredEnvKeys?: never
  }
): T {
  // Build base configuration
  const config: any = {
    type: template.type,
  }

  // Add default model
  const defaultModelEnvKey = `EES_${template.type.toUpperCase()}_DEFAULT_MODEL`
  config.defaultModel = getEnvWithDefault(defaultModelEnvKey, template.defaults.model)

  // Add default base URL
  if (template.defaults.baseUrl) {
    const baseUrlEnvKey = template.optionalEnvKeys?.['baseUrl'] ||
                         `EES_${template.type.toUpperCase()}_BASE_URL`
    config.baseUrl = getEnvWithDefault(baseUrlEnvKey, template.defaults.baseUrl)
  }

  // Add optional environment variables
  if (template.optionalEnvKeys) {
    for (const [configKey, envKey] of Object.entries(template.optionalEnvKeys)) {
      if (configKey !== 'baseUrl' && configKey !== 'defaultModel' && envKey) {
        const value = getEnv(envKey)
        if (value) {
          config[configKey] = value
        }
      }
    }
  }

  // Apply custom transformation if provided
  return template.transform ? template.transform(config) : (config as T)
}