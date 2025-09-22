/**
 * E2E Tests for File Upload Operations
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
  validateEmbeddingStructure,
  measureResponseTime,
  generateMockFile
} from "../helpers/test-helpers"
import { testFiles, performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("File Upload E2E Tests", () => {
  describe("POST /upload (Upload Files)", () => {
    it("should upload and process a single text file", async () => {
      validateTestEnvironment()

      const file = generateMockFile("test.txt", testFiles.small.content)
      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/upload", {
          method: "POST",
          body: formData,
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.createEmbedding)

      const result = await response.json()

      expect(result).toHaveProperty("successful")
      expect(result).toHaveProperty("failed")
      expect(result).toHaveProperty("total")
      expect(result).toHaveProperty("results")

      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.total).toBe(1)
      expect(Array.isArray(result.results)).toBe(true)
      expect(result.results.length).toBe(1)

      const uploadResult = result.results[0]
      expect(uploadResult.success).toBe(true)
      expect(uploadResult).toHaveProperty("data")

      validateEmbeddingStructure(uploadResult.data)
      expect(uploadResult.data.uri).toBe("test.txt")
      expect(uploadResult.data.text).toBe(testFiles.small.content)
      expect(uploadResult.data.model_name).toBe("nomic-embed-text")

      registerEmbeddingForCleanup(uploadResult.data.id)
    })

    it("should upload and process multiple files", async () => {
      const file1 = generateMockFile("file1.txt", "Content of first file for upload testing.")
      const file2 = generateMockFile("file2.txt", "Content of second file for upload testing.")
      const file3 = generateMockFile("file3.txt", "Content of third file for upload testing.")

      const formData = new FormData()
      formData.append("files", file1)
      formData.append("files", file2)
      formData.append("files", file3)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(response, 200)

      const result = await response.json()

      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.total).toBe(3)
      expect(result.results.length).toBe(3)

      result.results.forEach((uploadResult: any, index: number) => {
        expect(uploadResult.success).toBe(true)
        validateEmbeddingStructure(uploadResult.data)
        expect(uploadResult.data.uri).toBe(`file${index + 1}.txt`)
        registerEmbeddingForCleanup(uploadResult.data.id)
      })
    })

    it("should handle medium-sized files", async () => {
      const file = generateMockFile("medium.txt", testFiles.medium.content)
      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.successful).toBe(1)

      const uploadResult = result.results[0]
      validateEmbeddingStructure(uploadResult.data)
      expect(uploadResult.data.text).toBe(testFiles.medium.content)

      registerEmbeddingForCleanup(uploadResult.data.id)
    })

    it("should handle files with special characters in names", async () => {
      const specialFileName = "test file with spaces & symbols (1).txt"
      const file = generateMockFile(specialFileName, "Content with special filename.")

      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(response, 200)

      const result = await response.json()
      expect(result.successful).toBe(1)

      const uploadResult = result.results[0]
      expect(uploadResult.data.uri).toBe(specialFileName)

      registerEmbeddingForCleanup(uploadResult.data.id)
    })

    it("should handle empty files gracefully", async () => {
      const emptyFile = generateMockFile("empty.txt", "")

      const formData = new FormData()
      formData.append("files", emptyFile)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(response, 200)

      const result = await response.json()

      // Empty file should result in failure
      expect(result.failed).toBeGreaterThan(0)

      const uploadResult = result.results[0]
      expect(uploadResult.success).toBe(false)
      expect(uploadResult).toHaveProperty("error")
    })

    it("should handle mixed success and failure in batch upload", async () => {
      const validFile = generateMockFile("valid.txt", "Valid file content.")
      const emptyFile = generateMockFile("empty.txt", "")

      const formData = new FormData()
      formData.append("files", validFile)
      formData.append("files", emptyFile)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(response, 200)

      const result = await response.json()

      expect(result.total).toBe(2)
      expect(result.successful + result.failed).toBe(2)

      // Should have both success and failure
      const successes = result.results.filter((r: any) => r.success)
      const failures = result.results.filter((r: any) => !r.success)

      expect(successes.length).toBeGreaterThan(0)
      expect(failures.length).toBeGreaterThan(0)

      // Register successful uploads for cleanup
      successes.forEach((uploadResult: any) => {
        registerEmbeddingForCleanup(uploadResult.data.id)
      })
    })

    it("should handle non-text files appropriately", async () => {
      // Create a mock binary file (simulate image)
      const binaryContent = new Array(100).fill(0).map(() => Math.floor(Math.random() * 256))
      const binaryFile = new File([new Uint8Array(binaryContent)], "image.jpg", { type: "image/jpeg" })

      const formData = new FormData()
      formData.append("files", binaryFile)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Should either process as text or handle the binary content appropriately
      expect([200, 400]).toContain(response.status)

      if (response.status === 200) {
        const result = await response.json()
        expect(result.total).toBe(1)

        if (result.successful > 0) {
          registerEmbeddingForCleanup(result.results[0].data.id)
        }
      }
    })

    it("should validate model_name parameter", async () => {
      const file = generateMockFile("test.txt", "Test content.")

      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "invalid-model-name")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Should either succeed with warning or fail with validation error
      expect([200, 400]).toContain(response.status)
    })

    it("should handle missing files parameter", async () => {
      const formData = new FormData()
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty("error")
    })

    it("should handle missing model_name parameter", async () => {
      const file = generateMockFile("test.txt", "Test content.")

      const formData = new FormData()
      formData.append("files", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Should either use default model or require explicit model
      expect([200, 400]).toContain(response.status)

      if (response.status === 200) {
        const result = await response.json()
        if (result.successful > 0) {
          registerEmbeddingForCleanup(result.results[0].data.id)
        }
      }
    })

    it("should handle large file uploads", async () => {
      // Create a larger file content
      const largeContent = "Large file content. ".repeat(1000) // ~20KB
      const largeFile = generateMockFile("large.txt", largeContent)

      const formData = new FormData()
      formData.append("files", largeFile)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Should either succeed or fail gracefully based on size limits
      expect([200, 400, 413]).toContain(response.status)

      if (response.status === 200) {
        const result = await response.json()
        if (result.successful > 0) {
          const uploadResult = result.results[0]
          expect(uploadResult.data.text.length).toBeGreaterThan(10000)
          registerEmbeddingForCleanup(uploadResult.data.id)
        }
      }
    })
  })

  describe("Upload Performance Tests", () => {
    it("should process small file uploads within time limits", async () => {
      const file = generateMockFile("perf.txt", "Performance test content.")
      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/upload", {
          method: "POST",
          body: formData,
        })
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(performanceThresholds.createEmbedding)

      const result = await response.json()
      if (result.successful > 0) {
        registerEmbeddingForCleanup(result.results[0].data.id)
      }
    })

    it("should handle concurrent uploads", async () => {
      const uploads = Array.from({ length: 3 }, (_, i) => {
        const file = generateMockFile(`concurrent-${i}.txt`, `Concurrent upload test ${i}`)
        const formData = new FormData()
        formData.append("files", file)
        formData.append("model_name", "nomic-embed-text")

        return app.request("/upload", {
          method: "POST",
          body: formData,
        })
      })

      const responses = await Promise.all(uploads)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      const results = await Promise.all(responses.map(r => r.json()))

      results.forEach(result => {
        if (result.successful > 0) {
          registerEmbeddingForCleanup(result.results[0].data.id)
        }
      })
    })
  })

  describe("Upload Error Handling", () => {
    it("should handle invalid Content-Type", async () => {
      const response = await app.request("/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: ["test"] }),
      })

      expect([400, 415]).toContain(response.status)
    })

    it("should handle request without multipart data", async () => {
      const response = await app.request("/upload", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not multipart data",
      })

      expect([400, 415]).toContain(response.status)
    })

    it("should handle malformed multipart data", async () => {
      const response = await app.request("/upload", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=invalid" },
        body: "malformed multipart data",
      })

      expect([400, 415]).toContain(response.status)
    })
  })

  describe("Upload Integration Tests", () => {
    it("should create searchable embeddings from uploaded files", async () => {
      // Upload a file
      const file = generateMockFile("searchable.txt", "This is a document about artificial intelligence and machine learning algorithms.")
      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const uploadResponse = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      validateHttpResponse(uploadResponse, 200)

      const uploadResult = await uploadResponse.json()
      expect(uploadResult.successful).toBe(1)

      const embeddingId = uploadResult.results[0].data.id
      registerEmbeddingForCleanup(embeddingId)

      // Search for the uploaded content
      const searchResponse = await app.request("/embeddings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "artificial intelligence",
          limit: 10,
          threshold: 0.0,
          metric: "cosine"
        }),
      })

      validateHttpResponse(searchResponse, 200)

      const searchResult = await searchResponse.json()
      expect(searchResult.count).toBeGreaterThan(0)

      // Should find the uploaded document
      const foundEmbedding = searchResult.results.find((result: any) =>
        result.id === embeddingId
      )
      expect(foundEmbedding).toBeDefined()
    })

    it("should handle file uploads and subsequent operations", async () => {
      // Upload
      const file = generateMockFile("integration.txt", "Integration test document content.")
      const formData = new FormData()
      formData.append("files", file)
      formData.append("model_name", "nomic-embed-text")

      const uploadResponse = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      const uploadResult = await uploadResponse.json()
      const embeddingId = uploadResult.results[0].data.id
      const embeddingUri = uploadResult.results[0].data.uri

      // Retrieve by URI
      const getResponse = await app.request(`/embeddings/${encodeURIComponent(embeddingUri)}`)
      validateHttpResponse(getResponse, 200)

      const embedding = await getResponse.json()
      expect(embedding.id).toBe(embeddingId)

      // List embeddings
      const listResponse = await app.request("/embeddings")
      validateHttpResponse(listResponse, 200)

      const listResult = await listResponse.json()
      const foundInList = listResult.embeddings.some((e: any) => e.id === embeddingId)
      expect(foundInList).toBe(true)

      // Delete
      const deleteResponse = await app.request(`/embeddings/${embeddingId}`, { method: "DELETE" })
      validateHttpResponse(deleteResponse, 200)

      // Verify deletion
      const getAfterDeleteResponse = await app.request(`/embeddings/${encodeURIComponent(embeddingUri)}`)
      expect(getAfterDeleteResponse.status).toBe(404)
    })
  })
})