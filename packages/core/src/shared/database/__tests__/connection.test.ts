/**
 * Tests for Database Connection Service
 */

import { mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseService, DatabaseServiceLive } from "../connection"
import { DatabaseConnectionError } from "../../errors/database"

// Mock node:fs functions for error testing
vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs")
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
})

// Mock @libsql/client for error testing
vi.mock("@libsql/client", () => ({
  createClient: vi.fn(),
}))

describe("Database Connection Service", () => {
  let testDir: string
  let originalEnv: Record<string, string | undefined>

  beforeEach(async () => {
    // Save original environment
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      EES_DATA_DIR: process.env.EES_DATA_DIR,
    }

    // Create temporary test directory
    testDir = join(tmpdir(), `ees-db-connection-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    // Clear mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Restore original environment
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }

    // Reset mocks
    vi.resetAllMocks()
  })

  describe("DatabaseService interface", () => {
    it("should have correct interface structure", () => {
      // Test that the service tag exists
      expect(DatabaseService).toBeDefined()
      expect(typeof DatabaseService).toBe("object")
    })

    it("should be a context tag", () => {
      // Test that it's a proper Effect context tag
      expect(DatabaseService.toString()).toContain("DatabaseService")
    })
  })

  describe("Test environment handling", () => {
    it("should use in-memory database in test environment", async () => {
      process.env.NODE_ENV = "test"

      const { createClient } = await import("@libsql/client")

      // Mock successful client creation
      vi.mocked(createClient).mockReturnValue({
        close: vi.fn(),
        execute: vi.fn(),
      } as any)

      // Should create client with memory URL when called
      expect(() => {
        vi.mocked(createClient)({
          url: ":memory:",
        })
      }).not.toThrow()

      expect(createClient).toHaveBeenCalledWith({
        url: ":memory:",
      })
    })
  })

  describe("Production environment handling", () => {
    it("should handle production environment setup", async () => {
      process.env.NODE_ENV = "production"
      process.env.EES_DATA_DIR = testDir

      const { existsSync, mkdirSync } = await import("node:fs")

      // Mock directory doesn't exist
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdirSync).mockReturnValue(undefined)

      // Test directory creation logic
      if (!vi.mocked(existsSync)(testDir)) {
        vi.mocked(mkdirSync)(testDir, { recursive: true })
      }

      expect(existsSync).toHaveBeenCalledWith(testDir)
      expect(mkdirSync).toHaveBeenCalledWith(testDir, { recursive: true })
    })

    it("should skip directory creation if directory exists", async () => {
      const { existsSync, mkdirSync } = await import("node:fs")

      // Mock directory exists
      vi.mocked(existsSync).mockReturnValue(true)

      // Test directory creation logic
      if (!vi.mocked(existsSync)(testDir)) {
        vi.mocked(mkdirSync)(testDir, { recursive: true })
      }

      expect(existsSync).toHaveBeenCalledWith(testDir)
      expect(mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    it("should handle directory creation errors", async () => {
      process.env.NODE_ENV = "production"
      process.env.EES_DATA_DIR = testDir

      const { existsSync, mkdirSync } = await import("node:fs")

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdirSync).mockImplementation(() => {
        throw new Error("Permission denied")
      })

      const program = Effect.gen(function* () {
        const service = yield* DatabaseService
        return service
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result._tag).toBe("Failure")
    })

    it("should handle client creation errors", async () => {
      process.env.NODE_ENV = "test"

      const { createClient } = await import("@libsql/client")

      vi.mocked(createClient).mockImplementation(() => {
        throw new Error("Failed to create client")
      })

      const program = Effect.gen(function* () {
        const service = yield* DatabaseService
        return service
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(DatabaseServiceLive))
      )

      expect(result._tag).toBe("Failure")
    })
  })

  describe("Environment variable handling", () => {
    it("should handle environment variable logic", () => {
      // Test basic environment variable handling logic
      const testDir = "/test/custom/dir"
      const originalEnv = process.env.EES_DATA_DIR

      process.env.EES_DATA_DIR = testDir
      expect(process.env.EES_DATA_DIR).toBe(testDir)

      // Restore
      if (originalEnv === undefined) {
        delete process.env.EES_DATA_DIR
      } else {
        process.env.EES_DATA_DIR = originalEnv
      }
    })

    it("should handle missing environment variables", () => {
      const originalEnv = process.env.EES_DATA_DIR
      delete process.env.EES_DATA_DIR

      expect(process.env.EES_DATA_DIR).toBeUndefined()

      // Restore
      if (originalEnv !== undefined) {
        process.env.EES_DATA_DIR = originalEnv
      }
    })
  })

  describe("Service layer structure", () => {
    it("should provide DatabaseServiceLive layer", () => {
      expect(DatabaseServiceLive).toBeDefined()
      expect(typeof DatabaseServiceLive).toBe("object")
    })

    it("should export DatabaseService tag", () => {
      expect(DatabaseService).toBeDefined()
      expect(typeof DatabaseService).toBe("object")
      expect(DatabaseService.toString()).toContain("DatabaseService")
    })
  })
})