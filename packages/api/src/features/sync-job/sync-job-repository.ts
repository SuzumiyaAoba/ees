import { Effect } from "effect"
import { eq, desc } from "drizzle-orm"
import { DatabaseService } from "@ees/core"
import { syncJobs } from "@ees/core"
import type { SyncJob } from "@ees/core"
import { DatabaseError } from "@ees/core"

/**
 * SyncJob Repository
 * Manages sync job records in the database
 */
export const SyncJobRepository = {
  /**
   * Create a new sync job
   */
  create: (directoryId: number) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      const result = yield* Effect.tryPromise({
        try: async () => {
          // Use raw SQL to avoid Drizzle including id field with null value
          const inserted = await db.db
            .insert(syncJobs)
            .values({
              directoryId,
              status: undefined,
              totalFiles: undefined,
              processedFiles: undefined,
              createdFiles: undefined,
              updatedFiles: undefined,
              failedFiles: undefined,
              createdAt: undefined,
              updatedAt: undefined,
            })
            .returning()
          const job = inserted[0]
          if (!job) {
            throw new Error("Failed to create sync job: No job returned")
          }
          return job
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to create sync job: ${String(error)}`,
          }),
      })

      return result
    }),

  /**
   * Get sync job by ID
   */
  findById: (id: number) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      const result = yield* Effect.tryPromise({
        try: async () => {
          const rows = await db.db
            .select()
            .from(syncJobs)
            .where(eq(syncJobs.id, id))
            .limit(1)
          return rows[0] || null
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to find sync job: ${String(error)}`,
          }),
      })

      return result
    }),

  /**
   * Get latest sync job for a directory
   */
  findLatestByDirectoryId: (directoryId: number) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      const result = yield* Effect.tryPromise({
        try: async () => {
          const rows = await db.db
            .select()
            .from(syncJobs)
            .where(eq(syncJobs.directoryId, directoryId))
            .orderBy(desc(syncJobs.createdAt))
            .limit(1)
          return rows[0] || null
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to find latest sync job: ${String(error)}`,
          }),
      })

      return result
    }),

  /**
   * Update sync job
   */
  update: (id: number, updates: Partial<Omit<SyncJob, "id" | "createdAt" | "updatedAt">>) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      yield* Effect.tryPromise({
        try: async () => {
          await db.db
            .update(syncJobs)
            .set({ ...updates, updatedAt: new Date().toISOString() })
            .where(eq(syncJobs.id, id))
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to update sync job: ${String(error)}`,
          }),
      })
    }),

  /**
   * Mark job as running
   */
  markAsRunning: (id: number) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      yield* Effect.tryPromise({
        try: async () => {
          await db.db
            .update(syncJobs)
            .set({
              status: "running",
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(syncJobs.id, id))
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to mark sync job as running: ${String(error)}`,
          }),
      })
    }),

  /**
   * Mark job as completed
   */
  markAsCompleted: (id: number) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      yield* Effect.tryPromise({
        try: async () => {
          await db.db
            .update(syncJobs)
            .set({
              status: "completed",
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(syncJobs.id, id))
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to mark sync job as completed: ${String(error)}`,
          }),
      })
    }),

  /**
   * Mark job as failed
   */
  markAsFailed: (id: number, errorMessage: string) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService

      yield* Effect.tryPromise({
        try: async () => {
          await db.db
            .update(syncJobs)
            .set({
              status: "failed",
              errorMessage,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(syncJobs.id, id))
        },
        catch: (error) =>
          new DatabaseError({
            message: `Failed to mark sync job as failed: ${String(error)}`,
          }),
      })
    }),
}
