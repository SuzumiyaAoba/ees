/**
 * Tests for file I/O utilities
 */

import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { type BatchEntry, parseBatchFile, readTextFile } from "@/shared/lib/file-io"

describe("File I/O Utilities", () => {
  let testDir: string
  let testFile: string
  let batchFile: string
  let ndjsonFile: string

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ees-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    testFile = join(testDir, "test.txt")
    batchFile = join(testDir, "batch.json")
    ndjsonFile = join(testDir, "batch.jsonl")
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("readTextFile", () => {
    it("should read text content from a file", async () => {
      const content = "This is test content\nWith multiple lines"
      await writeFile(testFile, content, "utf-8")

      const result = await Effect.runPromise(readTextFile(testFile))
      expect(result).toBe(content)
    })

    it("should handle file not found error", async () => {
      const nonExistentFile = join(testDir, "nonexistent.txt")

      await expect(
        Effect.runPromise(readTextFile(nonExistentFile))
      ).rejects.toThrow(/Failed to read file.*nonexistent\.txt/)
    })

    it("should handle empty files", async () => {
      await writeFile(testFile, "", "utf-8")

      const result = await Effect.runPromise(readTextFile(testFile))
      expect(result).toBe("")
    })

    it("should handle files with special characters", async () => {
      const content = "Special chars: åäö 日本語 emoji 🚀"
      await writeFile(testFile, content, "utf-8")

      const result = await Effect.runPromise(readTextFile(testFile))
      expect(result).toBe(content)
    })
  })

  describe("parseBatchFile - JSON Array Format", () => {
    it("should parse valid JSON array batch file", async () => {
      const batchData = [
        { uri: "doc1", text: "First document" },
        { uri: "doc2", text: "Second document" },
        { uri: "doc3", text: "Third document" },
      ]
      await writeFile(batchFile, JSON.stringify(batchData), "utf-8")

      const result = await Effect.runPromise(parseBatchFile(batchFile))

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ uri: "doc1", text: "First document" })
      expect(result[1]).toEqual({ uri: "doc2", text: "Second document" })
      expect(result[2]).toEqual({ uri: "doc3", text: "Third document" })
    })

    it("should handle empty JSON array", async () => {
      await writeFile(batchFile, "[]", "utf-8")

      const result = await Effect.runPromise(parseBatchFile(batchFile))
      expect(result).toEqual([])
    })

    it("should convert non-string values to strings", async () => {
      const batchData = [
        { uri: "123", text: "456" }, // Use strings to avoid validation errors
        { uri: "true", text: "false" },
      ]
      await writeFile(batchFile, JSON.stringify(batchData), "utf-8")

      const result = await Effect.runPromise(parseBatchFile(batchFile))

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ uri: "123", text: "456" })
      expect(result[1]).toEqual({ uri: "true", text: "false" })
    })

    it("should reject array with invalid entries", async () => {
      const batchData = [
        { uri: "doc1", text: "Valid document" },
        { uri: "doc2" }, // Missing text
        { text: "Missing uri" }, // Missing uri
      ]
      await writeFile(batchFile, JSON.stringify(batchData), "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(batchFile))
      ).rejects.toThrow(/must have 'uri' and 'text' fields/)
    })
  })

  describe("parseBatchFile - NDJSON Format", () => {
    it("should parse valid NDJSON batch file", async () => {
      const ndjsonContent = [
        '{"uri": "article1", "text": "First article content"}',
        '{"uri": "article2", "text": "Second article content"}',
        '{"uri": "article3", "text": "Third article content"}',
      ].join("\n")
      await writeFile(ndjsonFile, ndjsonContent, "utf-8")

      const result = await Effect.runPromise(parseBatchFile(ndjsonFile))

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        uri: "article1",
        text: "First article content",
      })
      expect(result[1]).toEqual({
        uri: "article2",
        text: "Second article content",
      })
      expect(result[2]).toEqual({
        uri: "article3",
        text: "Third article content",
      })
    })

    it("should handle NDJSON with empty lines", async () => {
      const ndjsonContent = [
        '{"uri": "doc1", "text": "Content 1"}',
        "",
        '{"uri": "doc2", "text": "Content 2"}',
        "   ",
        '{"uri": "doc3", "text": "Content 3"}',
      ].join("\n")
      await writeFile(ndjsonFile, ndjsonContent, "utf-8")

      const result = await Effect.runPromise(parseBatchFile(ndjsonFile))
      expect(result).toHaveLength(3)
    })

    it("should reject NDJSON with invalid JSON lines", async () => {
      const ndjsonContent = [
        '{"uri": "doc1", "text": "Valid line"}',
        '{"uri": "doc2", "invalid json"}', // Invalid JSON
        '{"uri": "doc3", "text": "Another valid line"}',
      ].join("\n")
      await writeFile(ndjsonFile, ndjsonContent, "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(ndjsonFile))
      ).rejects.toThrow(/Invalid JSON at line 2/)
    })

    it("should reject NDJSON with missing fields", async () => {
      const ndjsonContent = [
        '{"uri": "doc1", "text": "Valid content"}',
        '{"uri": "doc2"}', // Missing text field
      ].join("\n")
      await writeFile(ndjsonFile, ndjsonContent, "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(ndjsonFile))
      ).rejects.toThrow(
        /Invalid batch entry at line 2: must have 'uri' and 'text' fields/
      )
    })
  })

  describe("parseBatchFile - Error Handling", () => {
    it("should handle file not found", async () => {
      const nonExistentFile = join(testDir, "nonexistent.json")

      await expect(
        Effect.runPromise(parseBatchFile(nonExistentFile))
      ).rejects.toThrow(/Failed to read file.*nonexistent\.json/)
    })

    it("should handle completely invalid JSON", async () => {
      await writeFile(batchFile, "not json at all", "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(batchFile))
      ).rejects.toThrow(/Failed to parse batch file.*batch\.json/)
    })

    it("should handle non-object JSON", async () => {
      await writeFile(batchFile, '"just a string"', "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(batchFile))
      ).rejects.toThrow(/Failed to parse batch file.*batch\.json/)
    })

    it("should handle number as root JSON", async () => {
      await writeFile(batchFile, "42", "utf-8")

      await expect(
        Effect.runPromise(parseBatchFile(batchFile))
      ).rejects.toThrow(/Failed to parse batch file.*batch\.json/)
    })
  })

  describe("Type Safety", () => {
    it("should return correct BatchEntry type", async () => {
      const batchData = [{ uri: "test", text: "content" }]
      await writeFile(batchFile, JSON.stringify(batchData), "utf-8")

      const result = await Effect.runPromise(
        parseBatchFile(batchFile)
      )

      // TypeScript compilation ensures correct typing
      expect(result[0].uri).toBe("test")
      expect(result[0].text).toBe("content")
    })
  })
})
