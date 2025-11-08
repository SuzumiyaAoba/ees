import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { DatabaseService, DatabaseServiceLive } from "@/shared/database/connection"
import { models, type Model, type NewModel } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Model repository interface
 */
export interface ModelRepository {
  readonly create: (data: NewModel) => Effect.Effect<Model, DatabaseQueryError>
  readonly findById: (id: number) => Effect.Effect<Model | null, DatabaseQueryError>
  readonly findAll: () => Effect.Effect<Model[], DatabaseQueryError>
  readonly findByProviderId: (providerId: number) => Effect.Effect<Model[], DatabaseQueryError>
  readonly findActive: () => Effect.Effect<Model | null, DatabaseQueryError>
  readonly setActive: (id: number) => Effect.Effect<boolean, DatabaseQueryError>
  readonly update: (id: number, data: Partial<Omit<Model, "id" | "createdAt">>) => Effect.Effect<boolean, DatabaseQueryError>
  readonly delete: (id: number) => Effect.Effect<boolean, DatabaseQueryError>
}

export const ModelRepository = Context.GenericTag<ModelRepository>("ModelRepository")

const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService

  const create = (data: NewModel) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.insert(models).values(data).returning()
        if (!result[0]) {
          throw new Error("Failed to insert model: no result returned")
        }
        return result[0]
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to create model: ${error}`,
        }),
    })

  const findById = (id: number) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.select().from(models).where(eq(models.id, id))
        return result[0] || null
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find model by id: ${error}`,
        }),
    })

  const findAll = () =>
    Effect.tryPromise({
      try: async () => {
        return await db.select().from(models)
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find all models: ${error}`,
        }),
    })

  const findByProviderId = (providerId: number) =>
    Effect.tryPromise({
      try: async () => {
        return await db.select().from(models).where(eq(models.providerId, providerId))
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find models by provider id: ${error}`,
        }),
    })

  const findActive = () =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.select().from(models).where(eq(models.isActive, true))
        return result[0] || null
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to find active model: ${error}`,
        }),
    })

  const setActive = (id: number) =>
    Effect.tryPromise({
      try: async () => {
        // First, deactivate all models
        await db.update(models).set({ isActive: false })

        // Then activate the specified model
        const result = await db
          .update(models)
          .set({ isActive: true, updatedAt: new Date().toISOString() })
          .where(eq(models.id, id))

        return result.rowsAffected > 0
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to set active model: ${error}`,
        }),
    })

  const update = (id: number, data: Partial<Omit<Model, "id" | "createdAt">>) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db
          .update(models)
          .set({ ...data, updatedAt: new Date().toISOString() })
          .where(eq(models.id, id))
        return result.rowsAffected > 0
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to update model: ${error}`,
        }),
    })

  const deleteModel = (id: number) =>
    Effect.tryPromise({
      try: async () => {
        const result = await db.delete(models).where(eq(models.id, id))
        return result.rowsAffected > 0
      },
      catch: (error) =>
        new DatabaseQueryError({
          message: `Failed to delete model: ${error}`,
        }),
    })

  return {
    create,
    findById,
    findAll,
    findByProviderId,
    findActive,
    setActive,
    update,
    delete: deleteModel,
  }
})

export const ModelRepositoryLive = Layer.effect(
  ModelRepository,
  make
).pipe(Layer.provide(DatabaseServiceLive))
