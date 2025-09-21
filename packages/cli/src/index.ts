/**
 * CLI Entry Point for EES (Embeddings Service)
 *
 * Provides command-line interface for embedding operations
 * using the same core business logic as the web API.
 */

import { Effect } from "effect"
import {
  EmbeddingApplicationService,
  ApplicationLayer,
  parseBatchFile,
  readStdin,
  readTextFile,
  processFiles,
  log,
  error,
  ModelManagerTag,
} from "@ees/core"

/**
 * CLI Commands Interface
 */
export interface CLICommands {
  /**
   * Create embedding from text file or stdin
   */
  create(options: {
    uri: string
    text?: string
    file?: string
    model?: string
  }): Effect.Effect<void, Error, never>

  /**
   * Create multiple embeddings from batch file
   */
  batch(options: { file: string; model?: string }): Effect.Effect<void, Error, never>

  /**
   * Search for similar embeddings
   */
  search(options: {
    query: string
    model?: string
    limit?: number
    threshold?: number
    metric?: "cosine" | "euclidean" | "dot_product"
  }): Effect.Effect<void, Error, never>

  /**
   * List all embeddings with optional filters
   */
  list(options: {
    uri?: string
    model?: string
    page?: number
    limit?: number
  }): Effect.Effect<void, Error, never>

  /**
   * Get embedding by URI
   */
  get(options: { uri: string }): Effect.Effect<void, Error, never>

  /**
   * Delete embedding by ID
   */
  delete(options: { id: number }): Effect.Effect<void, Error, never>

  /**
   * List available models
   */
  models(): Effect.Effect<void, Error, never>

  /**
   * Upload files and create embeddings
   */
  upload(options: {
    files: string[]
    model?: string
  }): Effect.Effect<void, Error, never>

  /**
   * Migrate embeddings between models
   */
  migrate(options: {
    fromModel: string
    toModel: string
    dryRun?: boolean
  }): Effect.Effect<void, Error, never>

  /**
   * Provider management commands
   */
  providers(options: {
    action: "list" | "current" | "models" | "ollama-status"
    provider?: string
  }): Effect.Effect<void, Error, never>
}

/**
 * CLI Commands implementation using core application services
 */
const makeCLICommands = Effect.gen(function* () {
  const appService = yield* EmbeddingApplicationService
  const modelManager = yield* ModelManagerTag

  const create = ((options: {
    uri: string
    text?: string
    file?: string
    model?: string
  }) =>
    Effect.gen(function* () {
      // Text input handling (from parameter, file, or stdin)
      let text = options.text

      if (!text && options.file) {
        text = yield* readTextFile(options.file)
      }

      if (!text) {
        log("Reading from stdin... (press Ctrl+D when finished)")
        text = yield* readStdin()
      }

      if (!text || text.trim().length === 0) {
        return yield* Effect.fail(new Error("No text provided"))
      }

      const result = yield* appService.createEmbedding({
        uri: options.uri,
        text,
        modelName: options.model,
      })

      log(`Created embedding: ${result.id} for ${result.uri}`)
    })) as unknown as (options: {
    uri: string
    text?: string
    file?: string
    model?: string
  }) => Effect.Effect<void, Error, never>

  const batch = ((options: { file: string; model?: string }) =>
    Effect.gen(function* () {
      const batchEntries = yield* parseBatchFile(options.file)

      const batchRequest = {
        texts: batchEntries,
        model_name: options.model,
      }

      const result = yield* appService.createBatchEmbeddings(batchRequest)

      log(
        `Batch complete: ${result.successful}/${result.total} successful`
      )
    })) as unknown as (options: { file: string; model?: string }) => Effect.Effect<void, Error, never>

  const search = ((options: {
    query: string
    model?: string
    limit?: number
    threshold?: number
    metric?: "cosine" | "euclidean" | "dot_product"
  }) =>
    Effect.gen(function* () {
      const result = yield* appService.searchEmbeddings({
        query: options.query,
        model_name: options.model,
        limit: options.limit,
        threshold: options.threshold,
        metric: options.metric,
      })

      log(`Found ${result.count} similar embeddings:`)
      for (const item of result.results) {
        log(`- ${item.uri} (similarity: ${item.similarity.toFixed(3)})`)
      }
    })) as unknown as (options: {
    query: string
    model?: string
    limit?: number
    threshold?: number
    metric?: "cosine" | "euclidean" | "dot_product"
  }) => Effect.Effect<void, Error, never>

  const list = ((options: {
    uri?: string
    model?: string
    page?: number
    limit?: number
  }) =>
    Effect.gen(function* () {
      const result = yield* appService.listEmbeddings({
        uri: options.uri,
        modelName: options.model,
        page: options.page,
        limit: options.limit,
      })

      log(
        `Embeddings (${result.count} of ${result.embeddings.length}):`
      )
      for (const embedding of result.embeddings) {
        log(`- ID: ${embedding.id}, URI: ${embedding.uri}`)
      }

      if (result.has_next) {
        log(`... and ${result.total_pages - result.page} more pages`)
      }
    })) as unknown as (options: {
    uri?: string
    model?: string
    page?: number
    limit?: number
  }) => Effect.Effect<void, Error, never>

  const get = ((options: { uri: string }) =>
    Effect.gen(function* () {
      const embedding = yield* appService.getEmbeddingByUri(options.uri)

      if (!embedding) {
        log(`No embedding found for URI: ${options.uri}`)
        return
      }

      log(`Embedding for ${embedding.uri}:`)
      log(`- ID: ${embedding.id}`)
      log(`- Model: ${embedding.model_name}`)
      log(`- Text: ${embedding.text.substring(0, 100)}...`)
      log(`- Vector dimensions: ${embedding.embedding.length}`)
    })) as unknown as (options: { uri: string }) => Effect.Effect<void, Error, never>

  const deleteEmbedding = ((options: { id: number }) =>
    Effect.gen(function* () {
      const deleted = yield* appService.deleteEmbedding(options.id)

      if (deleted) {
        log(`Deleted embedding with ID: ${options.id}`)
      } else {
        log(`No embedding found with ID: ${options.id}`)
      }
    })) as unknown as (options: { id: number }) => Effect.Effect<void, Error, never>

  const models = (() =>
    Effect.gen(function* () {
      const modelList = yield* modelManager.listAvailableModels()

      log("Available models:")
      for (const model of modelList) {
        log(`- ${model.name} (${model.provider})`)
        if (model.dimensions) log(`  Dimensions: ${model.dimensions}`)
        if (model.maxTokens) log(`  Max tokens: ${model.maxTokens}`)
      }

      log(`\nTotal: ${modelList.length} models`)
    })) as unknown as () => Effect.Effect<void, Error, never>

  const upload = ((options: { files: string[]; model?: string }) =>
    Effect.gen(function* () {
      log(`Uploading ${options.files.length} file(s)...`)

      let successful = 0
      let failed = 0

      for (const filePath of options.files) {
        try {
          // Read file as File object (simplified approach)
          const fs = yield* Effect.tryPromise({
            try: () => import("fs/promises"),
            catch: () => new Error("Failed to import fs"),
          })

          const content = yield* Effect.tryPromise({
            try: () => fs.readFile(filePath, "utf-8"),
            catch: () => new Error(`Failed to read file: ${filePath}`),
          })

          // Create embedding from file content
          const result = yield* appService.createEmbedding({
            uri: filePath,
            text: content,
            modelName: options.model,
          })

          log(`✓ Created embedding for ${filePath} (ID: ${result.id})`)
          successful++
        } catch (error) {
          log(`✗ Failed to process ${filePath}: ${error}`)
          failed++
        }
      }

      log(`\nUpload complete: ${successful} successful, ${failed} failed`)
    })) as unknown as (options: { files: string[]; model?: string }) => Effect.Effect<void, Error, never>

  const migrate = ((options: { fromModel: string; toModel: string; dryRun?: boolean }) =>
    Effect.gen(function* () {
      // Check model compatibility
      const compatibility = yield* modelManager.validateModelCompatibility(
        options.fromModel,
        options.toModel
      )

      if (!compatibility.compatible) {
        log(`Models are not compatible: ${compatibility.reason}`)
        return
      }

      log(`Migration from ${options.fromModel} to ${options.toModel}`)
      log(`Compatibility: ${compatibility.reason}`)

      if (options.dryRun) {
        log("Dry run mode - no actual migration performed")
        return
      }

      // Perform migration using ModelManager
      const result = yield* modelManager.migrateEmbeddings(
        options.fromModel,
        options.toModel
      )

      log(`Migration complete: ${result.successful} embeddings migrated`)
      if (result.failed > 0) {
        log(`Failed migrations: ${result.failed}`)
      }
      log(`Total processed: ${result.totalProcessed}`)
      log(`Duration: ${result.duration}ms`)
    })) as unknown as (options: { fromModel: string; toModel: string; dryRun?: boolean }) => Effect.Effect<void, Error, never>

  const providers = ((options: { action: "list" | "current" | "models" | "ollama-status"; provider?: string }) =>
    Effect.gen(function* () {
      switch (options.action) {
        case "list": {
          // Static provider information for now
          const providerList = [
            { name: "ollama", status: "online", description: "Local AI model provider" },
            { name: "openai", status: "unknown", description: "OpenAI embedding models" },
            { name: "google", status: "unknown", description: "Google AI embedding models" },
            { name: "cohere", status: "unknown", description: "Cohere embedding models" },
            { name: "mistral", status: "unknown", description: "Mistral embedding models" },
          ]

          log("Available providers:")
          for (const provider of providerList) {
            log(`- ${provider.name} (${provider.status}): ${provider.description}`)
          }
          break
        }

        case "current": {
          log("Current provider: ollama")
          log("Configuration:")
          log("  Base URL: http://localhost:11434")
          log("  Default model: nomic-embed-text")
          break
        }

        case "models": {
          const modelList = yield* modelManager.listAvailableModels()
          const filteredModels = options.provider
            ? modelList.filter(m => m.provider === options.provider)
            : modelList

          if (options.provider) {
            log(`Models for provider ${options.provider}:`)
          } else {
            log("All provider models:")
          }

          for (const model of filteredModels) {
            log(`- ${model.name} (${model.provider})`)
            if (model.dimensions) log(`  Dimensions: ${model.dimensions}`)
          }
          break
        }

        case "ollama-status": {
          try {
            // Try to check Ollama status
            const response = yield* Effect.tryPromise({
              try: () => fetch("http://localhost:11434/api/version"),
              catch: () => new Error("Ollama service unavailable"),
            })

            if (response.ok) {
              const data = yield* Effect.tryPromise({
                try: () => response.json() as Promise<{ version?: string }>,
                catch: () => new Error("Failed to parse response"),
              })

              log("Ollama status: online")
              log(`Version: ${data.version || "unknown"}`)
            } else {
              log("Ollama status: offline")
            }
          } catch {
            log("Ollama status: offline")
          }
          break
        }
      }
    })) as unknown as (options: { action: "list" | "current" | "models" | "ollama-status"; provider?: string }) => Effect.Effect<void, Error, never>

  const commands = {
    create,
    batch,
    search,
    list,
    get,
    delete: deleteEmbedding,
    models,
    upload,
    migrate,
    providers,
  } satisfies CLICommands
  return commands
})

/**
 * Run CLI command with proper error handling and layer provision
 */
export function runCLICommand<T>(
  command: Effect.Effect<T, Error, never>
): Promise<void> {
  return Effect.runPromise(
    command.pipe(
      Effect.provide(ApplicationLayer),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          error(`Error: ${err instanceof Error ? err.message : String(err)}`)
          process.exit(1)
        })
      ),
      Effect.asVoid
    ) as Effect.Effect<void, never, never>
  )
}

/**
 * Create CLI commands instance
 */
export const createCLICommands = (): Effect.Effect<CLICommands, never, never> =>
  makeCLICommands.pipe(Effect.provide(ApplicationLayer)) as Effect.Effect<CLICommands, never, never>
