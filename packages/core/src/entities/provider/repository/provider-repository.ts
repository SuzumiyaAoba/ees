import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { DatabaseService, DatabaseServiceLive } from "@/shared/database/connection"
import { providers, type Provider, type NewProvider } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Provider repository interface
 */
export interface ProviderRepository {
  readonly create: (data: NewProvider) => Effect.Effect<Provider, DatabaseQueryError>
  readonly findById: (id: number) => Effect.Effect<Provider | null, DatabaseQueryError>
  readonly findAll: () => Effect.Effect<Provider[], DatabaseQueryError>
  readonly update: (id: number, data: Partial<Omit<Provider, "id" | "createdAt">>) => Effect.Effect<boolean, DatabaseQueryError>
  readonly delete: (id: number) => Effect.Effect<boolean, DatabaseQueryError>
  readonly findByType: (type: string) => Effect.Effect<Provider[], DatabaseQueryError>
}

export const ProviderRepository = Context.GenericTag<ProviderRepository>("ProviderRepository")

const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService

  const create = (data: NewProvider) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.insert(providers).values(data).returning()
        if (!result[0]) {
          throw new Error("Failed to insert provider: no result returned")
        }
        return result[0]
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to create provider: ${error}`,
        }),
    })

  const findById = (id: number) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.select().from(providers).where(eq(providers.id, id))
        return result[0] || null
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find provider by id: ${error}`,
        }),
    })

  const findAll = () =>
    Effect.tryPromise({
      try: async () => {
        return await db.select().from(providers)
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find all providers: ${error}`,
        }),
    })

  const update = (id: number, data: Partial<Omit<Provider, "id" | "createdAt">>) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db
          .update(providers)
          .set({ ...data, updatedAt: new Date().toISOString() })
          .where(eq(providers.id, id))
        return result.rowsAffected > 0
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to update provider: ${error}`,
        }),
    })

  const deleteProvider = (id: number) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.delete(providers).where(eq(providers.id, id))
        return result.rowsAffected > 0
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to delete provider: ${error}`,
        }),
    })

  const findByType = (type: string) =>
    Effect.tryPromise({
      try: async () => {
        return await db.select().from(providers).where(eq(providers.type, type))
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find providers by type: ${error}`,
        }),
    })

  return {
    create,
    findById,
    findAll,
    update,
    delete: deleteProvider,
    findByType,
  }
})

export const ProviderRepositoryLive = Layer.effect(
  ProviderRepository,
  make
).pipe(Layer.provide(DatabaseServiceLive))
