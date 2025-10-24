/**
 * Repository pattern implementation for upload directory data access
 */

import { eq } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "@/shared/database/connection"
import { uploadDirectories } from "@/shared/database/schema"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Result type for create operation
 */
export interface CreateUploadDirectoryResult {
  id: number
}

/**
 * Upload directory data for create/update
 */
export interface UploadDirectoryData {
  name: string
  path: string
  modelName?: string
  taskTypes?: string[]
  description?: string
}

/**
 * Upload directory with metadata
 */
export interface UploadDirectory {
  id: number
  name: string
  path: string
  modelName: string
  taskTypes: string[] | null
  description: string | null
  lastSyncedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

/**
 * Repository interface for upload directory data access
 */
export interface UploadDirectoryRepository {
  /**
   * Create a new upload directory
   */
  readonly create: (
    data: UploadDirectoryData
  ) => Effect.Effect<CreateUploadDirectoryResult, DatabaseQueryError>

  /**
   * List all upload directories
   */
  readonly findAll: () => Effect.Effect<UploadDirectory[], DatabaseQueryError>

  /**
   * Find upload directory by ID
   */
  readonly findById: (
    id: number
  ) => Effect.Effect<UploadDirectory | null, DatabaseQueryError>

  /**
   * Find upload directory by path
   */
  readonly findByPath: (
    path: string
  ) => Effect.Effect<UploadDirectory | null, DatabaseQueryError>

  /**
   * Update upload directory
   */
  readonly update: (
    id: number,
    data: Partial<UploadDirectoryData>
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Update last synced timestamp
   */
  readonly updateLastSynced: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>

  /**
   * Delete upload directory
   */
  readonly deleteById: (
    id: number
  ) => Effect.Effect<boolean, DatabaseQueryError>
}

export const UploadDirectoryRepository =
  Context.GenericTag<UploadDirectoryRepository>("UploadDirectoryRepository")

/**
 * Implementation of UploadDirectoryRepository
 */
const make = Effect.gen(function* () {
  const { db } = yield* DatabaseService

  const create = (
    data: UploadDirectoryData
  ): Effect.Effect<CreateUploadDirectoryResult, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(uploadDirectories)
            .values({
              name: data.name,
              path: data.path,
              modelName: data.modelName ?? "nomic-embed-text",
              taskTypes: data.taskTypes ? JSON.stringify(data.taskTypes) : null,
              description: data.description,
            })
            .returning({ id: uploadDirectories.id }),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to create upload directory",
            cause: error,
          }),
      })

      return { id: result[0]?.id ?? 0 }
    })

  const findAll = (): Effect.Effect<UploadDirectory[], DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(uploadDirectories)
            .orderBy(uploadDirectories.createdAt),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to list upload directories",
            cause: error,
          }),
      })

      return result.map((row) => ({
        id: row.id,
        name: row.name,
        path: row.path,
        modelName: row.modelName,
        taskTypes: row.taskTypes ? (JSON.parse(row.taskTypes) as string[]) : null,
        description: row.description,
        lastSyncedAt: row.lastSyncedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    })

  const findById = (
    id: number
  ): Effect.Effect<UploadDirectory | null, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(uploadDirectories)
            .where(eq(uploadDirectories.id, id))
            .limit(1),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get upload directory",
            cause: error,
          }),
      })

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      if (!row) {
        return null
      }

      return {
        id: row.id,
        name: row.name,
        path: row.path,
        modelName: row.modelName,
        taskTypes: row.taskTypes ? (JSON.parse(row.taskTypes) as string[]) : null,
        description: row.description,
        lastSyncedAt: row.lastSyncedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    })

  const findByPath = (
    path: string
  ): Effect.Effect<UploadDirectory | null, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(uploadDirectories)
            .where(eq(uploadDirectories.path, path))
            .limit(1),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to get upload directory by path",
            cause: error,
          }),
      })

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      if (!row) {
        return null
      }

      return {
        id: row.id,
        name: row.name,
        path: row.path,
        modelName: row.modelName,
        taskTypes: row.taskTypes ? (JSON.parse(row.taskTypes) as string[]) : null,
        description: row.description,
        lastSyncedAt: row.lastSyncedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    })

  const update = (
    id: number,
    data: Partial<UploadDirectoryData>
  ): Effect.Effect<boolean, DatabaseQueryError> =>
    Effect.gen(function* () {
      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      // Convert taskTypes array to JSON string if present
      if (data.taskTypes !== undefined) {
        updateData['taskTypes'] = data.taskTypes ? JSON.stringify(data.taskTypes) : null
      }

      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .update(uploadDirectories)
            .set(updateData)
            .where(eq(uploadDirectories.id, id)),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to update upload directory",
            cause: error,
          }),
      })

      return result.rowsAffected > 0
    })

  const updateLastSynced = (
    id: number
  ): Effect.Effect<boolean, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .update(uploadDirectories)
            .set({
              lastSyncedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(uploadDirectories.id, id)),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to update last synced timestamp",
            cause: error,
          }),
      })

      return result.rowsAffected > 0
    })

  const deleteById = (
    id: number
  ): Effect.Effect<boolean, DatabaseQueryError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () =>
          db.delete(uploadDirectories).where(eq(uploadDirectories.id, id)),
        catch: (error) =>
          new DatabaseQueryError({
            message: "Failed to delete upload directory",
            cause: error,
          }),
      })

      return result.rowsAffected > 0
    })

  const repository = {
    create,
    findAll,
    findById,
    findByPath,
    update,
    updateLastSynced,
    deleteById,
  }

  return repository satisfies typeof UploadDirectoryRepository.Service
})

/**
 * Live layer for UploadDirectoryRepository
 */
export const UploadDirectoryRepositoryLive = Layer.effect(
  UploadDirectoryRepository,
  make
).pipe(Layer.provide(DatabaseServiceLive))
