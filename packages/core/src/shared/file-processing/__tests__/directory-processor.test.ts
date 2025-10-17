import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Effect } from "effect"
import { mkdirSync, writeFileSync, rmdirSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  collectFilesFromDirectory,
  filterByExtension,
  filterBySize,
  type CollectedFile,
} from "@ees/core"

describe("directory-processor", () => {
  let testDir: string

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `ees-dir-proc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    try {
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

  describe("collectFilesFromDirectory", () => {
    it("should collect all files from a flat directory", async () => {
      // Create test files
      writeFileSync(join(testDir, "file1.txt"), "content1")
      writeFileSync(join(testDir, "file2.md"), "content2")
      writeFileSync(join(testDir, "file3.js"), "content3")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      expect(result).toHaveLength(3)
      expect(result.map(f => f.relativePath).sort()).toEqual(["file1.txt", "file2.md", "file3.js"])
      expect(result.every(f => f.absolutePath.includes(testDir))).toBe(true)
      expect(result.every(f => f.size > 0)).toBe(true)
    })

    it("should recursively collect files from nested directories", async () => {
      // Create nested structure
      mkdirSync(join(testDir, "subdir1"))
      mkdirSync(join(testDir, "subdir1", "subdir2"))
      mkdirSync(join(testDir, "subdir3"))

      writeFileSync(join(testDir, "root.txt"), "root")
      writeFileSync(join(testDir, "subdir1", "sub1.txt"), "sub1")
      writeFileSync(join(testDir, "subdir1", "subdir2", "sub2.txt"), "sub2")
      writeFileSync(join(testDir, "subdir3", "sub3.txt"), "sub3")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      expect(result).toHaveLength(4)
      const relativePaths = result.map(f => f.relativePath).sort()
      expect(relativePaths).toEqual([
        "root.txt",
        join("subdir1", "sub1.txt"),
        join("subdir1", "subdir2", "sub2.txt"),
        join("subdir3", "sub3.txt"),
      ].sort())
    })

    it("should respect default ignore patterns", async () => {
      // Create files and directories that should be ignored by default
      mkdirSync(join(testDir, "node_modules"))
      mkdirSync(join(testDir, ".git"))
      mkdirSync(join(testDir, "src"))

      writeFileSync(join(testDir, "src", "main.ts"), "code")
      writeFileSync(join(testDir, "node_modules", "package.js"), "code")
      writeFileSync(join(testDir, ".git", "config"), "config")
      writeFileSync(join(testDir, "test.log"), "logs")
      writeFileSync(join(testDir, ".env"), "secrets")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // Should only include src/main.ts
      // node_modules, .git, *.log, .env should be ignored by default
      expect(result).toHaveLength(1)
      expect(result[0]?.relativePath).toBe(join("src", "main.ts"))
    })

    it("should respect .eesignore file", async () => {
      // Create .eesignore file
      writeFileSync(join(testDir, ".eesignore"), "*.log\ntemp/\n")

      // Create test files
      mkdirSync(join(testDir, "temp"))
      writeFileSync(join(testDir, "main.js"), "code")
      writeFileSync(join(testDir, "test.log"), "logs")
      writeFileSync(join(testDir, "temp", "file.txt"), "temp")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // Should only include main.js
      expect(result).toHaveLength(1)
      expect(result[0]?.relativePath).toBe("main.js")
    })

    it("should respect additional ignore patterns option", async () => {
      writeFileSync(join(testDir, "file1.txt"), "content")
      writeFileSync(join(testDir, "file2.md"), "content")
      writeFileSync(join(testDir, "file3.txt"), "content")

      const result = await Effect.runPromise(
        collectFilesFromDirectory(testDir, {
          additionalIgnorePatterns: ["*.txt"],
        })
      )

      // Should only include file2.md
      expect(result).toHaveLength(1)
      expect(result[0]?.relativePath).toBe("file2.md")
    })

    it("should respect maxDepth option", async () => {
      // Create nested structure with depth 3
      mkdirSync(join(testDir, "level1"))
      mkdirSync(join(testDir, "level1", "level2"))
      mkdirSync(join(testDir, "level1", "level2", "level3"))

      writeFileSync(join(testDir, "root.txt"), "root")
      writeFileSync(join(testDir, "level1", "file1.txt"), "level1")
      writeFileSync(join(testDir, "level1", "level2", "file2.txt"), "level2")
      writeFileSync(join(testDir, "level1", "level2", "level3", "file3.txt"), "level3")

      // Collect with maxDepth = 1
      const result = await Effect.runPromise(
        collectFilesFromDirectory(testDir, { maxDepth: 1 })
      )

      // Should include root.txt and level1/file1.txt, but not deeper
      expect(result).toHaveLength(2)
      const paths = result.map(f => f.relativePath).sort()
      expect(paths).toEqual([join("level1", "file1.txt"), "root.txt"].sort())
    })

    it("should return empty array for empty directory", async () => {
      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      expect(result).toEqual([])
    })

    it("should handle directory with only ignored files", async () => {
      writeFileSync(join(testDir, "test.log"), "logs")
      writeFileSync(join(testDir, ".env"), "secrets")
      writeFileSync(join(testDir, ".DS_Store"), "metadata")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // All files should be ignored by default patterns
      expect(result).toEqual([])
    })

    it("should correctly calculate file sizes", async () => {
      const content1 = "a".repeat(100)
      const content2 = "b".repeat(500)

      writeFileSync(join(testDir, "small.txt"), content1)
      writeFileSync(join(testDir, "large.txt"), content2)

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      expect(result).toHaveLength(2)
      const small = result.find(f => f.relativePath === "small.txt")
      const large = result.find(f => f.relativePath === "large.txt")

      expect(small?.size).toBe(100)
      expect(large?.size).toBe(500)
    })

    it("should handle mixed file types", async () => {
      writeFileSync(join(testDir, "text.txt"), "text")
      writeFileSync(join(testDir, "markdown.md"), "markdown")
      writeFileSync(join(testDir, "code.js"), "code")
      writeFileSync(join(testDir, "data.json"), "data")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      expect(result).toHaveLength(4)
      const extensions = result.map(f => {
        const parts = f.relativePath.split(".")
        return parts[parts.length - 1]
      }).sort()
      expect(extensions).toEqual(["js", "json", "md", "txt"])
    })

    it("should fail gracefully for non-existent directory", async () => {
      const nonExistent = join(testDir, "non-existent")

      await expect(
        Effect.runPromise(collectFilesFromDirectory(nonExistent))
      ).rejects.toThrow()
    })

    it("should handle complex nested structure with multiple ignore patterns", async () => {
      // Create complex structure
      mkdirSync(join(testDir, "src"))
      mkdirSync(join(testDir, "src", "components"))
      mkdirSync(join(testDir, "src", "utils"))
      mkdirSync(join(testDir, "tests"))
      mkdirSync(join(testDir, "node_modules"))
      mkdirSync(join(testDir, "dist"))

      writeFileSync(join(testDir, "src", "index.ts"), "code")
      writeFileSync(join(testDir, "src", "components", "Button.tsx"), "code")
      writeFileSync(join(testDir, "src", "utils", "helpers.ts"), "code")
      writeFileSync(join(testDir, "tests", "test.spec.ts"), "test")
      writeFileSync(join(testDir, "node_modules", "lib.js"), "lib")
      writeFileSync(join(testDir, "dist", "bundle.js"), "bundle")
      writeFileSync(join(testDir, ".env"), "secrets")

      const result = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // Should include src and tests, but not node_modules, dist, .env
      expect(result.length).toBeGreaterThan(0)
      expect(result.some(f => f.relativePath.includes("node_modules"))).toBe(false)
      expect(result.some(f => f.relativePath.includes("dist"))).toBe(false)
      expect(result.some(f => f.relativePath === ".env")).toBe(false)
      expect(result.some(f => f.relativePath.includes("src"))).toBe(true)
      expect(result.some(f => f.relativePath.includes("tests"))).toBe(true)
    })
  })

  describe("filterByExtension", () => {
    const createTestFiles = (): CollectedFile[] => [
      { absolutePath: "/test/file1.txt", relativePath: "file1.txt", size: 100 },
      { absolutePath: "/test/file2.md", relativePath: "file2.md", size: 200 },
      { absolutePath: "/test/file3.js", relativePath: "file3.js", size: 300 },
      { absolutePath: "/test/file4.TXT", relativePath: "file4.TXT", size: 400 },
    ]

    it("should filter files by single extension", () => {
      const files = createTestFiles()
      const result = filterByExtension(files, [".txt"])

      expect(result).toHaveLength(2) // file1.txt and file4.TXT (case-insensitive)
      expect(result.every(f => f.relativePath.toLowerCase().endsWith(".txt"))).toBe(true)
    })

    it("should filter files by multiple extensions", () => {
      const files = createTestFiles()
      const result = filterByExtension(files, [".txt", ".md"])

      expect(result).toHaveLength(3) // file1.txt, file2.md, file4.TXT
    })

    it("should handle extensions without leading dot", () => {
      const files = createTestFiles()
      const result = filterByExtension(files, ["txt", "md"])

      expect(result).toHaveLength(3)
    })

    it("should be case-insensitive", () => {
      const files = createTestFiles()
      const result = filterByExtension(files, [".TXT"])

      expect(result).toHaveLength(2) // Both file1.txt and file4.TXT
    })

    it("should return empty array when no extensions match", () => {
      const files = createTestFiles()
      const result = filterByExtension(files, [".pdf"])

      expect(result).toEqual([])
    })

    it("should return empty array for empty input", () => {
      const result = filterByExtension([], [".txt"])

      expect(result).toEqual([])
    })
  })

  describe("filterBySize", () => {
    const createTestFiles = (): CollectedFile[] => [
      { absolutePath: "/test/small.txt", relativePath: "small.txt", size: 100 },
      { absolutePath: "/test/medium.txt", relativePath: "medium.txt", size: 500 },
      { absolutePath: "/test/large.txt", relativePath: "large.txt", size: 1000 },
    ]

    it("should filter files by maximum size", () => {
      const files = createTestFiles()
      const result = filterBySize(files, 500)

      expect(result).toHaveLength(2) // small.txt and medium.txt
      expect(result.every(f => f.size <= 500)).toBe(true)
    })

    it("should include files exactly at the size limit", () => {
      const files = createTestFiles()
      const result = filterBySize(files, 500)

      expect(result.some(f => f.size === 500)).toBe(true)
    })

    it("should return empty array when max size is too small", () => {
      const files = createTestFiles()
      const result = filterBySize(files, 50)

      expect(result).toEqual([])
    })

    it("should return all files when max size is very large", () => {
      const files = createTestFiles()
      const result = filterBySize(files, 10000)

      expect(result).toHaveLength(3)
    })

    it("should return empty array for empty input", () => {
      const result = filterBySize([], 1000)

      expect(result).toEqual([])
    })
  })

  describe("Integration scenarios", () => {
    it("should combine collection and filtering", async () => {
      // Create mixed files
      writeFileSync(join(testDir, "doc1.txt"), "a".repeat(100))
      writeFileSync(join(testDir, "doc2.md"), "b".repeat(200))
      writeFileSync(join(testDir, "large.txt"), "c".repeat(1000))
      writeFileSync(join(testDir, "code.js"), "d".repeat(50))

      // Collect all files
      const allFiles = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // Filter by extension
      const txtFiles = filterByExtension(allFiles, [".txt"])
      expect(txtFiles).toHaveLength(2)

      // Filter by size
      const smallFiles = filterBySize(allFiles, 300)
      expect(smallFiles).toHaveLength(3) // doc1.txt, doc2.md, code.js

      // Combine filters: small text files only
      const smallTxtFiles = filterBySize(filterByExtension(allFiles, [".txt"]), 300)
      expect(smallTxtFiles).toHaveLength(1) // only doc1.txt
      expect(smallTxtFiles[0]?.relativePath).toBe("doc1.txt")
    })

    it("should handle real-world project structure", async () => {
      // Create a realistic project structure
      mkdirSync(join(testDir, "src"))
      mkdirSync(join(testDir, "src", "lib"))
      mkdirSync(join(testDir, "tests"))
      mkdirSync(join(testDir, "docs"))
      mkdirSync(join(testDir, "node_modules")) // Should be ignored

      writeFileSync(join(testDir, "README.md"), "readme")
      writeFileSync(join(testDir, "package.json"), "package")
      writeFileSync(join(testDir, "src", "index.ts"), "code")
      writeFileSync(join(testDir, "src", "lib", "utils.ts"), "utils")
      writeFileSync(join(testDir, "tests", "index.test.ts"), "test")
      writeFileSync(join(testDir, "docs", "guide.md"), "docs")
      writeFileSync(join(testDir, "node_modules", "dep.js"), "dep")
      writeFileSync(join(testDir, ".env"), "secret")

      const allFiles = await Effect.runPromise(collectFilesFromDirectory(testDir))

      // Should exclude node_modules and .env
      expect(allFiles.some(f => f.relativePath.includes("node_modules"))).toBe(false)
      expect(allFiles.some(f => f.relativePath === ".env")).toBe(false)

      // Should include source files
      expect(allFiles.some(f => f.relativePath === "README.md")).toBe(true)
      expect(allFiles.some(f => f.relativePath.includes("src"))).toBe(true)
      expect(allFiles.some(f => f.relativePath.includes("tests"))).toBe(true)

      // Filter TypeScript files only
      const tsFiles = filterByExtension(allFiles, [".ts"])
      expect(tsFiles.length).toBeGreaterThan(0)
      expect(tsFiles.every(f => f.relativePath.endsWith(".ts"))).toBe(true)
    })
  })
})
