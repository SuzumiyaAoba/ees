/**
 * Reranking API
 * Provides reranking capabilities using configured providers
 */

import { Effect } from "effect"
import { and, eq } from "drizzle-orm"
import {
  DatabaseConnectionError,
  ProviderModelError,
} from "@/shared/errors/database"
import { DatabaseService } from "@/shared/database/connection"
import { models } from "@/shared/database/schema"

/**
 * Document to be reranked
 */
export interface RerankDocument {
  readonly text: string
  readonly uri?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Reranking request
 */
export interface RerankRequest {
  readonly query: string
  readonly documents: readonly RerankDocument[]
  readonly modelName?: string
  readonly topN?: number
  readonly providerOptions?: Record<string, unknown>
}

/**
 * Reranked result with score
 */
export interface RerankResult {
  readonly index: number
  readonly uri?: string
  readonly text: string
  readonly score: number
  readonly metadata?: Record<string, unknown>
}

/**
 * Reranking response
 */
export interface RerankResponse {
  readonly query: string
  readonly modelName: string
  readonly results: readonly RerankResult[]
  readonly totalDocuments: number
  readonly topN: number
}

/**
 * Reranking service interface
 */
export interface RerankingService {
  readonly rerank: (
    request: RerankRequest
  ) => Effect.Effect<
    RerankResponse,
    DatabaseConnectionError | ProviderModelError
  >
}

/**
 * Create reranking service
 */
export const createRerankingService = (
  dbService: DatabaseService
): RerankingService => {
  const getActiveRerankingModel = Effect.gen(function* () {
    const [activeModel] = yield* Effect.tryPromise({
      try: async () =>
        await dbService.db
          .select()
          .from(models)
          .where(and(eq(models.modelType, "reranking"), eq(models.isActive, true)))
          .limit(1),
      catch: (error) =>
        new DatabaseConnectionError({
          message: `Failed to get active reranking model: ${error instanceof Error ? error.message : String(error)}`,
        }),
    })

    if (!activeModel) {
      return yield* Effect.fail(
        new ProviderModelError({
          provider: "unknown",
          modelName: "unknown",
          message: "No active reranking model found. Please set an active reranking model in Config.",
        })
      )
    }

    return activeModel
  })

  const rerank = (request: RerankRequest) =>
    Effect.gen(function* () {
      // Get active reranking model or use provided model name
      const model = request.modelName
        ? yield* Effect.gen(function* () {
            const [found] = yield* Effect.tryPromise({
              try: async () =>
                await dbService.db
                  .select()
                  .from(models)
                  .where(
                    and(
                      eq(models.name, request.modelName!),
                      eq(models.modelType, "reranking")
                    )
                  )
                  .limit(1),
              catch: (error) =>
                new DatabaseConnectionError({
                  message: `Failed to get reranking model: ${error instanceof Error ? error.message : String(error)}`,
                }),
            })

            if (!found) {
              return yield* Effect.fail(
                new ProviderModelError({
                  provider: "unknown",
                  modelName: request.modelName ?? "unknown",
                  message: `Reranking model '${request.modelName}' not found`,
                })
              )
            }

            return found
          })
        : yield* getActiveRerankingModel

      // Placeholder implementation - to be replaced with actual provider integration
      // For now, return simple score-based ranking using text similarity
      const rankedResults: RerankResult[] = request.documents.map((doc, index) => {
        // Simple scoring based on query term matches (placeholder)
        const queryTerms = request.query.toLowerCase().split(/\s+/)
        const docText = doc.text.toLowerCase()
        const matchCount = queryTerms.filter(term => docText.includes(term)).length
        const score = matchCount / queryTerms.length

        return {
          index,
          ...(doc.uri ? { uri: doc.uri } : {}),
          text: doc.text,
          score,
          ...(doc.metadata ? { metadata: doc.metadata } : {}),
        }
      })

      // Sort by score descending
      const sortedResults = rankedResults.sort((a, b) => b.score - a.score)

      // Apply top_n filter if specified
      const finalResults = request.topN
        ? sortedResults.slice(0, request.topN)
        : sortedResults

      return {
        query: request.query,
        modelName: model.name,
        results: finalResults,
        totalDocuments: request.documents.length,
        topN: request.topN ?? request.documents.length,
      }
    })

  return {
    rerank,
  }
}

export const RerankingService = Effect.Service<RerankingService>()(
  "RerankingService",
  {
    effect: Effect.gen(function* () {
      const dbService = yield* DatabaseService
      return createRerankingService(dbService)
    }),
  }
)
