import { describe, it, expect } from "vitest"
import { shouldIgnore, parseIgnorePatterns, getDefaultIgnorePatterns } from "../eesignore"

describe("eesignore", () => {
  describe("parseIgnorePatterns", () => {
    it("should parse valid patterns", () => {
      const content = `
# Comment
*.log
node_modules
.git

dist/
      `.trim()

      const patterns = parseIgnorePatterns(content)
      expect(patterns).toEqual(["*.log", "node_modules", ".git", "dist/"])
    })

    it("should ignore comments and empty lines", () => {
      const content = `
# This is a comment

*.log
# Another comment

node_modules
      `.trim()

      const patterns = parseIgnorePatterns(content)
      expect(patterns).toEqual(["*.log", "node_modules"])
    })
  })

  describe("getDefaultIgnorePatterns", () => {
    it("should return default patterns", () => {
      const patterns = getDefaultIgnorePatterns()
      expect(patterns).toContain("node_modules")
      expect(patterns).toContain(".git")
      expect(patterns).toContain("*.log")
    })

    it("should include system and version control files", () => {
      const patterns = getDefaultIgnorePatterns()
      expect(patterns).toContain(".gitignore")
      expect(patterns).toContain(".DS_Store")
      expect(patterns).toContain(".eesignore")
    })
  })

  describe("shouldIgnore", () => {
    describe("basic patterns", () => {
      it("should match exact filenames", () => {
        const patterns = ["test.txt"]
        expect(shouldIgnore("test.txt", patterns)).toBe(true)
        expect(shouldIgnore("other.txt", patterns)).toBe(false)
      })

      it("should match glob patterns with *", () => {
        const patterns = ["*.log"]
        expect(shouldIgnore("error.log", patterns)).toBe(true)
        expect(shouldIgnore("debug.log", patterns)).toBe(true)
        expect(shouldIgnore("test.txt", patterns)).toBe(false)
      })

      it("should match patterns in subdirectories", () => {
        const patterns = ["*.log"]
        expect(shouldIgnore("src/error.log", patterns)).toBe(true)
        expect(shouldIgnore("src/lib/debug.log", patterns)).toBe(true)
      })
    })

    describe("directory patterns", () => {
      it("should match directory names", () => {
        const patterns = ["node_modules"]
        expect(shouldIgnore("node_modules", patterns)).toBe(true)
        expect(shouldIgnore("src/node_modules", patterns)).toBe(true)
        expect(shouldIgnore("node_modules/package", patterns)).toBe(true)
      })

      it("should match patterns with path separators", () => {
        const patterns = ["src/generated"]
        expect(shouldIgnore("src/generated", patterns)).toBe(true)
        expect(shouldIgnore("src/generated/file.ts", patterns)).toBe(true)
        expect(shouldIgnore("lib/generated", patterns)).toBe(false)
      })
    })

    describe("negation patterns", () => {
      it("should handle negation patterns with !", () => {
        const patterns = ["*.log", "!important.log"]
        expect(shouldIgnore("error.log", patterns)).toBe(true)
        expect(shouldIgnore("important.log", patterns)).toBe(false)
      })
    })

    describe("real-world scenarios", () => {
      it("should ignore common build artifacts", () => {
        const patterns = ["node_modules", "dist", "build", "*.log"]

        expect(shouldIgnore("node_modules/package", patterns)).toBe(true)
        expect(shouldIgnore("dist/bundle.js", patterns)).toBe(true)
        expect(shouldIgnore("build/output.css", patterns)).toBe(true)
        expect(shouldIgnore("error.log", patterns)).toBe(true)
        expect(shouldIgnore("src/main.ts", patterns)).toBe(false)
      })

      it("should ignore dotfiles", () => {
        const patterns = [".env", ".DS_Store", ".git"]

        expect(shouldIgnore(".env", patterns)).toBe(true)
        expect(shouldIgnore(".DS_Store", patterns)).toBe(true)
        expect(shouldIgnore(".git", patterns)).toBe(true)
        expect(shouldIgnore("src/.env", patterns)).toBe(true)
      })
    })
  })
})
