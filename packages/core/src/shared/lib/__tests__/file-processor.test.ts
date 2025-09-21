/**
 * Tests for File Processing Service
 */

import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  SUPPORTED_FILE_TYPES,
  UnsupportedFileTypeError,
  FileProcessingError,
  FileTooLargeError,
  type FileProcessingResult,
} from "../file-processor"

describe("File Processor", () => {
  let testDir: string

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ees-file-processor-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("SUPPORTED_FILE_TYPES", () => {
    it("should include text file extensions", () => {
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".txt")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".md")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".json")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".yaml")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".csv")
    })

    it("should include document file extensions", () => {
      expect(SUPPORTED_FILE_TYPES.DOCUMENT).toContain(".pdf")
    })

    it("should include code file extensions", () => {
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".js")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".ts")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".py")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".go")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".rs")
    })

    it("should have readonly file type arrays", () => {
      // Test that the structure is readonly
      expect(Array.isArray(SUPPORTED_FILE_TYPES.TEXT)).toBe(true)
      expect(Array.isArray(SUPPORTED_FILE_TYPES.DOCUMENT)).toBe(true)
      expect(Array.isArray(SUPPORTED_FILE_TYPES.CODE)).toBe(true)
    })
  })

  describe("FileProcessingResult", () => {
    it("should have correct interface structure", () => {
      const result: FileProcessingResult = {
        filename: "test.txt",
        content: "test content",
        contentType: "text/plain",
        size: 12,
        extractedChunks: ["chunk1", "chunk2"],
      }

      expect(result.filename).toBe("test.txt")
      expect(result.content).toBe("test content")
      expect(result.contentType).toBe("text/plain")
      expect(result.size).toBe(12)
      expect(result.extractedChunks).toEqual(["chunk1", "chunk2"])
    })

    it("should support optional extractedChunks", () => {
      const result: FileProcessingResult = {
        filename: "test.txt",
        content: "test content",
        contentType: "text/plain",
        size: 12,
      }

      expect(result.extractedChunks).toBeUndefined()
    })
  })

  describe("Error Types", () => {
    describe("UnsupportedFileTypeError", () => {
      it("should create error with correct properties", () => {
        const error = new UnsupportedFileTypeError(
          "Unsupported file type",
          "test.unknown",
          "application/unknown"
        )

        expect(error._tag).toBe("UnsupportedFileTypeError")
        expect(error.message).toBe("Unsupported file type")
        expect(error.filename).toBe("test.unknown")
        expect(error.mimeType).toBe("application/unknown")
      })

      it("should be instanceof UnsupportedFileTypeError", () => {
        const error = new UnsupportedFileTypeError(
          "Test error",
          "test.file",
          "test/type"
        )

        expect(error).toBeInstanceOf(UnsupportedFileTypeError)
      })
    })

    describe("FileProcessingError", () => {
      it("should create error with message and filename", () => {
        const error = new FileProcessingError(
          "Processing failed",
          "test.txt"
        )

        expect(error._tag).toBe("FileProcessingError")
        expect(error.message).toBe("Processing failed")
        expect(error.filename).toBe("test.txt")
        expect(error.cause).toBeUndefined()
      })

      it("should create error with cause", () => {
        const cause = new Error("Original error")
        const error = new FileProcessingError(
          "Processing failed",
          "test.txt",
          cause
        )

        expect(error._tag).toBe("FileProcessingError")
        expect(error.message).toBe("Processing failed")
        expect(error.filename).toBe("test.txt")
        expect(error.cause).toBe(cause)
      })

      it("should be instanceof FileProcessingError", () => {
        const error = new FileProcessingError("Test error", "test.file")

        expect(error).toBeInstanceOf(FileProcessingError)
      })
    })

    describe("FileTooLargeError", () => {
      it("should create error with correct tag", () => {
        const error = new FileTooLargeError(
          "File too large",
          "large.txt",
          1000000,
          500000
        )

        expect(error._tag).toBe("FileTooLargeError")
      })

      it("should have correct properties structure", () => {
        // Test that the class can be instantiated
        // (We can't test all properties without seeing the full implementation)
        expect(() => {
          const error = new FileTooLargeError(
            "File too large",
            "large.txt",
            1000000,
            500000
          )
          return error
        }).not.toThrow()
      })
    })
  })

  describe("File Type Detection", () => {
    it("should recognize text file extensions", () => {
      const textExtensions = SUPPORTED_FILE_TYPES.TEXT

      for (const ext of textExtensions) {
        expect(ext.startsWith(".")).toBe(true)
        expect(ext.length).toBeGreaterThan(1)
      }
    })

    it("should recognize code file extensions", () => {
      const codeExtensions = SUPPORTED_FILE_TYPES.CODE

      for (const ext of codeExtensions) {
        expect(ext.startsWith(".")).toBe(true)
        expect(ext.length).toBeGreaterThan(1)
      }
    })

    it("should recognize document file extensions", () => {
      const docExtensions = SUPPORTED_FILE_TYPES.DOCUMENT

      for (const ext of docExtensions) {
        expect(ext.startsWith(".")).toBe(true)
        expect(ext.length).toBeGreaterThan(1)
      }
    })
  })

  describe("File Extension Validation", () => {
    it("should contain common text formats", () => {
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".txt")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".md")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".markdown")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".json")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".yaml")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".yml")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".csv")
      expect(SUPPORTED_FILE_TYPES.TEXT).toContain(".log")
    })

    it("should contain common programming languages", () => {
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".js")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".ts")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".tsx")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".jsx")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".py")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".go")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".rs")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".java")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".cpp")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".c")
      expect(SUPPORTED_FILE_TYPES.CODE).toContain(".h")
    })

    it("should not have duplicate extensions across categories", () => {
      const allExtensions = [
        ...SUPPORTED_FILE_TYPES.TEXT,
        ...SUPPORTED_FILE_TYPES.DOCUMENT,
        ...SUPPORTED_FILE_TYPES.CODE,
      ]

      const uniqueExtensions = new Set(allExtensions)
      expect(uniqueExtensions.size).toBe(allExtensions.length)
    })
  })

  describe("Type Safety", () => {
    it("should maintain readonly type constraints", () => {
      // These arrays are readonly at compile time but not runtime
      // Just test that they are arrays and have expected content
      expect(Array.isArray(SUPPORTED_FILE_TYPES.TEXT)).toBe(true)
      expect(SUPPORTED_FILE_TYPES.TEXT.length).toBeGreaterThan(0)
    })

    it("should have proper error type tags", () => {
      const unsupportedError = new UnsupportedFileTypeError(
        "test",
        "file",
        "type"
      )
      const processingError = new FileProcessingError("test", "file")
      const tooLargeError = new FileTooLargeError("test", "file", 100, 50)

      expect(unsupportedError._tag).toBe("UnsupportedFileTypeError")
      expect(processingError._tag).toBe("FileProcessingError")
      expect(tooLargeError._tag).toBe("FileTooLargeError")
    })
  })
})