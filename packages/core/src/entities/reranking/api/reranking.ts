/**
 * Reranking API using AI SDK
 * Provides reranking capabilities using various providers (Cohere, etc.)
 */

import { Effect } from "effect"
import {
  DatabaseConnectionError,
  ProviderConnectionError,
  ProviderModelError,
} from "@/shared/errors/database"
import { models } from "@/shared/database/schema"
import { DatabaseService } from "@/shared/database/connection"
import { eq, and } from "drizzle-orm"

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
    DatabaseConnectionError | ProviderConnectionError | ProviderModelError
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
          provider: "cohere",
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
                  provider: "cohere",
                  modelName: request.modelName ?? "unknown",
                  message: `Reranking model '${request.modelName}' not found`,
                })
              )
            }

            return found
          })
        : yield* getActiveRerankingModel

      // Currently only supporting Cohere
      // Call Cohere rerank API directly using fetch
      const result = yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch("https://api.cohere.com/v2/rerank", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env["COHERE_API_KEY"] ?? ""}`,
            },
            body: JSON.stringify({
              model: model.name,
              query: request.query,
              documents: request.documents.map((doc) => doc.text),
              top_n: request.topN,
              ...request.providerOptions,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Cohere API error: ${response.status} ${errorText}`)
          }

          return await response.json() as {
            results: Array<{ index: number; relevance_score: number }>
          }
        },
        catch: (error) =>
          new ProviderConnectionError({
            provider: "cohere",
            message: `Reranking failed: ${error instanceof Error ? error.message : String(error)}`,
          }),
      })

      // Map results back to include original document metadata
      const rankedResults: RerankResult[] = result.results.map((item) => {
        const originalDoc = request.documents[item.index]

        return {
          index: item.index,
          ...(originalDoc?.uri ? { uri: originalDoc.uri } : {}),
          text: originalDoc?.text ?? "",
          score: item.relevance_score,
          ...(originalDoc?.metadata ? { metadata: originalDoc.metadata } : {}),
        }
      })

      return {
        query: request.query,
        modelName: model.name,
        results: rankedResults,
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
