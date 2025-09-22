/**
 * E2E Tests for Embeddings CRUD Operations
 * Tests Create, Read, Update, Delete operations for embeddings
 */

import { describe, it, expect } from "vitest"
import {
  getTestApp,
  setupE2ETests,
  validateTestEnvironment,
  registerEmbeddingForCleanup,
  createTestEmbedding
} from "../e2e-setup"
import {
  validateHttpResponse,
  validateEmbeddingStructure,
  validatePaginationStructure,
  validateErrorResponse,
  measureResponseTime,
  createTestUri
} from "../helpers/test-helpers"
import { testEmbeddings, invalidData, performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Embeddings CRUD E2E Tests", () => {
  describe("POST /embeddings (Create Embedding)", () => {
    it("should create a simple embedding successfully", async () => {
      validateTestEnvironment()

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testEmbeddings.simple),
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.createEmbedding)

      const embedding = await response.json()
      validateEmbeddingStructure(embedding)

      expect(embedding.uri).toBe(testEmbeddings.simple.uri)
      expect(embedding.text).toBe(testEmbeddings.simple.text)
      expect(embedding.model_name).toBe(testEmbeddings.simple.model_name)

      registerEmbeddingForCleanup(embedding.id)
    })

    it("should create embedding with complex text", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testEmbeddings.complex),
      })

      validateHttpResponse(response, 200)

      const embedding = await response.json()
      validateEmbeddingStructure(embedding)

      expect(embedding.uri).toBe(testEmbeddings.complex.uri)
      expect(embedding.text).toBe(testEmbeddings.complex.text)

      registerEmbeddingForCleanup(embedding.id)
    })

    it("should create embedding with Japanese text", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testEmbeddings.japanese),
      })

      validateHttpResponse(response, 200)

      const embedding = await response.json()
      validateEmbeddingStructure(embedding)

      expect(embedding.uri).toBe(testEmbeddings.japanese.uri)
      expect(embedding.text).toBe(testEmbeddings.japanese.text)

      registerEmbeddingForCleanup(embedding.id)
    })

    it("should handle long text content", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testEmbeddings.long),
      })

      validateHttpResponse(response, 200)

      const embedding = await response.json()
      validateEmbeddingStructure(embedding)

      expect(embedding.text.length).toBeGreaterThan(1000)

      registerEmbeddingForCleanup(embedding.id)
    })

    it("should reject request with missing text", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.createEmbedding.missingText),
      })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
      expect(error).toHaveProperty("error")
    })

    it("should reject request with missing URI", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.createEmbedding.missingUri),
      })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
    })

    it("should reject request with empty text", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData.createEmbedding.emptyText),
      })

      expect(response.status).toBe(400)
    })

    it("should handle duplicate URI creation", async () => {
      const uri = createTestUri("duplicate-test")
      const embeddingData = {
        uri,
        text: "First embedding with this URI",
        model_name: "nomic-embed-text"
      }

      // Create first embedding
      const response1 = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embeddingData),
      })

      validateHttpResponse(response1, 200)
      const embedding1 = await response1.json()
      registerEmbeddingForCleanup(embedding1.id)

      // Create second embedding with same URI
      const response2 = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...embeddingData,
          text: "Second embedding with same URI"
        }),
      })

      validateHttpResponse(response2, 200)
      const embedding2 = await response2.json()
      registerEmbeddingForCleanup(embedding2.id)

      // Both should succeed but have different IDs
      expect(embedding1.id).not.toBe(embedding2.id)
      expect(embedding1.uri).toBe(embedding2.uri)
      expect(embedding1.text).not.toBe(embedding2.text)
    })
  })

  describe("GET /embeddings/{uri} (Get Embedding by URI)", () => {
    it("should retrieve embedding by URI", async () => {
      // First create an embedding
      const testData = {
        uri: createTestUri("get-test"),
        text: "Text for retrieval test",
        model_name: "nomic-embed-text"
      }

      const embedding = await createTestEmbedding(testData.uri, testData.text, testData.model_name)

      // Then retrieve it
      const encodedUri = encodeURIComponent(testData.uri)
      const response = await app.request(`/embeddings/${encodedUri}`)

      validateHttpResponse(response, 200)

      const retrievedEmbedding = await response.json()
      validateEmbeddingStructure(retrievedEmbedding)

      expect(retrievedEmbedding.id).toBe(embedding.id)
      expect(retrievedEmbedding.uri).toBe(testData.uri)
      expect(retrievedEmbedding.text).toBe(testData.text)
    })

    it("should handle URI encoding properly", async () => {
      const testUri = "test/uri with spaces & special chars"
      const embedding = await createTestEmbedding(testUri, "Text with special URI")

      const encodedUri = encodeURIComponent(testUri)
      const response = await app.request(`/embeddings/${encodedUri}`)

      validateHttpResponse(response, 200)

      const retrievedEmbedding = await response.json()
      expect(retrievedEmbedding.uri).toBe(testUri)
    })

    it("should return 404 for non-existent URI", async () => {
      const nonExistentUri = createTestUri("non-existent")
      const encodedUri = encodeURIComponent(nonExistentUri)
      const response = await app.request(`/embeddings/${encodedUri}`)

      expect(response.status).toBe(404)
      const error = await response.json()
      validateErrorResponse(error)
    })
  })

  describe("GET /embeddings (List Embeddings)", () => {
    it("should list embeddings with default pagination", async () => {
      // Create some test embeddings
      await createTestEmbedding("list-test-1", "First embedding for list test")
      await createTestEmbedding("list-test-2", "Second embedding for list test")

      const response = await app.request("/embeddings")

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result).toHaveProperty("embeddings")
      expect(result).toHaveProperty("count")
      expect(Array.isArray(result.embeddings)).toBe(true)

      validatePaginationStructure(result)

      // Validate each embedding in the list
      result.embeddings.forEach(validateEmbeddingStructure)
    })

    it("should handle pagination parameters", async () => {
      // Create embeddings for pagination test
      for (let i = 0; i < 5; i++) {
        await createTestEmbedding(`pagination-test-${i}`, `Text ${i} for pagination test`)
      }

      const response = await app.request("/embeddings?page=1&limit=3")

      validateHttpResponse(response, 200)

      const result = await response.json()
      validatePaginationStructure(result)

      expect(result.page).toBe(1)
      expect(result.limit).toBe(3)
      expect(result.embeddings.length).toBeLessThanOrEqual(3)
    })

    it("should filter by URI pattern", async () => {
      const uriPrefix = createTestUri("filter-test")
      await createTestEmbedding(`${uriPrefix}-1`, "First filtered embedding")
      await createTestEmbedding(`${uriPrefix}-2`, "Second filtered embedding")
      await createTestEmbedding("other-uri", "Other embedding")

      const response = await app.request(`/embeddings?uri=${encodeURIComponent(uriPrefix)}`)

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.embeddings.length).toBeGreaterThan(0)

      // All returned embeddings should match the filter
      result.embeddings.forEach((embedding: any) => {
        expect(embedding.uri).toContain(uriPrefix)
      })
    })

    it("should filter by model name", async () => {
      const modelName = "nomic-embed-text"
      await createTestEmbedding("model-filter-test", "Test for model filtering", modelName)

      const response = await app.request(`/embeddings?model_name=${modelName}`)

      validateHttpResponse(response, 200)

      const result = await response.json()
      result.embeddings.forEach((embedding: any) => {
        expect(embedding.model_name).toBe(modelName)
      })
    })

    it("should handle invalid pagination parameters", async () => {
      const response = await app.request("/embeddings?page=invalid&limit=invalid")

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
    })
  })

  describe("DELETE /embeddings/{id} (Delete Embedding)", () => {
    it("should delete embedding by ID", async () => {
      const embedding = await createTestEmbedding("delete-test", "Text for deletion test")

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request(`/embeddings/${embedding.id}`, { method: "DELETE" })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.deleteEmbedding)

      const result = await response.json()
      expect(result).toHaveProperty("message")
      expect(result.message).toContain("deleted successfully")

      // Verify embedding is actually deleted
      const getResponse = await app.request(`/embeddings/${encodeURIComponent(embedding.uri)}`)
      expect(getResponse.status).toBe(404)
    })

    it("should return 404 for non-existent ID", async () => {
      const nonExistentId = 999999
      const response = await app.request(`/embeddings/${nonExistentId}`, { method: "DELETE" })

      expect(response.status).toBe(404)
      const error = await response.json()
      validateErrorResponse(error)
    })

    it("should handle invalid ID parameter", async () => {
      const response = await app.request("/embeddings/invalid-id", { method: "DELETE" })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("success", false)
    })

    it("should handle negative ID", async () => {
      const response = await app.request("/embeddings/-1", { method: "DELETE" })

      expect(response.status).toBe(404)
    })
  })

  describe("Integration Tests", () => {
    it("should support full CRUD lifecycle", async () => {
      const testUri = createTestUri("crud-lifecycle")
      const testText = "Text for full CRUD lifecycle test"

      // Create
      const createResponse = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: testUri,
          text: testText,
          model_name: "nomic-embed-text"
        }),
      })

      validateHttpResponse(createResponse, 200)
      const embedding = await createResponse.json()
      validateEmbeddingStructure(embedding)

      // Read by URI
      const getResponse = await app.request(`/embeddings/${encodeURIComponent(testUri)}`)
      validateHttpResponse(getResponse, 200)
      const retrievedEmbedding = await getResponse.json()
      expect(retrievedEmbedding.id).toBe(embedding.id)

      // List (should include our embedding)
      const listResponse = await app.request("/embeddings")
      validateHttpResponse(listResponse, 200)
      const listResult = await listResponse.json()
      const foundInList = listResult.embeddings.some((e: any) => e.id === embedding.id)
      expect(foundInList).toBe(true)

      // Delete
      const deleteResponse = await app.request(`/embeddings/${embedding.id}`, { method: "DELETE" })
      validateHttpResponse(deleteResponse, 200)

      // Verify deletion
      const getAfterDeleteResponse = await app.request(`/embeddings/${encodeURIComponent(testUri)}`)
      expect(getAfterDeleteResponse.status).toBe(404)
    })
  })
})