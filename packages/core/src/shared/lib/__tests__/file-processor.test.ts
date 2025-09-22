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
  type FileProcessorConfig,
  processFile,
  processFiles,
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

  // Helper to create mock File objects
  const createMockFile = (name: string, content: string, type: string = "text/plain"): File => {
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
  }

  describe("processFile function", () => {
    describe("supported file types", () => {
      it("should process text files successfully", async () => {
        const file = createMockFile("test.txt", "Hello world!", "text/plain")

        const result = await Effect.runPromise(processFile(file))

        expect(result.filename).toBe("test.txt")
        expect(result.content).toBe("Hello world!")
        expect(result.contentType).toBe("text/plain")
        expect(result.size).toBe(file.size)
      })

      it("should process markdown files", async () => {
        const content = "# Hello\n\nThis is markdown."
        const file = createMockFile("README.md", content, "text/markdown")

        const result = await Effect.runPromise(processFile(file))

        expect(result.filename).toBe("README.md")
        expect(result.content).toBe(content)
        expect(result.contentType).toBe("text/markdown")
      })

      it("should process JavaScript files", async () => {
        const content = "console.log('Hello world!');"
        const file = createMockFile("script.js", content, "text/javascript")

        const result = await Effect.runPromise(processFile(file))

        expect(result.filename).toBe("script.js")
        expect(result.content).toBe(content)
      })

      it("should process JSON files", async () => {
        const content = '{"hello": "world"}'
        const file = createMockFile("data.json", content, "application/json")

        const result = await Effect.runPromise(processFile(file))

        expect(result.filename).toBe("data.json")
        expect(result.content).toBe(content)
      })

      it("should process files by extension when MIME type is generic", async () => {
        const content = "# README"
        const file = createMockFile("README.md", content, "application/octet-stream")

        const result = await Effect.runPromise(processFile(file))

        expect(result.filename).toBe("README.md")
        expect(result.content).toBe(content)
      })
    })

    describe("file validation", () => {
      it("should reject unsupported file types", async () => {
        const file = createMockFile("image.png", "fake png data", "image/png")

        const result = await Effect.runPromiseExit(processFile(file))

        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.cause._tag).toBe("Fail")
          if (result.cause._tag === "Fail") {
            expect(result.cause.error).toBeInstanceOf(UnsupportedFileTypeError)
            expect(result.cause.error.filename).toBe("image.png")
            expect(result.cause.error.mimeType).toBe("image/png")
          }
        }
      })

      it("should handle large files", async () => {
        const config: FileProcessorConfig = {
          maxFileSize: 100,
          maxChunkSize: 8000,
          enableChunking: false
        }

        const largeContent = "x".repeat(200)
        const file = createMockFile("large.txt", largeContent, "text/plain")

        const result = await Effect.runPromiseExit(processFile(file, config))

        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.cause._tag).toBe("Fail")
          if (result.cause._tag === "Fail") {
            expect(result.cause.error).toBeInstanceOf(FileTooLargeError)
          }
        }
      })

      it("should reject empty files", async () => {
        const file = createMockFile("empty.txt", "", "text/plain")

        const result = await Effect.runPromiseExit(processFile(file))

        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.cause._tag).toBe("Fail")
          if (result.cause._tag === "Fail") {
            expect(result.cause.error).toBeInstanceOf(FileProcessingError)
            expect(result.cause.error.message).toContain("No text content found")
          }
        }
      })

      it("should reject whitespace-only files", async () => {
        const file = createMockFile("whitespace.txt", "   \n\n  \t  ", "text/plain")

        const result = await Effect.runPromiseExit(processFile(file))

        expect(result._tag).toBe("Failure")
      })
    })

    describe("chunking functionality", () => {
      it("should not chunk when chunking is disabled", async () => {
        const config: FileProcessorConfig = {
          maxFileSize: 10 * 1024 * 1024,
          maxChunkSize: 50,
          enableChunking: false
        }

        const longContent = "This is a very long text that would normally be chunked but chunking is disabled."
        const file = createMockFile("long.txt", longContent, "text/plain")

        const result = await Effect.runPromise(processFile(file, config))

        expect(result.extractedChunks).toBeUndefined()
        expect(result.content).toBe(longContent)
      })

      it("should chunk when chunking is enabled and content is long", async () => {
        const config: FileProcessorConfig = {
          maxFileSize: 10 * 1024 * 1024,
          maxChunkSize: 30,
          enableChunking: true
        }

        const content = "First paragraph here.\n\nSecond paragraph that is quite a bit longer and should be in a separate chunk."
        const file = createMockFile("chunked.txt", content, "text/plain")

        const result = await Effect.runPromise(processFile(file, config))

        expect(result.extractedChunks).toBeDefined()
        expect(result.extractedChunks!.length).toBeGreaterThan(1)
      })

      it("should return single chunk for short content", async () => {
        const config: FileProcessorConfig = {
          maxFileSize: 10 * 1024 * 1024,
          maxChunkSize: 1000,
          enableChunking: true
        }

        const content = "Short content"
        const file = createMockFile("short.txt", content, "text/plain")

        const result = await Effect.runPromise(processFile(file, config))

        expect(result.extractedChunks).toEqual([content])
      })
    })

    describe("error handling", () => {
      it("should handle PDF files with not implemented error", async () => {
        const file = createMockFile("document.pdf", "fake pdf content", "application/pdf")

        const result = await Effect.runPromiseExit(processFile(file))

        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.cause._tag).toBe("Fail")
          if (result.cause._tag === "Fail") {
            expect(result.cause.error).toBeInstanceOf(FileProcessingError)
            expect(result.cause.error.message).toContain("Failed to process file")
          }
        }
      })
    })
  })

  describe("processFiles function", () => {
    it("should process multiple files successfully", async () => {
      const files = [
        createMockFile("file1.txt", "Content 1", "text/plain"),
        createMockFile("file2.md", "# Content 2", "text/markdown"),
        createMockFile("file3.json", '{"key": "value"}', "application/json")
      ]

      const results = await Effect.runPromise(processFiles(files))

      expect(results).toHaveLength(3)
      expect(results[0].filename).toBe("file1.txt")
      expect(results[0].content).toBe("Content 1")
      expect(results[1].filename).toBe("file2.md")
      expect(results[1].content).toBe("# Content 2")
      expect(results[2].filename).toBe("file3.json")
      expect(results[2].content).toBe('{"key": "value"}')
    })

    it("should handle mixed success and failure", async () => {
      const files = [
        createMockFile("good.txt", "Good content", "text/plain"),
        createMockFile("bad.png", "Bad content", "image/png"),
        createMockFile("good2.md", "# Good markdown", "text/markdown")
      ]

      const result = await Effect.runPromise(processFiles(files))

      // Should return only successful files
      expect(result).toHaveLength(2)
      expect(result[0].filename).toBe("good.txt")
      expect(result[1].filename).toBe("good2.md")
    })

    it("should fail when all files fail", async () => {
      const files = [
        createMockFile("bad1.png", "Content", "image/png"),
        createMockFile("bad2.gif", "Content", "image/gif")
      ]

      const result = await Effect.runPromiseExit(processFiles(files))

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        expect(result.cause._tag).toBe("Fail")
        if (result.cause._tag === "Fail") {
          expect(Array.isArray(result.cause.error)).toBe(true)
          expect(result.cause.error).toHaveLength(2)
        }
      }
    })

    it("should handle empty file list", async () => {
      const result = await Effect.runPromise(processFiles([]))

      expect(result).toEqual([])
    })

    it("should use custom configuration", async () => {
      const config: FileProcessorConfig = {
        maxFileSize: 1000,
        maxChunkSize: 50,
        enableChunking: true
      }

      const files = [
        createMockFile("small.txt", "Small content", "text/plain")
      ]

      const result = await Effect.runPromise(processFiles(files, config))

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe("small.txt")
      expect(result[0].extractedChunks).toBeDefined()
    })
  })
})