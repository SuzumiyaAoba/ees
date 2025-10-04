/**
 * Shared utilities for provider implementations
 * Eliminates code duplication across all embedding providers
 */

import { Effect } from "effect"
import type { ModelInfo } from "./types"

/**
 * Generic implementation of isModelAvailable
 * Works for any provider by checking if model exists in the model list
 *
 * @param listModels - Effect that returns the list of available models
 * @param modelName - Name of the model to check
 * @param normalize - Optional function to normalize model names before comparison
 * @returns Effect that resolves to true if model is available
 */
export const createIsModelAvailable = (
  listModels: () => Effect.Effect<ModelInfo[], any>,
  normalize?: (name: string) => string
) => (modelName: string) =>
  Effect.gen(function* () {
    const models = yield* listModels()
    const searchName = normalize ? normalize(modelName) : modelName

    return models.some((model) => {
      const modelNameToCheck = normalize ? normalize(model.name) : model.name
      return (
        modelNameToCheck === searchName ||
        modelNameToCheck.includes(searchName) ||
        searchName.includes(modelNameToCheck)
      )
    })
  })

/**
 * Generic implementation of getModelInfo
 * Works for any provider by finding model in the model list
 *
 * @param listModels - Effect that returns the list of available models
 * @param modelName - Name of the model to retrieve info for
 * @param normalize - Optional function to normalize model names before comparison
 * @returns Effect that resolves to ModelInfo or null if not found
 */
export const createGetModelInfo = (
  listModels: () => Effect.Effect<ModelInfo[], any>,
  normalize?: (name: string) => string
) => (modelName: string) =>
  Effect.gen(function* () {
    const models = yield* listModels()
    const searchName = normalize ? normalize(modelName) : modelName

    const model = models.find((m) => {
      const modelNameToCheck = normalize ? normalize(m.name) : m.name
      return (
        modelNameToCheck === searchName ||
        modelNameToCheck.includes(searchName) ||
        searchName.includes(modelNameToCheck)
      )
    })

    return model ?? null
  })

/**
 * Normalize model name by removing version suffixes
 * Useful for providers like Ollama that use version tags
 *
 * @param modelName - Model name potentially with version suffix
 * @returns Normalized model name without version
 */
export const normalizeModelName = (modelName: string): string => {
  return modelName.replace(/:latest$/, '').replace(/:[\w\-\.]+$/, '')
}

/**
 * Get default model name with fallback chain
 *
 * @param requestModel - Model specified in the request
 * @param configModel - Model specified in provider config
 * @param defaultFallback - Final fallback default model
 * @returns The resolved model name
 */
export const resolveModelName = (
  requestModel: string | undefined,
  configModel: string | undefined,
  defaultFallback: string
): string => {
  return requestModel ?? configModel ?? defaultFallback
}
