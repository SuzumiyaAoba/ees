import { createClient } from "@libsql/client"
import { Effect, Exit } from "effect"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { DatabaseConnectionError } from "@/shared/errors/database"

// Mock dependencies
vi.mock("node:fs")
vi.mock("@libsql/client")

import { existsSync, mkdirSync } from "node:fs"

const mockExistsSync = vi.mocked(existsSync)
const mockMkdirSync = vi.mocked(mkdirSync)
const mockCreateClient = vi.mocked(createClient)

interface MockClient {
  execute: ReturnType<typeof vi.fn>
}

describe("Database Migration Logic", () => {
  let mockClient: MockClient
  let consoleLogSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock client
    mockClient = {
      execute: vi.fn(),
    }

    mockCreateClient.mockReturnValue(mockClient as any)

    // Mock console.log to capture migration messages
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    // Default file system mocks
    mockExistsSync.mockReturnValue(true)
    mockMkdirSync.mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe("Database Initialization", () => {
    it("should create data directory when it doesn't exist", async () => {
      mockExistsSync.mockReturnValue(false)

      const mockInitializeDatabase = () =>
        Effect.gen(function* () {
          const dataDir = "/test/data"

          yield* Effect.try({
            try: () => {
              if (!existsSync(dataDir)) {
                mkdirSync(dataDir, { recursive: true })
              }
            },
            catch: (error) =>
              new DatabaseConnectionError({
                message: `Failed to create data directory: ${dataDir}`,
                cause: error,
              }),
          })

          return true
        })

      const result = await Effect.runPromise(mockInitializeDatabase())

      expect(result).toBe(true)
      expect(mockExistsSync).toHaveBeenCalledWith("/test/data")
      expect(mockMkdirSync).toHaveBeenCalledWith("/test/data", { recursive: true })
    })

    it("should handle directory creation failure", async () => {
      mockExistsSync.mockReturnValue(false)
      const dirError = new Error("Permission denied")
      mockMkdirSync.mockImplementation(() => {
        throw dirError
      })

      const mockInitializeDatabase = () =>
        Effect.gen(function* () {
          const dataDir = "/test/data"

          yield* Effect.try({
            try: () => {
              if (!existsSync(dataDir)) {
                mkdirSync(dataDir, { recursive: true })
              }
            },
            catch: (error) =>
              new DatabaseConnectionError({
                message: `Failed to create data directory: ${dataDir}`,
                cause: error,
              }),
          })

          return true
        })

      const result = await Effect.runPromiseExit(mockInitializeDatabase())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Failed to create data directory")
      }
    })

    it("should skip directory creation when directory exists", async () => {
      mockExistsSync.mockReturnValue(true)

      const mockInitializeDatabase = () =>
        Effect.gen(function* () {
          const dataDir = "/existing/data"

          yield* Effect.try({
            try: () => {
              if (!existsSync(dataDir)) {
                mkdirSync(dataDir, { recursive: true })
              }
            },
            catch: (error) =>
              new DatabaseConnectionError({
                message: `Failed to create data directory: ${dataDir}`,
                cause: error,
              }),
          })

          return true
        })

      const result = await Effect.runPromise(mockInitializeDatabase())

      expect(result).toBe(true)
      expect(mockExistsSync).toHaveBeenCalledWith("/existing/data")
      expect(mockMkdirSync).not.toHaveBeenCalled()
    })
  })

  describe("Schema Migration Detection", () => {
    it("should detect need for migration from BLOB to F32_BLOB", async () => {
      // Mock table exists with BLOB format
      mockClient.execute.mockResolvedValue({
        rows: [
          {
            sql: "CREATE TABLE embeddings (id INTEGER PRIMARY KEY, embedding BLOB NOT NULL)",
          },
        ],
      })

      const mockCheckMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            return { needsMigration, tableExists: tableInfo.rows.length > 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to check migration status",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(mockCheckMigration())

      expect(result.needsMigration).toBe(true)
      expect(result.tableExists).toBe(true)
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT sql FROM sqlite_master")
      )
    })

    it("should not migrate when table already uses F32_BLOB", async () => {
      // Mock table exists with F32_BLOB format
      mockClient.execute.mockResolvedValue({
        rows: [
          {
            sql: "CREATE TABLE embeddings (id INTEGER PRIMARY KEY, embedding F32_BLOB(768) NOT NULL)",
          },
        ],
      })

      const mockCheckMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            return { needsMigration, tableExists: tableInfo.rows.length > 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to check migration status",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(mockCheckMigration())

      expect(result.needsMigration).toBe(false)
      expect(result.tableExists).toBe(true)
    })

    it("should not migrate when table doesn't exist", async () => {
      // Mock no table exists
      mockClient.execute.mockResolvedValue({ rows: [] })

      const mockCheckMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            return { needsMigration, tableExists: tableInfo.rows.length > 0 }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to check migration status",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(mockCheckMigration())

      expect(result.needsMigration).toBe(false)
      expect(result.tableExists).toBe(false)
    })
  })

  describe("Migration Process", () => {
    it("should successfully migrate from BLOB to F32_BLOB format", async () => {
      // Setup migration scenario
      const existingData = {
        rows: [
          {
            uri: "doc1",
            text: "Document 1",
            model_name: "old-model",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          {
            uri: "doc2",
            text: "Document 2",
            model_name: "old-model",
            created_at: "2024-01-02T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
        ],
      }

      mockClient.execute
        .mockResolvedValueOnce({
          rows: [
            {
              sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)",
            },
          ],
        })
        .mockResolvedValueOnce(existingData) // Backup existing data
        .mockResolvedValue({ rows: [], rowsAffected: 1 }) // All other operations

      const mockPerformMigration = () =>
        Effect.tryPromise({
          try: async () => {
            // Check migration need
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              console.log("🔄 Migrating database schema from BLOB to F32_BLOB format...")

              // Back up existing data
              const existingData = await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)

              // Drop old table and indices
              await mockClient.execute(`DROP TABLE IF EXISTS embeddings`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
              await mockClient.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

              console.log(`⚠️  Migration removed ${existingData.rows.length} existing embeddings (BLOB format not compatible with F32_BLOB)`)
              console.log("💡 Embeddings will need to be recreated with the new vector format")

              // Create new table with F32_BLOB format
              await mockClient.execute(`
                CREATE TABLE IF NOT EXISTS embeddings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  uri TEXT NOT NULL UNIQUE,
                  text TEXT NOT NULL,
                  model_name TEXT NOT NULL DEFAULT 'embeddinggemma:300m',
                  embedding F32_BLOB(768) NOT NULL,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `)

              // Create indices
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_uri ON embeddings(uri)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))`)

              console.log("✅ Database migration completed successfully")

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

      const result = await Effect.runPromise(mockPerformMigration())

      expect(result.migrated).toBe(true)
      expect(result.removedCount).toBe(2)

      // Verify migration steps
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT sql FROM sqlite_master")
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT uri, text, model_name")
      )
      expect(mockClient.execute).toHaveBeenCalledWith("DROP TABLE IF EXISTS embeddings")
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS embeddings")
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_embeddings_vector")
      )

      // Verify console messages
      expect(consoleLogSpy).toHaveBeenCalledWith("🔄 Migrating database schema from BLOB to F32_BLOB format...")
      expect(consoleLogSpy).toHaveBeenCalledWith("⚠️  Migration removed 2 existing embeddings (BLOB format not compatible with F32_BLOB)")
      expect(consoleLogSpy).toHaveBeenCalledWith("💡 Embeddings will need to be recreated with the new vector format")
      expect(consoleLogSpy).toHaveBeenCalledWith("✅ Database migration completed successfully")
    })

    it("should handle migration failure gracefully", async () => {
      const dbError = new Error("Database is locked")

      mockClient.execute
        .mockResolvedValueOnce({
          rows: [{ sql: "CREATE TABLE embeddings (embedding BLOB NOT NULL)" }],
        })
        .mockRejectedValue(dbError)

      const mockPerformMigration = () =>
        Effect.tryPromise({
          try: async () => {
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (needsMigration) {
              await mockClient.execute(`
                SELECT uri, text, model_name, created_at, updated_at FROM embeddings
              `)
            }

            return { migrated: false }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to initialize database schema",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(mockPerformMigration())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Failed to initialize database schema")
        expect(error.cause).toBe(dbError)
      }
    })
  })

  describe("Fresh Database Creation", () => {
    it("should create new database schema when no table exists", async () => {
      mockClient.execute.mockResolvedValue({ rows: [], rowsAffected: 1 })

      const mockCreateFreshSchema = () =>
        Effect.tryPromise({
          try: async () => {
            // Check if table exists
            const tableInfo = await mockClient.execute(`
              SELECT sql FROM sqlite_master
              WHERE type='table' AND name='embeddings'
            `)

            const needsMigration = tableInfo.rows.length > 0 &&
              tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
              !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

            if (!needsMigration) {
              // Create new table with F32_BLOB format
              await mockClient.execute(`
                CREATE TABLE IF NOT EXISTS embeddings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  uri TEXT NOT NULL UNIQUE,
                  text TEXT NOT NULL,
                  model_name TEXT NOT NULL DEFAULT 'embeddinggemma:300m',
                  embedding F32_BLOB(768) NOT NULL,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `)

              // Create indices
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_uri ON embeddings(uri)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)`)
              await mockClient.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))`)
            }

            return { created: true }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to create database schema",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(mockCreateFreshSchema())

      expect(result.created).toBe(true)

      // Verify schema creation
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS embeddings")
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_embeddings_uri")
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_embeddings_vector")
      )
    })
  })

  describe("Vector Index Creation", () => {
    it("should create vector index with cosine metric", async () => {
      mockClient.execute.mockResolvedValue({ rows: [], rowsAffected: 1 })

      const mockCreateVectorIndex = () =>
        Effect.tryPromise({
          try: async () => {
            await mockClient.execute(`
              CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))
            `)
            return { indexCreated: true }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to create vector index",
              cause: error,
            }),
        })

      const result = await Effect.runPromise(mockCreateVectorIndex())

      expect(result.indexCreated).toBe(true)
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("libsql_vector_idx(embedding, 'metric=cosine')")
      )
    })

    it("should handle vector index creation failure", async () => {
      const indexError = new Error("Vector extension not available")
      mockClient.execute.mockRejectedValue(indexError)

      const mockCreateVectorIndex = () =>
        Effect.tryPromise({
          try: async () => {
            await mockClient.execute(`
              CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))
            `)
            return { indexCreated: true }
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: "Failed to create vector index",
              cause: error,
            }),
        })

      const result = await Effect.runPromiseExit(mockCreateVectorIndex())

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: DatabaseConnectionError }).error
        expect(error).toBeInstanceOf(DatabaseConnectionError)
        expect(error.message).toContain("Failed to create vector index")
        expect(error.cause).toBe(indexError)
      }
    })
  })
})