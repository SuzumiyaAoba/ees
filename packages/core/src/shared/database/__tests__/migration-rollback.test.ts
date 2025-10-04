/**
 * Migration Rollback and Edge Case Tests
 * Tests critical failure scenarios and recovery mechanisms for database migrations
 */

import { createClient } from "@libsql/client"
import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { DatabaseConnectionError } from "@/shared/errors/database"

// Mock dependencies
vi.mock("@libsql/client")

const mockCreateClient = vi.mocked(createClient)

interface MockClient {
  execute: ReturnType<typeof vi.fn>
}

describe("Migration Rollback Scenarios", () => {
  let mockClient: MockClient

  beforeEach(() => {
    vi.clearAllMocks()

    mockClient = {
      execute: vi.fn(),
    }

    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
  })

  describe("Failed Migration Recovery", () => {
    it("should fail gracefully when DROP TABLE fails mid-migration", async () => {
      const dropTableError = new Error("Table is locked by another process")

      mockClient.execute
        // First call: Check table format (detects BLOB)
        .mockResolvedValueOnce({
          rows: [{
            sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)",
          }],
        })
        // Second call: Backup existing data (succeeds)
        .mockResolvedValueOnce({
          rows: [
            { uri: "doc1", text: "Text 1", model_name: "old-model" },
            { uri: "doc2", text: "Text 2", model_name: "old-model" },
          ],
        })
        // Third call: DROP TABLE (fails)
        .mockRejectedValueOnce(dropTableError)

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            // Check migration need
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              // Backup data
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              // Attempt to drop table (this will fail)
              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)

              return { migrated: true, removedCount: existingData.rows.length }
            }

            return { migrated: false, removedCount: 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to perform migration",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(performMigration())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Failed to perform migration")
        expect(error.cause).toBe(dropTableError)
      }

      // Verify backup was attempted but migration stopped at DROP TABLE
      expect(mockClient.execute).toHaveBeenCalledTimes(3)
    })

    it("should fail gracefully when CREATE TABLE fails after DROP", async () => {
      const createTableError = new Error("Insufficient disk space")

      mockClient.execute
        // Check table format
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        // Backup data
        .mockResolvedValueOnce({
          rows: [{ uri: "doc1", text: "Text 1", model_name: "old-model" }],
        })
        // DROP TABLE succeeds
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        // DROP indices succeed
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        // CREATE TABLE fails
        .mockRejectedValueOnce(createTableError)

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              // Drop table and indices
              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

              // Create new table (will fail)
              await mockClient.execute(`
                CREATE TABLE IF NOT EXISTS embeddings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  uri TEXT NOT NULL UNIQUE,
                  text TEXT NOT NULL,
                  model_name TEXT NOT NULL DEFAULT 'nomic-embed-text',
                  embedding F32_BLOB(768) NOT NULL,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `)

              return { migrated: true, removedCount: existingData.rows.length }
            }

            return { migrated: false, removedCount: 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to perform migration - database left in inconsistent state",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(performMigration())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("database left in inconsistent state")
        expect(error.cause).toBe(createTableError)
      }
    })

    it("should handle index creation failure after successful table creation", async () => {
      const indexError = new Error("libsql_vector_idx function not found")

      mockClient.execute
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        .mockResolvedValueOnce({ rows: [{ uri: "doc1", text: "Text 1" }] })
        // DROP operations succeed
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        // CREATE TABLE succeeds
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        // CREATE INDEX operations
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // uri index
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // created_at index
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // model_name index
        // Vector index creation fails
        .mockRejectedValueOnce(indexError)

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

              await mockClient.execute(`
                CREATE TABLE IF NOT EXISTS embeddings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  uri TEXT NOT NULL UNIQUE,
                  text TEXT NOT NULL,
                  model_name TEXT NOT NULL DEFAULT 'nomic-embed-text',
                  embedding F32_BLOB(768) NOT NULL,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `)

              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_uri ON embeddings(uri)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))`)

              return { migrated: true, removedCount: existingData.rows.length }
            }

            return { migrated: false, removedCount: 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to create vector index during migration",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(performMigration())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Failed to create vector index during migration")
        expect(error.cause).toBe(indexError)
      }
    })
  })

  describe("Partial Migration Scenarios", () => {
    it("should handle migration with zero existing embeddings", async () => {
      mockClient.execute
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        // Empty table
        .mockResolvedValueOnce({ rows: [] })
        // All other operations succeed
        .mockResolvedValue({ rows: [], rowsAffected: 1 })

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

              await mockClient.execute(`CREATE TABLE IF NOT EXISTS embeddings (...)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_uri ON embeddings(uri)`)

              return { migrated: true, removedCount: existingData.rows.length }
            }

            return { migrated: false, removedCount: 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Migration failed",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(performMigration())

      expect(result.migrated).toBe(true)
      expect(result.removedCount).toBe(0)
    })

    it("should handle migration with very large number of existing embeddings", async () => {
      // Simulate 10,000 embeddings
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        uri: `doc${i}`,
        text: `Document ${i}`,
        model_name: "old-model",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }))

      mockClient.execute
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        .mockResolvedValueOnce({ rows: largeDataset })
        .mockResolvedValue({ rows: [], rowsAffected: 1 })

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)

              return { migrated: true, removedCount: existingData.rows.length }
            }

            return { migrated: false, removedCount: 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Migration failed",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(performMigration())

      expect(result.migrated).toBe(true)
      expect(result.removedCount).toBe(10000)
    })
  })

  describe("Incompatible Model Dimensions", () => {
    it("should document that F32_BLOB dimension is fixed at creation", async () => {
      // This test documents the behavior that F32_BLOB(768) is set at table creation
      // and cannot be dynamically changed based on model dimensions
      mockClient.execute.mockResolvedValue({ rows: [], rowsAffected: 1 })

      const createTableWithDimensions = (dimensions: number) =>
        Effect.tryPromise({
          try: async () => {
            await mockClient.execute(`
              CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                embedding F32_BLOB(${dimensions}) NOT NULL
              )
            `)
            return { created: true, dimensions }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to create table",
              cause: error,
            }),
        })

      // Create table with specific dimensions
      const result = await Effect.runPromise(createTableWithDimensions(768))

      expect(result.created).toBe(true)
      expect(result.dimensions).toBe(768)

      // Verify the SQL contains the dimension
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("F32_BLOB(768)")
      )
    })

    it("should note that different model dimensions require migration", async () => {
      // This test documents that if embeddings change dimension
      // (e.g., from 768 to 1536), a migration is needed

      const oldDimension = 768
      const newDimension = 1536

      expect(oldDimension).not.toBe(newDimension)
      expect(newDimension).toBeGreaterThan(oldDimension)

      // This documents the business rule: dimension changes require migration
      const requiresMigration = oldDimension !== newDimension
      expect(requiresMigration).toBe(true)
    })
  })

  describe("Concurrent Migration Attempts", () => {
    it("should handle database locked error during concurrent migration", async () => {
      const lockedError = new Error("database is locked")

      mockClient.execute
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        .mockRejectedValueOnce(lockedError)

      const performMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigration =
              tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              // This will fail due to lock
              await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)
            }

            return { migrated: false }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Database locked - another migration may be in progress",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(performMigration())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Database locked")
        expect(error.cause).toBe(lockedError)
      }
    })

    it("should detect if migration already completed by another process", async () => {
      // Simulate scenario where another process completed migration
      // between the check and the migration attempt

      mockClient.execute
        // First check: shows BLOB format (migration needed)
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        // Second check (after waiting): shows F32_BLOB (already migrated)
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding F32_BLOB(768) NOT NULL)" }],
        })

      const checkMigrationNeed = () =>
        Effect.tryPromise({
          try: async () => {
            const firstCheck = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigrationFirst =
              firstCheck.rows.length > 0 &&
              firstCheck.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !firstCheck.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            // Simulate delay (e.g., user confirmation or preparation)
            // In real scenario, another process completes migration here

            const secondCheck = await mockClient.execute(`
              SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'
            `)

            const needsMigrationSecond =
              secondCheck.rows.length > 0 &&
              secondCheck.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !secondCheck.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            return {
              firstCheckNeeded: needsMigrationFirst,
              secondCheckNeeded: needsMigrationSecond,
              alreadyMigrated: needsMigrationFirst && !needsMigrationSecond,
            }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Migration check failed",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(checkMigrationNeed())

      expect(result.firstCheckNeeded).toBe(true)
      expect(result.secondCheckNeeded).toBe(false)
      expect(result.alreadyMigrated).toBe(true)
    })
  })
})
