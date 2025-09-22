/**
 * E2E Tests for Batch Embedding Operations
 */

import { describe, it, expect } from "vitest"
import {
  getTestApp,
  setupE2ETests,
  validateTestEnvironment,
  registerEmbeddingForCleanup
} from "../e2e-setup"
import {
  validateHttpResponse,
  validateBatchCreateResponse,
  measureResponseTime,
  createTestUri
} from "../helpers/test-helpers"
import { batchEmbeddingData, invalidData, performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Batch Embedding E2E Tests", () => {
  describe("POST /embeddings/batch (Batch Create)", () => {
    it("should create multiple embeddings in batch", async () => {
      validateTestEnvironment()

      const batchData = {
        texts: [
          { uri: createTestUri("batch-1"), text: "First document in batch test" },
          { uri: createTestUri("batch-2"), text: "Second document in batch test" },
          { uri: createTestUri("batch-3"), text: "Third document in batch test" }
        ],
        model_name: "nomic-embed-text"
      }

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/embeddings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchData),
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.batchCreate)

      const result = await response.json()
      validateBatchCreateResponse(result)

      expect(result.total).toBe(3)
      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.results.length).toBe(3)

      // Register all created embeddings for cleanup
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })

      // Verify each result
      result.results.forEach((item: any, index: number) => {
        expect(item.success).toBe(true)
        expect(item.data.uri).toBe(batchData.texts[index].uri)
        expect(item.data.text).toBe(batchData.texts[index].text)
        expect(item.data.model_name).toBe(batchData.model_name)
      })
    })

    it("should handle mixed success/failure in batch", async () => {
      const batchData = {
        texts: [
          { uri: createTestUri("valid-1"), text: "Valid document 1" },
          { uri: "", text: "Invalid document with empty URI" }, // This should fail
          { uri: createTestUri("valid-2"), text: "Valid document 2" }
        ],
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      validateBatchCreateResponse(result)

      expect(result.total).toBe(3)
      expect(result.successful + result.failed).toBe(3)

      // Register successful embeddings for cleanup
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })

      // Check that we have both successes and failures
      const successes = result.results.filter((item: any) => item.success)
      const failures = result.results.filter((item: any) => !item.success)

      expect(successes.length).toBeGreaterThan(0)
      expect(failures.length).toBeGreaterThan(0)
    })

    it("should handle large batch processing", async () => {
      const batchSize = 10
      const batchData = {
        texts: Array.from({ length: batchSize }, (_, i) => ({
          uri: createTestUri(`large-batch-${i}`),
          text: `Document ${i} for large batch processing test. This is a longer text to simulate real-world usage.`
        })),
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      validateBatchCreateResponse(result)

      expect(result.total).toBe(batchSize)
      expect(result.results.length).toBe(batchSize)

      // Register all for cleanup
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })
    })

    it("should handle empty batch", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.batchCreate.emptyTexts),
      })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
    })

    it("should reject invalid batch format", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.batchCreate.invalidTextFormat),
      })

      expect(response.status).toBe(400)
    })

    it("should reject missing texts field", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.batchCreate.missingTexts),
      })

      expect(response.status).toBe(400)
    })

    it("should handle batch with different text lengths", async () => {
      const batchData = {
        texts: [
          { uri: createTestUri("short"), text: "Short text." },
          { uri: createTestUri("medium"), text: "Medium length text with more content than the short one but not too long.".repeat(3) },
          { uri: createTestUri("long"), text: "Very long text content that simulates real-world documents with substantial content. ".repeat(20) }
        ],
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      validateBatchCreateResponse(result)

      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)

      // Register for cleanup
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })
    })

    it("should handle batch with multilingual content", async () => {
      const batchData = {
        texts: [
          { uri: createTestUri("english"), text: "This is an English document for testing multilingual batch processing." },
          { uri: createTestUri("japanese"), text: "これは多言語バッチ処理をテストするための日本語の文書です。" },
          { uri: createTestUri("mixed"), text: "This document contains both English and 日本語 text for testing mixed language processing." }
        ],
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      validateBatchCreateResponse(result)

      expect(result.successful).toBe(3)

      // Register for cleanup
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })
    })

    it("should preserve order in batch results", async () => {
      const batchData = {
        texts: [
          { uri: createTestUri("order-1"), text: "First ordered document" },
          { uri: createTestUri("order-2"), text: "Second ordered document" },
          { uri: createTestUri("order-3"), text: "Third ordered document" }
        ],
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      validateBatchCreateResponse(result)

      // Verify order is preserved
      result.results.forEach((item: any, index: number) => {
        expect(item.data.uri).toBe(batchData.texts[index].uri)
        expect(item.data.text).toBe(batchData.texts[index].text)
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })
    })
  })

  describe("Batch Performance Tests", () => {
    it("should process small batches within time limits", async () => {
      const batchData = {
        texts: Array.from({ length: 3 }, (_, i) => ({
          uri: createTestUri(`perf-small-${i}`),
          text: `Performance test document ${i}`
        })),
        model_name: "nomic-embed-text"
      }

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/embeddings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchData),
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.batchCreate)

      const result = await response.json()
      result.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })
    })
  })

  describe("Batch Error Handling", () => {
    it("should handle malformed JSON in batch request", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })

      expect(response.status).toBe(400)
    })

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        body: JSON.stringify(batchEmbeddingData),
      })

      expect(response.status).toBe(500)
    })
  })
})