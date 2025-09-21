/**
 * Model management types and interfaces
 * Provides unified model information and compatibility management across providers
 */

import type { Effect } from "effect"
import type {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError
} from "../providers/types"
import type { DatabaseQueryError } from "../errors/database"

/**
 * Comprehensive model information for model management
 * Extends the base provider ModelInfo with additional management features
 */
export interface ModelManagerInfo {
  /** Model identifier as recognized by the provider */
  readonly name: string
  /** Human-readable display name */
  readonly displayName?: string
  /** Provider that hosts this model */
  readonly provider: string
  /** Vector dimensions produced by this model */
  readonly dimensions: number
  /** Maximum input text length in tokens */
  readonly maxTokens: number
  /** Cost per token for using this model */
  readonly pricePerToken?: number | undefined
  /** Model description */
  readonly description?: string
  /** Whether the model is currently available */
  readonly available: boolean
  /** Model version or revision */
  readonly version?: string
  /** Supported languages */
  readonly languages?: string[]
  /** Model-specific metadata */
  readonly metadata?: Record<string, unknown>
}

/**
 * Model compatibility information
 */
export interface ModelCompatibility {
  /** Whether models can be used interchangeably */
  readonly compatible: boolean
  /** Reason for incompatibility if applicable */
  readonly reason?: string
  /** Similarity score between models (0-1) */
  readonly similarityScore?: number
}

/**
 * Migration operation result
 */
export interface MigrationResult {
  /** Total number of embeddings processed */
  readonly totalProcessed: number
  /** Number of successfully migrated embeddings */
  readonly successful: number
  /** Number of failed migrations */
  readonly failed: number
  /** Migration duration in milliseconds */
  readonly duration: number
  /** Detailed results per embedding */
  readonly details: Array<{
    readonly id: number
    readonly uri: string
    readonly status: "success" | "error"
    readonly error?: string
  }>
}

/**
 * Migration configuration options
 */
export interface MigrationOptions {
  /** Whether to preserve original embeddings during migration */
  readonly preserveOriginal?: boolean
  /** Batch size for processing */
  readonly batchSize?: number
  /** Whether to continue on individual failures */
  readonly continueOnError?: boolean
  /** Custom metadata to add to migrated embeddings */
  readonly metadata?: Record<string, unknown>
}

/**
 * Model management specific errors
 */
export class ModelNotFoundError {
  readonly _tag = "ModelNotFoundError"
  constructor(
    public readonly message: string,
    public readonly modelName: string
  ) {}
}

export class ModelIncompatibleError {
  readonly _tag = "ModelIncompatibleError"
  constructor(
    public readonly message: string,
    public readonly sourceModel: string,
    public readonly targetModel: string,
    public readonly reason: string
  ) {}
}

export class MigrationError {
  readonly _tag = "MigrationError"
  constructor(
    public readonly message: string,
    public readonly cause?: unknown
  ) {}
}

/**
 * Union type for all model management errors
 */
export type ModelManagerError =
  | ModelNotFoundError
  | ModelIncompatibleError
  | MigrationError
  | ProviderConnectionError
  | ProviderAuthenticationError
  | ProviderModelError
  | ProviderRateLimitError
  | DatabaseQueryError

/**
 * Model manager service interface
 */
export interface ModelManager {
  /**
   * List all available models across all configured providers
   */
  readonly listAvailableModels: () => Effect.Effect<ModelManagerInfo[], ModelManagerError>

  /**
   * Get detailed information about a specific model
   */
  readonly getModelInfo: (modelName: string) => Effect.Effect<ModelManagerInfo, ModelManagerError>

  /**
   * Validate if a model is compatible with existing embeddings
   */
  readonly validateModelCompatibility: (
    sourceModel: string,
    targetModel: string
  ) => Effect.Effect<ModelCompatibility, ModelManagerError>

  /**
   * Get the vector dimensions for a specific model
   */
  readonly getModelDimensions: (modelName: string) => Effect.Effect<number, ModelManagerError>

  /**
   * Check if a model is currently available and accessible
   */
  readonly isModelAvailable: (modelName: string) => Effect.Effect<boolean, ModelManagerError>

  /**
   * Migrate embeddings from one model to another
   */
  readonly migrateEmbeddings: (
    fromModel: string,
    toModel: string,
    options?: MigrationOptions
  ) => Effect.Effect<MigrationResult, ModelManagerError>

  /**
   * Get usage statistics for models
   */
  readonly getModelUsageStats: () => Effect.Effect<Record<string, number>, ModelManagerError>
}