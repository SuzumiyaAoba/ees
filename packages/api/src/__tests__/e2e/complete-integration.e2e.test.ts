/**
 * Complete Integration E2E Tests
 * Tests complete workflows and edge cases across all API endpoints
 */

import { describe, it, expect } from "vitest"
import {
  getTestApp,
  setupE2ETests,
  validateTestEnvironment,
  createTestEmbedding,
  registerEmbeddingForCleanup
} from "../e2e-setup"
import {
  validateHttpResponse,
  validateEmbeddingStructure,
  validateSearchResultStructure,
  validateBatchCreateResponse,
  validatePaginationStructure,
  measureResponseTime,
  createTestUri,
  generateMockFile
} from "../helpers/test-helpers"
import { performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Complete Integration E2E Tests", () => {
  describe("Full API Workflow Integration", () => {
    it("should support complete document lifecycle", async () => {
      validateTestEnvironment()

      const testUri = createTestUri("complete-workflow")
      const testText = "Complete integration test document about machine learning and artificial intelligence."

      // 1. Create embedding
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
      registerEmbeddingForCleanup(embedding.id)

      // 2. Retrieve by URI
      const getResponse = await app.request(`/embeddings/${encodeURIComponent(testUri)}`)
      validateHttpResponse(getResponse, 200)
      const retrievedEmbedding = await getResponse.json()
      expect(retrievedEmbedding.id).toBe(embedding.id)

      // 3. Search for the embedding
      const searchResponse = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "machine learning",
          limit: 10,
          threshold: 0.0,
          metric: "cosine"
        }),
      })

      validateHttpResponse(searchResponse, 200)
      const searchResult = await searchResponse.json()
      const foundInSearch = searchResult.results.some((result: any) => result.id === embedding.id)
      expect(foundInSearch).toBe(true)

      // 4. List embeddings (should include our embedding)
      const listResponse = await app.request("/embeddings")
      validateHttpResponse(listResponse, 200)
      const listResult = await listResponse.json()
      const foundInList = listResult.embeddings.some((e: any) => e.id === embedding.id)
      expect(foundInList).toBe(true)

      // 5. Delete embedding
      const deleteResponse = await app.request(`/embeddings/${embedding.id}`, { method: "DELETE" })
      validateHttpResponse(deleteResponse, 200)

      // 6. Verify deletion
      const getAfterDeleteResponse = await app.request(`/embeddings/${encodeURIComponent(testUri)}`)
      expect(getAfterDeleteResponse.status).toBe(404)
    })

    it("should support batch operations with subsequent search", async () => {
      const batchData = {
        texts: [
          { uri: createTestUri("batch-search-1"), text: "First document about deep learning neural networks." },
          { uri: createTestUri("batch-search-2"), text: "Second document about computer vision and image processing." },
          { uri: createTestUri("batch-search-3"), text: "Third document about natural language understanding." }
        ],
        model_name: "nomic-embed-text"
      }

      // Create batch embeddings
      const batchResponse = await app.request("/embeddings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      })

      validateHttpResponse(batchResponse, 200)
      const batchResult = await batchResponse.json()
      validateBatchCreateResponse(batchResult)

      expect(batchResult.successful).toBe(3)

      // Register for cleanup
      batchResult.results.forEach((item: any) => {
        if (item.success && item.data?.id) {
          registerEmbeddingForCleanup(item.data.id)
        }
      })

      // Search for technical terms
      const searchResponse = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "deep learning computer vision",
          limit: 5,
          threshold: 0.1,
          metric: "cosine"
        }),
      })

      validateHttpResponse(searchResponse, 200)
      const searchResult = await searchResponse.json()

      // Should find relevant documents
      expect(searchResult.count).toBeGreaterThan(0)
      searchResult.results.forEach(validateSearchResultStructure)

      // Should find at least some of our batch documents
      const batchIds = batchResult.results.map((item: any) => item.data.id)
      const foundBatchDocs = searchResult.results.filter((result: any) =>
        batchIds.includes(result.id)
      )
      expect(foundBatchDocs.length).toBeGreaterThan(0)
    })

    it("should support file upload with subsequent operations", async () => {
      const fileContent = "File upload integration test content about artificial intelligence and robotics."
      const file = generateMockFile("integration-upload.txt", fileContent)

      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      // Upload file
      const uploadResponse = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(uploadResponse, 200)
      const uploadResult = await uploadResponse.json()
      expect(uploadResult.successful).toBe(1)

      const embeddingId = uploadResult.results[0].data.id
      const embeddingUri = uploadResult.results[0].data.uri
      registerEmbeddingForCleanup(embeddingId)

      // Search for uploaded content
      const searchResponse = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "artificial intelligence robotics",
          limit: 10,
          threshold: 0.0,
          metric: "cosine"
        }),
      })

      validateHttpResponse(searchResponse, 200)
      const searchResult = await searchResponse.json()
      const foundUploaded = searchResult.results.some((result: any) => result.id === embeddingId)
      expect(foundUploaded).toBe(true)

      // List with filtering
      const listResponse = await app.request(`/embeddings?uri=${encodeURIComponent(embeddingUri)}`)
      validateHttpResponse(listResponse, 200)
      const listResult = await listResponse.json()
      expect(listResult.embeddings.length).toBeGreaterThan(0)
      expect(listResult.embeddings[0].id).toBe(embeddingId)
    })
  })

  describe("Cross-Endpoint Data Consistency", () => {
    it("should maintain data consistency across all endpoints", async () => {
      const testUri = createTestUri("consistency-test")
      const testText = "Consistency test document for cross-endpoint validation."

      // Create embedding
      const embedding = await createTestEmbedding(testUri, testText)

      // Verify consistency across all read endpoints
      const endpoints = [
        { url: `/embeddings/${encodeURIComponent(testUri)}`, method: "GET" },
        { url: "/embeddings", method: "GET" },
        {
          url: "/embeddings/search",
          method: "POST",
          body: JSON.stringify({ query: "consistency test", limit: 10, threshold: 0.0, metric: "cosine" })
        }
      ]

      for (const endpoint of endpoints) {
        const options: any = { method: endpoint.method }
        if (endpoint.body) {
          options.headers = { "Content-Type": "application/json" }
          options.body = endpoint.body
        }

        const response = await app.request(endpoint.url, options)
        validateHttpResponse(response, 200)

        const result = await response.json()

        let foundEmbedding: any = null
        if (endpoint.url.includes("/search")) {
          foundEmbedding = result.results.find((e: any) => e.id === embedding.id)
        } else if (endpoint.url === "/embeddings") {
          foundEmbedding = result.embeddings.find((e: any) => e.id === embedding.id)
        } else {
          foundEmbedding = result
        }

        expect(foundEmbedding).toBeDefined()
        expect(foundEmbedding.id).toBe(embedding.id)
        expect(foundEmbedding.uri).toBe(testUri)
        expect(foundEmbedding.text).toBe(testText)
        expect(foundEmbedding.model_name).toBe("nomic-embed-text")
      }
    })

    it("should handle concurrent operations safely", async () => {
      const baseUri = createTestUri("concurrent")

      // Create multiple embeddings concurrently
      const createOperations = Array.from({ length: 5 }, (_, i) =>
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: `${baseUri}-${i}`,
            text: `Concurrent test document ${i}`,
            model_name: "nomic-embed-text"
          }),
        })
      )

      const createResponses = await Promise.all(createOperations)
      const embeddings = await Promise.all(createResponses.map(r => r.json()))

      // Register all for cleanup
      embeddings.forEach(embedding => registerEmbeddingForCleanup(embedding.id))

      // Perform concurrent read operations
      const readOperations = [
        app.request("/embeddings"),
        app.request("/embeddings?limit=10"),
        app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "concurrent test", limit: 10, threshold: 0.0, metric: "cosine" })
        }),
        app.request("/models")
      ]

      const readResponses = await Promise.all(readOperations)

      // All operations should succeed
      readResponses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Verify data integrity
      const listResponse = readResponses[0]
      const listResult = await listResponse.json()

      embeddings.forEach(embedding => {
        const foundInList = listResult.embeddings.some((e: any) => e.id === embedding.id)
        expect(foundInList).toBe(true)
      })
    })
  })

  describe("Performance and Scalability", () => {
    it("should handle moderate load efficiently", async () => {
      const operations = []
      const startTime = Date.now()

      // Mix of different operations
      for (let i = 0; i < 10; i++) {
        const uri = createTestUri(`load-test-${i}`)

        operations.push(
          app.request("/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uri,
              text: `Load test document ${i} with varied content about technology and science.`,
              model_name: "nomic-embed-text"
            }),
          })
        )

        if (i % 3 === 0) {
          operations.push(
            app.request("/embeddings/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: "technology science",
                limit: 5,
                threshold: 0.0,
                metric: "cosine"
              })
            })
          )
        }

        if (i % 4 === 0) {
          operations.push(app.request("/models"))
        }
      }

      const responses = await Promise.all(operations)
      const duration = Date.now() - startTime

      // All operations should complete within reasonable time
      expect(duration).toBeLessThan(30000) // 30 seconds

      // Most operations should succeed
      const successCount = responses.filter(r => r.status === 200).length
      expect(successCount).toBeGreaterThan(operations.length * 0.8) // 80% success rate

      // Register created embeddings for cleanup
      const createResponses = responses.slice(0, 10) // First 10 are create operations
      for (const response of createResponses) {
        if (response.status === 200) {
          const embedding = await response.json()
          registerEmbeddingForCleanup(embedding.id)
        }
      }
    })

    it("should maintain performance across different content types", async () => {
      const contentTypes = [
        { name: "short", content: "Short text." },
        { name: "medium", content: "Medium length text content. ".repeat(10) },
        { name: "long", content: "Long text content with substantial information. ".repeat(50) },
        { name: "technical", content: "Advanced machine learning algorithms utilizing deep neural networks for computer vision applications in autonomous systems." },
        { name: "multilingual", content: "Multilingual content with English and 日本語の内容が含まれています。" }
      ]

      const results = []

      for (const contentType of contentTypes) {
        const { result: response, duration } = await measureResponseTime(async () =>
          app.request("/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uri: createTestUri(contentType.name),
              text: contentType.content,
              model_name: "nomic-embed-text"
            }),
          })
        )

        validateHttpResponse(response, 200)

        const embedding = await response.json()
        registerEmbeddingForCleanup(embedding.id)

        results.push({
          type: contentType.name,
          duration,
          contentLength: contentType.content.length
        })

        // Each should complete within reasonable time
        expect(duration).toBeLessThan(performanceThresholds.createEmbedding)
      }

      // Performance should scale reasonably with content length
      const shortDuration = results.find(r => r.type === "short")!.duration
      const longDuration = results.find(r => r.type === "long")!.duration

      // Long content shouldn't take more than 3x the time of short content
      expect(longDuration).toBeLessThan(shortDuration * 3)
    })
  })

  describe("Error Recovery and Edge Cases", () => {
    it("should handle mixed valid/invalid operations gracefully", async () => {
      const operations = [
        // Valid operation
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: createTestUri("valid-mixed"),
            text: "Valid embedding for mixed operations test.",
            model_name: "nomic-embed-text"
          }),
        }),
        // Invalid operation
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: "",
            text: "Invalid operation with empty URI",
            model_name: "nomic-embed-text"
          }),
        }),
        // Valid search
        app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "valid search query",
            limit: 5,
            threshold: 0.0,
            metric: "cosine"
          })
        }),
        // Invalid search
        app.request("/embeddings/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "",
            limit: 5
          })
        })
      ]

      const responses = await Promise.all(operations)

      // Valid operations should succeed
      expect(responses[0].status).toBe(200)
      expect(responses[2].status).toBe(200)

      // Invalid operations should fail appropriately
      expect(responses[1].status).toBe(400)
      expect(responses[3].status).toBe(400)

      // Register valid embedding for cleanup
      if (responses[0].status === 200) {
        const embedding = await responses[0].json()
        registerEmbeddingForCleanup(embedding.id)
      }
    })

    it("should maintain system stability under error conditions", async () => {
      // Generate various error conditions
      const errorOperations = [
        app.request("/embeddings", { method: "POST", body: "invalid json" }),
        app.request("/embeddings/nonexistent", { method: "DELETE" }),
        app.request("/embeddings/search", { method: "POST", body: "{}" }),
        app.request("/invalid-endpoint"),
        app.request("/embeddings", { method: "PATCH" }) // Unsupported method
      ]

      const responses = await Promise.all(errorOperations)

      // All should return appropriate error codes
      responses.forEach(response => {
        expect([400, 404, 405, 500]).toContain(response.status)
      })

      // System should still be responsive after errors
      const healthResponse = await app.request("/")
      validateHttpResponse(healthResponse, 200)

      const modelsResponse = await app.request("/models")
      expect(modelsResponse.status).toBe(200)
    })
  })

  describe("API Documentation and Standards Compliance", () => {
    it("should provide comprehensive API documentation", async () => {
      const openApiResponse = await app.request("/openapi.json")
      validateHttpResponse(openApiResponse, 200)

      const spec = await openApiResponse.json()

      // Validate comprehensive documentation
      expect(spec.paths).toHaveProperty("/embeddings")
      expect(spec.paths).toHaveProperty("/embeddings/search")
      expect(spec.paths).toHaveProperty("/embeddings/batch")
      expect(spec.paths).toHaveProperty("/embeddings/{uri}")
      expect(spec.paths).toHaveProperty("/embeddings/{id}")
      expect(spec.paths).toHaveProperty("/models")
      expect(spec.paths).toHaveProperty("/upload")

      // Each endpoint should have proper documentation
      Object.values(spec.paths).forEach((pathSpec: any) => {
        Object.values(pathSpec).forEach((methodSpec: any) => {
          expect(methodSpec).toHaveProperty("summary")
          expect(methodSpec).toHaveProperty("description")
          expect(methodSpec).toHaveProperty("responses")
        })
      })
    })

    it("should maintain consistent response formats", async () => {
      // Test various endpoints for format consistency
      const embedding = await createTestEmbedding("format-test", "Format consistency test")

      const endpoints = [
        { response: await app.request(`/embeddings/${encodeURIComponent("format-test")}`), type: "single" },
        { response: await app.request("/embeddings"), type: "list" },
        {
          response: await app.request("/embeddings/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "format", limit: 1, threshold: 0.0, metric: "cosine" })
          }),
          type: "search"
        }
      ]

      for (const endpoint of endpoints) {
        validateHttpResponse(endpoint.response, 200)
        const result = await endpoint.response.json()

        // All successful responses should have consistent error handling
        expect(result).not.toHaveProperty("error")

        // Timestamps should be consistent format
        if (endpoint.type === "single") {
          expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }
      }
    })
  })
})