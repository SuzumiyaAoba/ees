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
  log,
  error,
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
}

/**
 * CLI Commands implementation using core application services
 */
const makeCLICommands = Effect.gen(function* () {
  const appService = yield* EmbeddingApplicationService

  const create = (options: {
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
    })

  const batch = (options: { file: string; model?: string }) =>
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
    })

  const search = (options: {
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
    })

  const list = (options: {
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
    })

  const get = (options: { uri: string }) =>
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
    })

  const deleteEmbedding = (options: { id: number }) =>
    Effect.gen(function* () {
      const deleted = yield* appService.deleteEmbedding(options.id)

      if (deleted) {
        log(`Deleted embedding with ID: ${options.id}`)
      } else {
        log(`No embedding found with ID: ${options.id}`)
      }
    })

  return {
    create,
    batch,
    search,
    list,
    get,
    delete: deleteEmbedding,
  } as const
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
          error(`Error: ${(err as Error).message || err}`)
          process.exit(1)
        })
      ),
      Effect.asVoid
    ) as unknown as Effect.Effect<void, never, never>
  )
}

/**
 * Create CLI commands instance
 */
export const createCLICommands = (): Effect.Effect<CLICommands, never, never> =>
  makeCLICommands.pipe(Effect.provide(ApplicationLayer)) as unknown as Effect.Effect<CLICommands, never, never>
