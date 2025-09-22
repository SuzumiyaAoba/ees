/**
 * E2E Tests for Embedding Search Operations
 */

import { describe, it, expect } from "vitest"
import {
  getTestApp,
  setupE2ETests,
  validateTestEnvironment,
  createTestEmbedding
} from "../e2e-setup"
import {
  validateHttpResponse,
  validateSearchResultStructure,
  measureResponseTime,
  createTestUri
} from "../helpers/test-helpers"
import { searchQueries, invalidData, performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Embedding Search E2E Tests", () => {
  describe("POST /embeddings/search (Search Embeddings)", () => {
    it("should search embeddings with basic query", async () => {
      validateTestEnvironment()

      // Create some test embeddings first
      await createTestEmbedding("search-doc-1", "This is a document about machine learning and artificial intelligence.")
      await createTestEmbedding("search-doc-2", "This document discusses natural language processing techniques.")
      await createTestEmbedding("search-doc-3", "A simple document about cooking and recipes.")

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchQueries.simple),
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.search)

      const result = await response.json()
      expect(result).toHaveProperty("count")
      expect(result).toHaveProperty("results")
      expect(typeof result.count).toBe("number")
      expect(Array.isArray(result.results)).toBe(true)

      // Validate each search result
      result.results.forEach(validateSearchResultStructure)

      // Results should be ordered by similarity (descending)
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].similarity).toBeGreaterThanOrEqual(result.results[i].similarity)
      }
    })

    it("should search with technical query", async () => {
      // Create embeddings with technical content
      await createTestEmbedding("tech-doc-1", "Deep learning neural networks for computer vision applications.")
      await createTestEmbedding("tech-doc-2", "Machine learning algorithms for natural language processing tasks.")
      await createTestEmbedding("tech-doc-3", "Statistical analysis and data mining techniques.")

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQueries.technical),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.count).toBeGreaterThan(0)

      result.results.forEach(validateSearchResultStructure)

      // Check that results are relevant to the technical query
      result.results.forEach((item: any) => {
        expect(item.similarity).toBeGreaterThan(0.1) // Should have some relevance
      })
    })

    it("should handle Japanese text search", async () => {
      // Create embeddings with Japanese content
      await createTestEmbedding("jp-doc-1", "機械学習は人工知能の重要な分野です。")
      await createTestEmbedding("jp-doc-2", "自然言語処理は言語学と計算科学の学際分野です。")
      await createTestEmbedding("jp-doc-3", "これは日本語のテスト文書です。")

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQueries.japanese),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      result.results.forEach(validateSearchResultStructure)

      // Should find Japanese content
      expect(result.results.length).toBeGreaterThan(0)
    })

    it("should respect limit parameter", async () => {
      // Create multiple embeddings
      for (let i = 0; i < 10; i++) {
        await createTestEmbedding(`limit-test-${i}`, `Document ${i} for limit testing with similar content.`)
      }

      const searchQuery = {
        query: "limit testing document",
        limit: 3,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.results.length).toBeLessThanOrEqual(3)
    })

    it("should respect threshold parameter", async () => {
      await createTestEmbedding("threshold-test", "This document is for threshold testing.")

      const searchQuery = {
        query: "completely unrelated query about astronomy and space",
        threshold: 0.9, // Very high threshold
        limit: 10,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      // With high threshold and unrelated query, should return few or no results
      result.results.forEach((item: any) => {
        expect(item.similarity).toBeGreaterThanOrEqual(0.9)
      })
    })

    it("should handle different distance metrics", async () => {
      await createTestEmbedding("metric-test", "Document for testing different distance metrics.")

      const metrics = ["cosine", "euclidean", "dot_product"] as const

      for (const metric of metrics) {
        const searchQuery = {
          query: "metric testing",
          limit: 5,
          threshold: 0.0,
          metric
        }

        const response = await app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchQuery),
        })

        validateHttpResponse(response, 200)

        const result = await response.json()
        result.results.forEach(validateSearchResultStructure)
      }
    })

    it("should filter by model name", async () => {
      const modelName = "nomic-embed-text"
      await createTestEmbedding("model-filter-search", "Document for model filtering in search.", modelName)

      const searchQuery = {
        query: "model filtering",
        model_name: modelName,
        limit: 10,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      result.results.forEach((item: any) => {
        expect(item.model_name).toBe(modelName)
      })
    })

    it("should return empty results for no matches", async () => {
      const searchQuery = {
        query: "completely unique query that should not match anything xyzabc123",
        threshold: 0.9,
        limit: 10,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.count).toBe(0)
      expect(result.results).toEqual([])
    })

    it("should reject request with missing query", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.search.missingQuery),
      })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
    })

    it("should reject request with empty query", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.search.emptyQuery),
      })

      expect(response.status).toBe(400)
    })

    it("should reject request with invalid limit", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.search.invalidLimit),
      })

      expect(response.status).toBe(400)
    })

    it("should reject request with invalid threshold", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.search.invalidThreshold),
      })

      expect(response.status).toBe(400)
    })

    it("should reject request with invalid metric", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.search.invalidMetric),
      })

      expect(response.status).toBe(400)
    })

    it("should handle malformed JSON", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })

      expect(response.status).toBe(400)
    })
  })

  describe("Search Performance Tests", () => {
    it("should perform search within time limits", async () => {
      // Create embeddings for performance testing
      for (let i = 0; i < 20; i++) {
        await createTestEmbedding(`perf-search-${i}`, `Performance test document ${i} with varied content about technology and science.`)
      }

      const searchQuery = {
        query: "performance technology science",
        limit: 10,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchQuery),
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.search)

      const result = await response.json()
      result.results.forEach(validateSearchResultStructure)
    })
  })

  describe("Search Edge Cases", () => {
    it("should handle very long query text", async () => {
      const longQuery = "very long query text ".repeat(100)

      const searchQuery = {
        query: longQuery,
        limit: 5,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      // Should either succeed or gracefully handle the long query
      expect([200, 400, 500]).toContain(response.status)
    })

    it("should handle special characters in query", async () => {
      await createTestEmbedding("special-chars", "Document with special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?")

      const searchQuery = {
        query: "special characters !@#$%",
        limit: 5,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      result.results.forEach(validateSearchResultStructure)
    })

    it("should handle zero limit", async () => {
      const searchQuery = {
        query: "test query",
        limit: 0,
        threshold: 0.0,
        metric: "cosine" as const
      }

      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchQuery),
      })

      // Should either return empty results or reject the request
      expect([200, 400]).toContain(response.status)

      if (response.status === 200) {
        const result = await response.json()
        expect(result.results.length).toBe(0)
      }
    })
  })
})