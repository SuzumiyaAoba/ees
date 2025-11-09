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
  collectFilesFromDirectory,
  filterByExtension,
  filterBySize,
  ConnectionService,
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
   * Get embedding by URI and model name
   */
  get(options: { uri: string; model: string }): Effect.Effect<void, Error, never>

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
   * Upload directory and create embeddings for all files
   */
  uploadDir(options: {
    directory: string
    model?: string
    maxDepth?: number
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

  /**
   * Connection management commands
   */
  connections(options: {
    action: "list" | "get" | "active" | "create" | "update" | "delete" | "activate" | "test"
    id?: number
    name?: string
    type?: "ollama" | "openai-compatible"
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    metadata?: string
  }): Effect.Effect<void, Error, never>
}

/**
 * CLI Commands implementation using core application services
 */
const makeCLICommands = Effect.gen(function* () {
  const appService = yield* EmbeddingApplicationService
  const modelManager = yield* ModelManagerTag
  const connectionService = yield* ConnectionService

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

      const result = yield* appService.createEmbedding(
        options.uri,
        text,
        options.model
      )

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

  const get = ((options: { uri: string; model: string }) =>
    Effect.gen(function* () {
      const embedding = yield* appService.getEmbeddingByUri(options.uri, options.model)

      if (!embedding) {
        log(`No embedding found for URI: ${options.uri}`)
        return
      }

      log(`Embedding for ${embedding.uri}:`)
      log(`- ID: ${embedding.id}`)
      log(`- Model: ${embedding.model_name}`)
      log(`- Text: ${embedding.text.substring(0, 100)}...`)
      log(`- Vector dimensions: ${embedding.embedding.length}`)
    })) as unknown as (options: { uri: string; model: string }) => Effect.Effect<void, Error, never>

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
          const result = yield* appService.createEmbedding(
            filePath,
            content,
            options.model
          )

          log(`✓ Created embedding for ${filePath} (ID: ${result.id})`)
          successful++
        } catch (error) {
          log(`✗ Failed to process ${filePath}: ${error}`)
          failed++
        }
      }

      log(`\nUpload complete: ${successful} successful, ${failed} failed`)
    })) as unknown as (options: { files: string[]; model?: string }) => Effect.Effect<void, Error, never>

  const uploadDir = ((options: { directory: string; model?: string; maxDepth?: number }) =>
    Effect.gen(function* () {
      log(`Scanning directory: ${options.directory}`)
      log(`Using .eesignore for filtering...`)

      // Collect files from directory
      const collectedFiles = yield* collectFilesFromDirectory(options.directory, {
        maxDepth: options.maxDepth,
        followSymlinks: false,
      })

      // Filter files by supported extensions and size
      const textExtensions = ['.txt', '.md', '.markdown', '.log', '.csv', '.json', '.yaml', '.yml', '.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h']
      const filteredFiles = filterBySize(
        filterByExtension(collectedFiles, textExtensions),
        10 * 1024 * 1024 // 10MB max
      )

      log(`Found ${filteredFiles.length} eligible files (${collectedFiles.length} total)`)

      if (filteredFiles.length === 0) {
        log("No eligible files found to process")
        return
      }

      let successful = 0
      let failed = 0

      for (const file of filteredFiles) {
        try {
          // Read file content
          const fs = yield* Effect.tryPromise({
            try: () => import("fs/promises"),
            catch: () => new Error("Failed to import fs"),
          })

          const content = yield* Effect.tryPromise({
            try: () => fs.readFile(file.absolutePath, "utf-8"),
            catch: () => new Error(`Failed to read file: ${file.relativePath}`),
          })

          // Create embedding from file content
          const result = yield* appService.createEmbedding(
            file.relativePath,
            content,
            options.model
          )

          log(`✓ Created embedding for ${file.relativePath} (ID: ${result.id})`)
          successful++
        } catch (error) {
          log(`✗ Failed to process ${file.relativePath}: ${error}`)
          failed++
        }
      }

      log(`\nDirectory upload complete: ${successful} successful, ${failed} failed`)
    })) as unknown as (options: { directory: string; model?: string; maxDepth?: number }) => Effect.Effect<void, Error, never>

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
          log("Available providers:")
          log("- ollama (online): Local AI model provider")
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

  const connections = ((options: {
    action: "list" | "get" | "active" | "create" | "update" | "delete" | "activate" | "test"
    id?: number
    name?: string
    type?: "ollama" | "openai-compatible"
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    metadata?: string
  }) =>
    Effect.gen(function* () {
      switch (options.action) {
        case "list": {
          const result = yield* connectionService.listConnections()
          log(`Connections (${result.total} total):`)
          for (const conn of result.connections) {
            const activeIndicator = conn.isActive ? " [ACTIVE]" : ""
            log(`- ID: ${conn.id}${activeIndicator}`)
            log(`  Name: ${conn.name}`)
            log(`  Type: ${conn.type}`)
            log(`  Base URL: ${conn.baseUrl}`)
            if (conn.defaultModel) log(`  Default Model: ${conn.defaultModel}`)
          }
          break
        }

        case "get": {
          if (!options.id) {
            return yield* Effect.fail(new Error("Connection ID is required"))
          }
          const connection = yield* connectionService.getConnection(options.id)
          if (!connection) {
            log(`No connection found with ID: ${options.id}`)
            return
          }
          log(`Connection ${connection.id}:`)
          log(`  Name: ${connection.name}`)
          log(`  Type: ${connection.type}`)
          log(`  Base URL: ${connection.baseUrl}`)
          log(`  Active: ${connection.isActive}`)
          if (connection.defaultModel) log(`  Default Model: ${connection.defaultModel}`)
          if (connection.metadata) log(`  Metadata: ${JSON.stringify(connection.metadata)}`)
          break
        }

        case "active": {
          const connection = yield* connectionService.getActiveConnection()
          if (!connection) {
            log("No active connection configured")
            return
          }
          log("Active connection:")
          log(`  ID: ${connection.id}`)
          log(`  Name: ${connection.name}`)
          log(`  Type: ${connection.type}`)
          log(`  Base URL: ${connection.baseUrl}`)
          if (connection.defaultModel) log(`  Default Model: ${connection.defaultModel}`)
          break
        }

        case "create": {
          if (!options.name || !options.type || !options.baseUrl) {
            return yield* Effect.fail(
              new Error("Name, type, and baseUrl are required for creating a connection")
            )
          }
          const metadata = options.metadata
            ? (JSON.parse(options.metadata) as Record<string, unknown>)
            : undefined
          const connection = yield* connectionService.createConnection({
            name: options.name,
            type: options.type,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            defaultModel: options.defaultModel,
            metadata,
          })
          log(`Created connection ${connection.id}:`)
          log(`  Name: ${connection.name}`)
          log(`  Type: ${connection.type}`)
          log(`  Base URL: ${connection.baseUrl}`)
          break
        }

        case "update": {
          if (!options.id) {
            return yield* Effect.fail(new Error("Connection ID is required"))
          }
          const metadata = options.metadata
            ? (JSON.parse(options.metadata) as Record<string, unknown>)
            : undefined
          const connection = yield* connectionService.updateConnection(options.id, {
            name: options.name,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            defaultModel: options.defaultModel,
            metadata,
          })
          log(`Updated connection ${connection.id}:`)
          log(`  Name: ${connection.name}`)
          log(`  Type: ${connection.type}`)
          log(`  Base URL: ${connection.baseUrl}`)
          break
        }

        case "delete": {
          if (!options.id) {
            return yield* Effect.fail(new Error("Connection ID is required"))
          }
          yield* connectionService.deleteConnection(options.id)
          log(`Deleted connection ${options.id}`)
          break
        }

        case "activate": {
          if (!options.id) {
            return yield* Effect.fail(new Error("Connection ID is required"))
          }
          yield* connectionService.setActiveConnection(options.id)
          log(`Set connection ${options.id} as active`)
          break
        }

        case "test": {
          if (!options.id && (!options.baseUrl || !options.type)) {
            return yield* Effect.fail(
              new Error("Either connection ID or (baseUrl and type) are required for testing")
            )
          }
          const testRequest = options.id
            ? { id: options.id }
            : {
                baseUrl: options.baseUrl!,
                type: options.type!,
                apiKey: options.apiKey,
              }
          const result = yield* connectionService.testConnection(testRequest)
          if (result.success) {
            log("Connection test: SUCCESS")
            log(`Message: ${result.message}`)
            if (result.models && result.models.length > 0) {
              log(`Available models (${result.models.length}):`)
              for (const model of result.models) {
                log(`  - ${model}`)
              }
            }
          } else {
            log("Connection test: FAILED")
            log(`Message: ${result.message}`)
          }
          break
        }
      }
    })) as unknown as (options: {
    action: "list" | "get" | "active" | "create" | "update" | "delete" | "activate" | "test"
    id?: number
    name?: string
    type?: "ollama" | "openai-compatible"
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    metadata?: string
  }) => Effect.Effect<void, Error, never>

  const commands = {
    create,
    batch,
    search,
    list,
    get,
    delete: deleteEmbedding,
    models,
    upload,
    uploadDir,
    migrate,
    providers,
    connections,
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
