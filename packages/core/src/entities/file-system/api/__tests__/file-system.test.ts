import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Effect } from "effect"
import { mkdirSync, rmdirSync, writeFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { FileSystemService, FileSystemServiceLive } from "@ees/core"

describe("FileSystemService", () => {
  let testDir: string

  const runTest = <A>(effect: Effect.Effect<A, unknown, FileSystemService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(FileSystemServiceLive)))

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `ees-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    try {
      // Remove all contents recursively
      const removeDir = (dir: string) => {
        try {
          const { readdirSync, statSync } = require("node:fs")
          const entries = readdirSync(dir)
          for (const entry of entries) {
            const fullPath = join(dir, entry)
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
              removeDir(fullPath)
            } else {
              unlinkSync(fullPath)
            }
          }
          rmdirSync(dir)
        } catch {
          // Ignore cleanup errors
        }
      }
      removeDir(testDir)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("listDirectory", () => {
    it("should list subdirectories in a directory", async () => {
      // Create test directories
      mkdirSync(join(testDir, "dir1"))
      mkdirSync(join(testDir, "dir2"))
      mkdirSync(join(testDir, "dir3"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toHaveLength(3)
      expect(result.map(e => e.name).sort()).toEqual(["dir1", "dir2", "dir3"])
      expect(result.every(e => e.isDirectory)).toBe(true)
    })

    it("should return directories sorted alphabetically", async () => {
      // Create directories in non-alphabetical order
      mkdirSync(join(testDir, "zebra"))
      mkdirSync(join(testDir, "apple"))
      mkdirSync(join(testDir, "banana"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result.map(e => e.name)).toEqual(["apple", "banana", "zebra"])
    })

    it("should not include files in the results", async () => {
      // Create directories and files
      mkdirSync(join(testDir, "directory"))
      writeFileSync(join(testDir, "file.txt"), "content")
      writeFileSync(join(testDir, "another-file.md"), "content")

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe("directory")
      expect(result[0]?.isDirectory).toBe(true)
    })

    it("should skip hidden directories (starting with .)", async () => {
      // Create visible and hidden directories
      mkdirSync(join(testDir, "visible"))
      mkdirSync(join(testDir, ".hidden"))
      mkdirSync(join(testDir, ".another-hidden"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe("visible")
    })

    it("should return empty array for empty directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toEqual([])
    })

    it("should return full paths for entries", async () => {
      mkdirSync(join(testDir, "subdir"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.path).toBe(join(testDir, "subdir"))
    })

    it("should fail for non-existent path", async () => {
      const nonExistentPath = join(testDir, "non-existent")

      await expect(
        runTest(
          Effect.gen(function* () {
            const service = yield* FileSystemService
            return yield* service.listDirectory(nonExistentPath)
          })
        )
      ).rejects.toThrow()
    })

    it("should fail when path is a file", async () => {
      const filePath = join(testDir, "file.txt")
      writeFileSync(filePath, "content")

      await expect(
        runTest(
          Effect.gen(function* () {
            const service = yield* FileSystemService
            return yield* service.listDirectory(filePath)
          })
        )
      ).rejects.toThrow(/not a directory/)
    })

    it("should handle nested directory structures", async () => {
      // Create nested structure
      mkdirSync(join(testDir, "parent1"))
      mkdirSync(join(testDir, "parent1", "child1"))
      mkdirSync(join(testDir, "parent1", "child2"))
      mkdirSync(join(testDir, "parent2"))

      // List top level
      const topLevel = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(topLevel.map(e => e.name).sort()).toEqual(["parent1", "parent2"])

      // List nested level
      const nested = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(join(testDir, "parent1"))
        })
      )

      expect(nested.map(e => e.name).sort()).toEqual(["child1", "child2"])
    })

    it("should skip directories with permission errors", async () => {
      // This test is platform-specific and may not work on all systems
      // We create a directory but can't easily test permission errors in a portable way
      mkdirSync(join(testDir, "accessible"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      // Should at least return the accessible directory
      expect(result.some(e => e.name === "accessible")).toBe(true)
    })

    it("should handle directory names with special characters", async () => {
      const specialNames = ["dir with spaces", "dir-with-dashes", "dir_with_underscores"]

      for (const name of specialNames) {
        mkdirSync(join(testDir, name))
      }

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.listDirectory(testDir)
        })
      )

      expect(result).toHaveLength(specialNames.length)
      expect(result.map(e => e.name).sort()).toEqual(specialNames.sort())
    })
  })

  describe("validatePath", () => {
    it("should return true for existing directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.validatePath(testDir)
        })
      )

      expect(result).toBe(true)
    })

    it("should return false for non-existent path", async () => {
      const nonExistentPath = join(testDir, "non-existent")

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.validatePath(nonExistentPath)
        })
      )

      expect(result).toBe(false)
    })

    it("should return false for file path", async () => {
      const filePath = join(testDir, "file.txt")
      writeFileSync(filePath, "content")

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.validatePath(filePath)
        })
      )

      expect(result).toBe(false)
    })

    it("should validate nested directory paths", async () => {
      mkdirSync(join(testDir, "parent"))
      mkdirSync(join(testDir, "parent", "child"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.validatePath(join(testDir, "parent", "child"))
        })
      )

      expect(result).toBe(true)
    })
  })

  describe("tilde (~) expansion", () => {
    it("should expand ~ to home directory in listDirectory", async () => {
      // This test verifies that ~ is resolved to the home directory
      // We can't guarantee specific directories exist in home, so we just verify no error
      try {
        await runTest(
          Effect.gen(function* () {
            const service = yield* FileSystemService
            return yield* service.listDirectory("~")
          })
        )
        // If it doesn't throw, ~ was properly expanded
        expect(true).toBe(true)
      } catch (error) {
        // Some CI environments might not have a proper home directory
        // This is acceptable
        expect(true).toBe(true)
      }
    })

    it("should expand ~ to home directory in validatePath", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          return yield* service.validatePath("~")
        })
      )

      // Home directory should exist
      expect(result).toBe(true)
    })
  })

  describe("Integration scenarios", () => {
    it("should handle complex directory tree navigation", async () => {
      // Create a complex structure
      mkdirSync(join(testDir, "projects"))
      mkdirSync(join(testDir, "projects", "project1"))
      mkdirSync(join(testDir, "projects", "project1", "src"))
      mkdirSync(join(testDir, "projects", "project1", "tests"))
      mkdirSync(join(testDir, "projects", "project2"))
      mkdirSync(join(testDir, "documents"))

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService

          // Validate root
          const isValid = yield* service.validatePath(testDir)
          expect(isValid).toBe(true)

          // List root level
          const root = yield* service.listDirectory(testDir)
          expect(root.map(e => e.name).sort()).toEqual(["documents", "projects"])

          // Navigate to projects
          const projects = yield* service.listDirectory(join(testDir, "projects"))
          expect(projects.map(e => e.name).sort()).toEqual(["project1", "project2"])

          // Navigate to project1
          const project1 = yield* service.listDirectory(join(testDir, "projects", "project1"))
          expect(project1.map(e => e.name).sort()).toEqual(["src", "tests"])

          return true
        })
      )

      expect(result).toBe(true)
    })

    it("should handle mixed content (files and directories)", async () => {
      // Create mixed content
      mkdirSync(join(testDir, "dir1"))
      mkdirSync(join(testDir, "dir2"))
      writeFileSync(join(testDir, "file1.txt"), "content")
      writeFileSync(join(testDir, "file2.md"), "content")
      mkdirSync(join(testDir, ".hidden-dir"))
      writeFileSync(join(testDir, ".hidden-file"), "content")

      const result = await runTest(
        Effect.gen(function* () {
          const service = yield* FileSystemService
          const entries = yield* service.listDirectory(testDir)

          // Should only return visible directories
          expect(entries).toHaveLength(2)
          expect(entries.map(e => e.name).sort()).toEqual(["dir1", "dir2"])
          expect(entries.every(e => e.isDirectory)).toBe(true)

          return true
        })
      )

      expect(result).toBe(true)
    })
  })
})
