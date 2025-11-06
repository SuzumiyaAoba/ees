/**
 * Repository pattern implementation for connection configuration data access
 * Separates database operations from business logic
 */

import { eq, desc } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "@/shared/database/connection"
import { connectionConfigs, type ConnectionConfig, type NewConnectionConfig } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Repository service interface for connection configurations
 */
export interface ConnectionRepository {
  readonly create: (
    data: NewConnectionConfig
  ) => Effect.Effect<ConnectionConfig, DatabaseQueryError>

  readonly findById: (
    id: number
  ) => Effect.Effect<ConnectionConfig | null, DatabaseQueryError>

  readonly findAll: () => Effect.Effect<ConnectionConfig[], DatabaseQueryError>

  readonly findActive: () => Effect.Effect<
    ConnectionConfig | null,
    DatabaseQueryError
  >

  readonly update: (
    id: number,
    data: Partial<NewConnectionConfig>
  ) => Effect.Effect<ConnectionConfig, DatabaseQueryError>

  readonly delete: (id: number) => Effect.Effect<void, DatabaseQueryError>

  readonly setActive: (id: number) => Effect.Effect<void, DatabaseQueryError>
}

export const ConnectionRepository = Context.GenericTag<ConnectionRepository>(
  "ConnectionRepository"
)

/**
 * Create the connection repository implementation
 */
const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService

  const create = (data: NewConnectionConfig) =>
    Effect.gen(function* () {
      try {
        // If this connection is being set as active, deactivate others
        if (data.isActive) {
          yield* Effect.tryPromise({
            try: () =>
              db
                .update(connectionConfigs)
                .set({ isActive: false })
                .run(),
            catch: (error) =>
              new DatabaseQueryError({
                message: `Failed to deactivate other connections: ${error}`,
              }),
          })
        }

        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .insert(connectionConfigs)
              .values(data)
              .returning()
              .then((rows) => rows[0]),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to create connection: ${error}`,
            }),
        })

        if (!result) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: "Failed to create connection: no result returned",
            })
          )
        }

        return result
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error creating connection: ${error}`,
          })
        )
      }
    })

  const findById = (id: number) =>
    Effect.gen(function* () {
      try {
        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(connectionConfigs)
              .where(eq(connectionConfigs.id, id))
              .limit(1)
              .then((rows) => rows[0] ?? null),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to find connection by id: ${error}`,
            }),
        })

        return result
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error finding connection: ${error}`,
          })
        )
      }
    })

  const findAll = () =>
    Effect.gen(function* () {
      try {
        const results = yield* Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(connectionConfigs)
              .orderBy(desc(connectionConfigs.createdAt))
              .all(),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to list connections: ${error}`,
            }),
        })

        return results
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error listing connections: ${error}`,
          })
        )
      }
    })

  const findActive = (): Effect.Effect<ConnectionConfig | null, DatabaseQueryError> =>
    Effect.gen(function* () {
      try {
        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(connectionConfigs)
              .where(eq(connectionConfigs.isActive, true))
              .limit(1)
              .then((rows) => rows[0] ?? null),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to find active connection: ${error}`,
            }),
        })

        return result as ConnectionConfig | null
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error finding active connection: ${error}`,
          })
        )
      }
    })

  const update = (id: number, data: Partial<NewConnectionConfig>) =>
    Effect.gen(function* () {
      try {
        // If this connection is being set as active, deactivate others
        if (data.isActive === true) {
          yield* Effect.tryPromise({
            try: () =>
              db
                .update(connectionConfigs)
                .set({ isActive: false })
                .run(),
            catch: (error) =>
              new DatabaseQueryError({
                message: `Failed to deactivate other connections: ${error}`,
              }),
          })
        }

        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .update(connectionConfigs)
              .set({ ...data, updatedAt: new Date().toISOString() })
              .where(eq(connectionConfigs.id, id))
              .returning()
              .then((rows) => rows[0]),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to update connection: ${error}`,
            }),
        })

        if (!result) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: "Connection not found",
            })
          )
        }

        return result
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error updating connection: ${error}`,
          })
        )
      }
    })

  const deleteConnection = (id: number) =>
    Effect.gen(function* () {
      try {
        yield* Effect.tryPromise({
          try: () =>
            db
              .delete(connectionConfigs)
              .where(eq(connectionConfigs.id, id))
              .run(),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to delete connection: ${error}`,
            }),
        })

        return void 0
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error deleting connection: ${error}`,
          })
        )
      }
    })

  const setActive = (id: number) =>
    Effect.gen(function* () {
      try {
        // First, deactivate all connections
        yield* Effect.tryPromise({
          try: () =>
            db
              .update(connectionConfigs)
              .set({ isActive: false })
              .run(),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to deactivate connections: ${error}`,
            }),
        })

        // Then, activate the specified connection
        const result = yield* Effect.tryPromise({
          try: () =>
            db
              .update(connectionConfigs)
              .set({ isActive: true, updatedAt: new Date().toISOString() })
              .where(eq(connectionConfigs.id, id))
              .returning()
              .then((rows) => rows[0]),
          catch: (error) =>
            new DatabaseQueryError({
              message: `Failed to activate connection: ${error}`,
            }),
        })

        if (!result) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: "Connection not found",
            })
          )
        }

        return void 0
      } catch (error) {
        return yield* Effect.fail(
          new DatabaseQueryError({
            message: `Unexpected error setting active connection: ${error}`,
          })
        )
      }
    })

  return {
    create,
    findById,
    findAll,
    findActive,
    update,
    delete: deleteConnection,
    setActive,
  } as const
})

/**
 * Connection repository layer
 */
export const ConnectionRepositoryLive = Layer.effect(
  ConnectionRepository,
  make
).pipe(Layer.provide(DatabaseServiceLive))
