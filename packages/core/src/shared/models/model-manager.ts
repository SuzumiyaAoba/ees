/**
 * Model Manager implementation
 * Manages model information, compatibility, and migration operations
 */

import { count, eq, sql } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { DatabaseService } from "@/core/shared/database/connection"
import { embeddings } from "@/core/shared/database/schema"
import { DatabaseQueryError } from "@/core/shared/errors/database"
import {
  EmbeddingProviderService,
  type EmbeddingRequest,
  type ModelInfo as ProviderModelInfo,
} from "@/core/shared/providers"
import type {
  ModelManagerInfo,
  ModelCompatibility,
  MigrationResult,
  MigrationOptions,
  ModelManager as IModelManager,
  ModelManagerError,
} from "./types"
import {
  ModelNotFoundError,
  ModelIncompatibleError,
  MigrationError,
} from "./types"

/**
 * Default migration options
 */
const defaultMigrationOptions: Required<MigrationOptions> = {
  preserveOriginal: false,
  batchSize: 100,
  continueOnError: true,
  metadata: {},
}

/**
 * Model Manager service implementation
 */
const make = Effect.gen(function* () {
  const providerService = yield* EmbeddingProviderService
  const databaseService = yield* DatabaseService

  const mapProviderModelInfo = (providerModel: ProviderModelInfo): ModelManagerInfo => ({
    name: providerModel.name,
    displayName: providerModel.name,
    provider: providerModel.provider,
    dimensions: providerModel.dimensions || 768, // Default if not specified
    maxTokens: providerModel.maxTokens || 8192, // Default if not specified
    pricePerToken: providerModel.pricePerToken,
    available: true, // Assume available if listed
    description: `${providerModel.provider} model: ${providerModel.name}`,
  })

  const listAvailableModels = (): Effect.Effect<ModelManagerInfo[], ModelManagerError> =>
    Effect.gen(function* () {
      const providerModels = yield* providerService.listModels()
      return providerModels.map(mapProviderModelInfo)
    })

  const getModelInfo = (modelName: string): Effect.Effect<ModelManagerInfo, ModelManagerError> =>
    Effect.gen(function* () {
      const providerModelInfo = yield* providerService.getModelInfo(modelName)
      if (providerModelInfo === null) {
        return yield* Effect.fail(
          new ModelNotFoundError(`Model '${modelName}' not found`, modelName)
        )
      }
      return mapProviderModelInfo(providerModelInfo)
    }).pipe(
      Effect.catchTag("ProviderModelError", (error) =>
        Effect.fail(
          new ModelNotFoundError(`Model '${modelName}' not found: ${error.message}`, modelName)
        )
      )
    )

  const validateModelCompatibility = (
    sourceModel: string,
    targetModel: string
  ): Effect.Effect<ModelCompatibility, ModelManagerError> =>
    Effect.gen(function* () {
      const sourceInfo = yield* getModelInfo(sourceModel)
      const targetInfo = yield* getModelInfo(targetModel)

      // Check if dimensions match (most important compatibility factor)
      if (sourceInfo.dimensions !== targetInfo.dimensions) {
        return {
          compatible: false,
          reason: `Different vector dimensions: ${sourceInfo.dimensions} vs ${targetInfo.dimensions}`,
          similarityScore: 0.0,
        }
      }

      // Calculate similarity score based on various factors
      let similarityScore = 1.0

      // Different providers might have slight compatibility differences
      if (sourceInfo.provider !== targetInfo.provider) {
        similarityScore -= 0.1
      }

      // Different max tokens might affect compatibility
      const tokenRatio = Math.min(sourceInfo.maxTokens, targetInfo.maxTokens) /
                        Math.max(sourceInfo.maxTokens, targetInfo.maxTokens)
      similarityScore *= tokenRatio

      // Language support compatibility
      if (sourceInfo.languages && targetInfo.languages) {
        const commonLanguages = sourceInfo.languages.filter(lang =>
          targetInfo.languages!.includes(lang)
        )
        const languageCompatibility = commonLanguages.length /
                                    Math.max(sourceInfo.languages.length, targetInfo.languages.length)
        similarityScore *= languageCompatibility
      }

      return {
        compatible: true,
        similarityScore: Math.max(0, Math.min(1, similarityScore)),
      }
    })

  const getModelDimensions = (modelName: string): Effect.Effect<number, ModelManagerError> =>
    Effect.gen(function* () {
      const modelInfo = yield* getModelInfo(modelName)
      return modelInfo.dimensions
    })

  const isModelAvailable = (modelName: string): Effect.Effect<boolean, ModelManagerError> =>
    Effect.gen(function* () {
      const modelInfo = yield* getModelInfo(modelName)
      return modelInfo.available
    }).pipe(
      Effect.catchTag("ModelNotFoundError", () => Effect.succeed(false))
    )

  const migrateEmbeddings = (
    fromModel: string,
    toModel: string,
    options?: MigrationOptions
  ): Effect.Effect<MigrationResult, ModelManagerError> =>
    Effect.gen(function* () {
      const opts = { ...defaultMigrationOptions, ...options }
      const startTime = Date.now()

      // Validate model compatibility
      const compatibility = yield* validateModelCompatibility(fromModel, toModel)
      if (!compatibility.compatible) {
        return yield* Effect.fail(
          new ModelIncompatibleError(
            `Cannot migrate from ${fromModel} to ${toModel}: ${compatibility.reason}`,
            fromModel,
            toModel,
            compatibility.reason!
          )
        )
      }

      // Get all embeddings with the source model
      const embeddingsToMigrate = yield* Effect.tryPromise({
        try: () =>
          databaseService.db
            .select()
            .from(embeddings)
            .where(eq(embeddings.modelName, fromModel)),
        catch: (error) => new DatabaseQueryError({
          message: "Failed to fetch embeddings for migration",
          cause: error,
        }),
      })

      if (embeddingsToMigrate.length === 0) {
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          duration: Date.now() - startTime,
          details: [],
        }
      }

      let successful = 0
      let failed = 0
      const details: MigrationResult["details"] = []

      // Process embeddings in batches
      for (let i = 0; i < embeddingsToMigrate.length; i += opts.batchSize) {
        const batch = embeddingsToMigrate.slice(i, i + opts.batchSize)

        for (const embedding of batch) {
          try {
            // Generate new embedding with target model
            const embeddingRequest: EmbeddingRequest = {
              text: embedding.text,
              modelName: toModel,
            }

            const newEmbeddingResult = yield* providerService.generateEmbedding(embeddingRequest)

            // Update the embedding in database
            yield* Effect.tryPromise({
              try: () =>
                databaseService.db
                  .update(embeddings)
                  .set({
                    modelName: toModel,
                    embedding: new Uint8Array(Buffer.from(JSON.stringify(newEmbeddingResult.embedding))),
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                  })
                  .where(eq(embeddings.id, embedding.id)),
              catch: (error) => new DatabaseQueryError({
                message: `Failed to update embedding ${embedding.id}`,
                cause: error,
              }),
            })

            successful++
            details.push({
              id: embedding.id,
              uri: embedding.uri,
              status: "success",
            })
          } catch (error) {
            failed++
            details.push({
              id: embedding.id,
              uri: embedding.uri,
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            })

            if (!opts.continueOnError) {
              return yield* Effect.fail(
                new MigrationError(`Migration failed for embedding ${embedding.id}`, error)
              )
            }
          }
        }
      }

      return {
        totalProcessed: embeddingsToMigrate.length,
        successful,
        failed,
        duration: Date.now() - startTime,
        details,
      }
    })

  const getModelUsageStats = (): Effect.Effect<Record<string, number>, ModelManagerError> =>
    Effect.gen(function* () {
      const stats = yield* Effect.tryPromise({
        try: () =>
          databaseService.db
            .select({
              model_name: embeddings.modelName,
              count: count(),
            })
            .from(embeddings)
            .groupBy(embeddings.modelName),
        catch: (error) => new DatabaseQueryError({
          message: "Failed to fetch model usage statistics",
          cause: error,
        }),
      })

      const result: Record<string, number> = {}
      for (const stat of stats) {
        result[stat.model_name] = stat.count
      }

      return result
    })

  return {
    listAvailableModels,
    getModelInfo,
    validateModelCompatibility,
    getModelDimensions,
    isModelAvailable,
    migrateEmbeddings,
    getModelUsageStats,
  } as const
})

/**
 * Model Manager context tag
 */
export const ModelManager = Context.GenericTag<IModelManager>("ModelManager")

/**
 * Live implementation layer for Model Manager
 */
export const ModelManagerLive = Layer.effect(ModelManager, make)

// Re-export types for convenience
export type {
  ModelManagerInfo,
  ModelCompatibility,
  MigrationResult,
  MigrationOptions,
  ModelManagerError,
} from "./types"

export {
  ModelNotFoundError,
  ModelIncompatibleError,
  MigrationError,
} from "./types"