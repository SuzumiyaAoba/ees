import * as fs from "node:fs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { Effect, Exit } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DatabaseService,
  DatabaseServiceLive,
} from "@/shared/database/connection"
import { DatabaseConnectionError } from "@/shared/errors/database"

// Mock fs module for directory creation tests
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

// Mock @libsql/client
vi.mock("@libsql/client", () => ({
  createClient: vi.fn(),
}))

// Mock drizzle-orm/libsql
vi.mock("drizzle-orm/libsql", () => ({
  drizzle: vi.fn(),
}))

describe("DatabaseService", () => {
  const mockClient = {
    execute: vi.fn(),
  }

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockClient as any)
    vi.mocked(drizzle).mockReturnValue(mockDb as any)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    mockClient.execute.mockResolvedValue({ rows: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Database initialization", () => {
    it("should create database service successfully", async () => {
      const program = Effect.gen(function* () {
        const { db } = yield* DatabaseService
        return db
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result).toBe(mockDb)
      expect(createClient).toHaveBeenCalledWith({
        url: ":memory:",
      })
    })

    it("should use memory database in test environment", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = "test"

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(createClient).toHaveBeenCalledWith({
        url: ":memory:",
      })

      process.env.NODE_ENV = originalEnv
    })

    it("should use file database in non-test environment", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = undefined

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(createClient).toHaveBeenCalledWith({
        url: expect.stringMatching(/^file:.*embeddings\.db$/),
      })

      process.env.NODE_ENV = originalEnv
    })

    it("should create data directory if it doesn't exist", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = undefined
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("data"),
        { recursive: true }
      )

      process.env.NODE_ENV = originalEnv
    })

    it("should use custom data directory from environment variable", async () => {
      const originalEnv = process.env.NODE_ENV
      const originalDataDir = process.env.EES_DATA_DIR
      process.env.NODE_ENV = undefined
      process.env.EES_DATA_DIR = "/custom/data/path"
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(fs.mkdirSync).toHaveBeenCalledWith("/custom/data/path", {
        recursive: true,
      })
      expect(createClient).toHaveBeenCalledWith({
        url: "file:/custom/data/path/embeddings.db",
      })

      process.env.NODE_ENV = originalEnv
      if (originalDataDir) {
        process.env.EES_DATA_DIR = originalDataDir
      } else {
        process.env.EES_DATA_DIR = undefined
      }
    })

    it("should not create directory in test environment", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = "test"

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(fs.mkdirSync).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe("Schema initialization", () => {
    it("should execute all schema creation statements", async () => {
      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(mockClient.execute).toHaveBeenCalledTimes(5)

      // Check table creation
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS embeddings")
      )

      // Check index creation
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_embeddings_uri")
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE INDEX IF NOT EXISTS idx_embeddings_created_at"
        )
      )
      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE INDEX IF NOT EXISTS idx_embeddings_model_name"
        )
      )
    })

    it("should create table with correct schema including text column", async () => {
      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      const tableCreationCall = mockClient.execute.mock.calls.find((call) =>
        call[0].includes("CREATE TABLE")
      )
      expect(tableCreationCall).toBeDefined()
      expect(tableCreationCall?.[0]).toContain("text TEXT NOT NULL")
      expect(tableCreationCall?.[0]).toContain("uri TEXT NOT NULL UNIQUE")
      expect(tableCreationCall?.[0]).toContain(
        "model_name TEXT NOT NULL DEFAULT 'embeddinggemma:300m'"
      )
      expect(tableCreationCall?.[0]).toContain("embedding BLOB NOT NULL")
      expect(tableCreationCall?.[0]).toContain(
        "created_at TEXT DEFAULT CURRENT_TIMESTAMP"
      )
      expect(tableCreationCall?.[0]).toContain(
        "updated_at TEXT DEFAULT CURRENT_TIMESTAMP"
      )
    })

    it("should create all required indexes", async () => {
      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      const indexCalls = mockClient.execute.mock.calls.filter((call) =>
        call[0].includes("CREATE INDEX")
      )

      expect(indexCalls).toHaveLength(4)
      expect(indexCalls[0]?.[0]).toContain(
        "idx_embeddings_uri ON embeddings(uri)"
      )
      expect(indexCalls[1]?.[0]).toContain(
        "idx_embeddings_created_at ON embeddings(created_at)"
      )
      expect(indexCalls[2]?.[0]).toContain(
        "idx_embeddings_model_name ON embeddings(model_name)"
      )
      expect(indexCalls[3]?.[0]).toContain(
        "idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding"
      )
    })
  })

  describe("Error handling", () => {
    it("should handle client creation failure", async () => {
      vi.mocked(createClient).mockImplementation(() => {
        throw new Error("Failed to create client")
      })

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect((result.cause as any).error).toBeInstanceOf(
          DatabaseConnectionError
        )
        expect(((result.cause as any).error as any).message).toBe(
          "Failed to create database client"
        )
      }
    })

    it("should handle directory creation failure", async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = undefined
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error("Permission denied")
      })

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect((result.cause as any).error).toBeInstanceOf(
          DatabaseConnectionError
        )
        expect(((result.cause as any).error as any).message).toContain(
          "Failed to create data directory"
        )
      }

      process.env.NODE_ENV = originalEnv
    })

    it("should handle schema initialization failure", async () => {
      mockClient.execute.mockRejectedValue(new Error("SQL error"))

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        expect((result.cause as any).error).toBeInstanceOf(
          DatabaseConnectionError
        )
        expect(((result.cause as any).error as any).message).toBe(
          "Failed to initialize database schema"
        )
      }
    })

    it("should handle partial schema initialization failure", async () => {
      mockClient.execute
        .mockResolvedValueOnce({ rows: [] }) // Table creation succeeds
        .mockRejectedValue(new Error("Index creation failed")) // First index fails

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect((result.cause as any).error).toBeInstanceOf(
          DatabaseConnectionError
        )
      }
    })
  })

  describe("Database configuration edge cases", () => {
    it("should handle empty EES_DATA_DIR environment variable", async () => {
      const originalEnv = process.env.NODE_ENV
      const originalDataDir = process.env.EES_DATA_DIR
      process.env.NODE_ENV = undefined
      process.env.EES_DATA_DIR = ""

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      // Should fall back to default data directory
      expect(createClient).toHaveBeenCalledWith({
        url: expect.stringMatching(/data.*embeddings\.db$/),
      })

      process.env.NODE_ENV = originalEnv
      if (originalDataDir) {
        process.env.EES_DATA_DIR = originalDataDir
      } else {
        process.env.EES_DATA_DIR = undefined
      }
    })

    it("should handle whitespace-only EES_DATA_DIR", async () => {
      const originalEnv = process.env.NODE_ENV
      const originalDataDir = process.env.EES_DATA_DIR
      process.env.NODE_ENV = undefined
      process.env.EES_DATA_DIR = "   "

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      // Should use the whitespace path as-is (though not recommended)
      expect(createClient).toHaveBeenCalledWith({
        url: expect.stringMatching(/file:.*\s+.*embeddings\.db$/),
      })

      process.env.NODE_ENV = originalEnv
      if (originalDataDir) {
        process.env.EES_DATA_DIR = originalDataDir
      } else {
        process.env.EES_DATA_DIR = undefined
      }
    })

    it("should handle relative path in EES_DATA_DIR", async () => {
      const originalEnv = process.env.NODE_ENV
      const originalDataDir = process.env.EES_DATA_DIR
      process.env.NODE_ENV = undefined
      process.env.EES_DATA_DIR = "./relative/path"

      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(createClient).toHaveBeenCalledWith({
        url: expect.stringMatching(/relative.*path.*embeddings\.db$/),
      })

      process.env.NODE_ENV = originalEnv
      if (originalDataDir) {
        process.env.EES_DATA_DIR = originalDataDir
      } else {
        process.env.EES_DATA_DIR = undefined
      }
    })

    it("should handle NODE_ENV case variations", async () => {
      const originalEnv = process.env.NODE_ENV

      // Test various test environment indicators
      const testVariations = ["test", "TEST", "Test", "testing"]

      for (const testEnv of testVariations) {
        process.env.NODE_ENV = testEnv

        const program = Effect.gen(function* () {
          yield* DatabaseService
        })

        await Effect.runPromise(
          program.pipe(Effect.provide(DatabaseServiceLive))
        )

        if (testEnv === "test") {
          expect(createClient).toHaveBeenCalledWith({
            url: ":memory:",
          })
        } else {
          // Only exact "test" should trigger memory database
          expect(createClient).toHaveBeenCalledWith({
            url: expect.stringMatching(/^file:.*embeddings\.db$/),
          })
        }

        vi.clearAllMocks()
        vi.mocked(createClient).mockReturnValue(mockClient as any)
        mockClient.execute.mockResolvedValue({ rows: [] })
      }

      process.env.NODE_ENV = originalEnv
    })
  })

  describe("Database instance and drizzle integration", () => {
    it("should initialize drizzle with correct schema", async () => {
      const program = Effect.gen(function* () {
        yield* DatabaseService
      })

      await Effect.runPromise(program.pipe(Effect.provide(DatabaseServiceLive)))

      expect(drizzle).toHaveBeenCalledWith(mockClient, {
        schema: expect.any(Object),
      })
    })

    it("should return the same database instance on multiple accesses", async () => {
      const program = Effect.gen(function* () {
        const service1 = yield* DatabaseService
        const service2 = yield* DatabaseService
        return { db1: service1.db, db2: service2.db }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result.db1).toBe(result.db2)
    })

    it("should initialize successfully without errors", async () => {
      const program = Effect.gen(function* () {
        const { db } = yield* DatabaseService
        return db
      })

      // Should not throw any errors
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result).toBeDefined()
    })

    it("should handle multiple concurrent initializations", async () => {
      const programs = Array.from({ length: 5 }, () =>
        Effect.gen(function* () {
          const { db } = yield* DatabaseService
          return db
        }).pipe(Effect.provide(DatabaseServiceLive))
      )

      const results = await Promise.all(
        programs.map((program) => Effect.runPromise(program))
      )

      // All should return the same database instance
      results.forEach((db) => {
        expect(db).toBe(mockDb)
      })

      // Client creation count depends on Effect's layer caching behavior
      expect(createClient).toHaveBeenCalled()
    })
  })

  describe("Memory cleanup and resource management", () => {
    it("should handle service termination gracefully", async () => {
      const program = Effect.gen(function* () {
        const { db } = yield* DatabaseService
        // Simulate some database operations
        return db
      })

      // Run and complete the program
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result).toBe(mockDb)
      // No specific cleanup assertions as the current implementation
      // doesn't have explicit cleanup logic, but this tests that
      // the service can be created and used without issues
    })

    it("should be usable across multiple independent program runs", async () => {
      // First program run
      const program1 = Effect.gen(function* () {
        const { db } = yield* DatabaseService
        return db
      })

      const result1 = await Effect.runPromise(
        program1.pipe(Effect.provide(DatabaseServiceLive))
      )

      // Second program run
      const program2 = Effect.gen(function* () {
        const { db } = yield* DatabaseService
        return db
      })

      const result2 = await Effect.runPromise(
        program2.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result1).toBe(mockDb)
      expect(result2).toBe(mockDb)
    })
  })
})
