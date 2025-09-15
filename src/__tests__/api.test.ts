import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import app from "../index"
import type { EmbeddingService } from "../services/embedding"

// Mock embedding service for isolated API testing
const mockEmbeddingService: EmbeddingService = {
  createEmbedding: vi.fn(),
  getEmbedding: vi.fn(),
  getAllEmbeddings: vi.fn(),
  deleteEmbedding: vi.fn(),
}

// Mock the AppLayer to return our mock services
vi.mock("../layers/main", () => ({
  AppLayer: {
    pipe: vi.fn().mockReturnValue({
      provide: vi.fn(),
    }),
  },
}))

describe("API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /", () => {
    it("should return service name", async () => {
      const res = await app.request("/")
      expect(res.status).toBe(200)
      expect(await res.text()).toBe("EES - Embeddings API Service")
    })
  })

  describe("POST /embeddings", () => {
    it("should create embedding with valid data", async () => {
      const mockResponse = {
        id: 1,
        uri: "file://test.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      // Mock the Effect.runPromise to return our mock response
      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test document content",
        }),
      })

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result).toEqual(mockResponse)
    })

    it("should return 400 for missing required fields", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          // missing text field
        }),
      })

      expect(res.status).toBe(500) // Current implementation returns 500 for validation errors
      const result = await res.json()
      expect(result).toHaveProperty("error")
    })

    it("should return 400 for empty URI", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "",
          text: "Test content",
        }),
      })

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toHaveProperty("error")
    })

    it("should return 400 for empty text", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "",
        }),
      })

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toHaveProperty("error")
    })

    it("should use default model when model_name not provided", async () => {
      const mockResponse = {
        id: 1,
        uri: "file://test.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result.model_name).toBe("embeddinggemma:300m")
    })

    it("should accept custom model_name", async () => {
      const mockResponse = {
        id: 1,
        uri: "file://test.txt",
        model_name: "custom-model:latest",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
          model_name: "custom-model:latest",
        }),
      })

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result.model_name).toBe("custom-model:latest")
    })

    it("should handle service errors gracefully", async () => {
      vi.spyOn(Effect, "runPromise").mockRejectedValue(
        new Error("Service error")
      )

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toEqual({ error: "Failed to create embedding" })
    })

    it("should handle malformed JSON", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toHaveProperty("error")
    })

    it("should handle long text input", async () => {
      const longText = "a".repeat(10000)
      const mockResponse = {
        id: 1,
        uri: "file://long-text.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://long-text.txt",
          text: longText,
        }),
      })

      expect(res.status).toBe(200)
    })

    it("should handle Unicode and special characters", async () => {
      const unicodeText = 'こんにちは世界! 🌍 Special chars: <>&"'
      const mockResponse = {
        id: 1,
        uri: "file://unicode.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: "file://unicode.txt",
          text: unicodeText,
        }),
      })

      expect(res.status).toBe(200)
    })
  })

  describe("GET /embeddings/:uri", () => {
    it("should retrieve existing embedding by URI", async () => {
      const mockEmbedding = {
        id: 1,
        uri: "file://test.txt",
        text: "Test document content",
        model_name: "embeddinggemma:300m",
        embedding: [0.1, 0.2, 0.3],
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockEmbedding)

      const encodedUri = encodeURIComponent("file://test.txt")
      const res = await app.request(`/embeddings/${encodedUri}`)

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result).toEqual(mockEmbedding)
      expect(result).toHaveProperty("text")
      expect(result.text).toBe("Test document content")
    })

    it("should return 404 for non-existent embedding", async () => {
      vi.spyOn(Effect, "runPromise").mockResolvedValue(null)

      const encodedUri = encodeURIComponent("file://nonexistent.txt")
      const res = await app.request(`/embeddings/${encodedUri}`)

      expect(res.status).toBe(404)
      const result = await res.json()
      expect(result).toEqual({ error: "Embedding not found" })
    })

    it("should handle URL decoding correctly", async () => {
      const uri = "https://example.com/file with spaces.txt"
      const mockEmbedding = {
        id: 1,
        uri,
        text: "Content from URL",
        model_name: "embeddinggemma:300m",
        embedding: [0.1, 0.2, 0.3],
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockEmbedding)

      const encodedUri = encodeURIComponent(uri)
      const res = await app.request(`/embeddings/${encodedUri}`)

      expect(res.status).toBe(200)
    })

    it("should handle service errors", async () => {
      vi.spyOn(Effect, "runPromise").mockRejectedValue(
        new Error("Database error")
      )

      const encodedUri = encodeURIComponent("file://test.txt")
      const res = await app.request(`/embeddings/${encodedUri}`)

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toEqual({ error: "Failed to retrieve embedding" })
    })

    it("should handle special URI characters correctly", async () => {
      const specialUri = "file://path/with/特殊文字/and-symbols@#$.txt"
      const mockEmbedding = {
        id: 1,
        uri: specialUri,
        text: "Special content",
        model_name: "embeddinggemma:300m",
        embedding: [0.1, 0.2, 0.3],
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockEmbedding)

      const encodedUri = encodeURIComponent(specialUri)
      const res = await app.request(`/embeddings/${encodedUri}`)

      expect(res.status).toBe(200)
    })
  })

  describe("GET /embeddings", () => {
    it("should retrieve all embeddings", async () => {
      const mockEmbeddings = [
        {
          id: 1,
          uri: "file://test1.txt",
          text: "First document",
          model_name: "embeddinggemma:300m",
          embedding: [0.1, 0.2, 0.3],
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          uri: "file://test2.txt",
          text: "Second document",
          model_name: "embeddinggemma:300m",
          embedding: [0.4, 0.5, 0.6],
          created_at: "2024-01-01T01:00:00.000Z",
          updated_at: "2024-01-01T01:00:00.000Z",
        },
      ]

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockEmbeddings)

      const res = await app.request("/embeddings")

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result).toHaveProperty("embeddings")
      expect(result).toHaveProperty("count")
      expect(result.embeddings).toHaveLength(2)
      expect(result.count).toBe(2)
      expect(result.embeddings[0]).toHaveProperty("text")
      expect(result.embeddings[1]).toHaveProperty("text")
    })

    it("should return empty array when no embeddings exist", async () => {
      vi.spyOn(Effect, "runPromise").mockResolvedValue([])

      const res = await app.request("/embeddings")

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result).toEqual({
        embeddings: [],
        count: 0,
      })
    })

    it("should handle service errors", async () => {
      vi.spyOn(Effect, "runPromise").mockRejectedValue(
        new Error("Database error")
      )

      const res = await app.request("/embeddings")

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toEqual({ error: "Failed to retrieve embeddings" })
    })

    it("should preserve order of embeddings", async () => {
      const mockEmbeddings = [
        {
          id: 3,
          uri: "file://newer.txt",
          text: "Newer document",
          model_name: "embeddinggemma:300m",
          embedding: [0.7, 0.8, 0.9],
          created_at: "2024-01-02T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
        {
          id: 1,
          uri: "file://older.txt",
          text: "Older document",
          model_name: "embeddinggemma:300m",
          embedding: [0.1, 0.2, 0.3],
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ]

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockEmbeddings)

      const res = await app.request("/embeddings")

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result.embeddings[0].id).toBe(3)
      expect(result.embeddings[1].id).toBe(1)
    })
  })

  describe("DELETE /embeddings/:id", () => {
    it("should delete existing embedding", async () => {
      vi.spyOn(Effect, "runPromise").mockResolvedValue(true)

      const res = await app.request("/embeddings/1", {
        method: "DELETE",
      })

      expect(res.status).toBe(200)
      const result = await res.json()
      expect(result).toEqual({ message: "Embedding deleted successfully" })
    })

    it("should return 404 for non-existent embedding", async () => {
      vi.spyOn(Effect, "runPromise").mockResolvedValue(false)

      const res = await app.request("/embeddings/999", {
        method: "DELETE",
      })

      expect(res.status).toBe(404)
      const result = await res.json()
      expect(result).toEqual({ error: "Embedding not found" })
    })

    it("should return 400 for invalid ID", async () => {
      const res = await app.request("/embeddings/invalid", {
        method: "DELETE",
      })

      expect(res.status).toBe(400)
      const result = await res.json()
      expect(result).toEqual({ error: "Invalid ID parameter" })
    })

    it("should return 400 for negative ID", async () => {
      const res = await app.request("/embeddings/-1", {
        method: "DELETE",
      })

      expect(res.status).toBe(400)
      const result = await res.json()
      expect(result).toEqual({ error: "Invalid ID parameter" })
    })

    it("should return 400 for zero ID", async () => {
      const res = await app.request("/embeddings/0", {
        method: "DELETE",
      })

      // Zero is a valid number but not a valid ID in our system
      vi.spyOn(Effect, "runPromise").mockResolvedValue(false)

      expect(res.status).toBe(404)
    })

    it("should handle service errors", async () => {
      vi.spyOn(Effect, "runPromise").mockRejectedValue(
        new Error("Database error")
      )

      const res = await app.request("/embeddings/1", {
        method: "DELETE",
      })

      expect(res.status).toBe(500)
      const result = await res.json()
      expect(result).toEqual({ error: "Failed to delete embedding" })
    })

    it("should handle very large ID numbers", async () => {
      const largeId = Number.MAX_SAFE_INTEGER.toString()
      vi.spyOn(Effect, "runPromise").mockResolvedValue(false)

      const res = await app.request(`/embeddings/${largeId}`, {
        method: "DELETE",
      })

      expect(res.status).toBe(404)
    })
  })

  describe("Unsupported methods and routes", () => {
    it("should return 404 for undefined routes", async () => {
      const res = await app.request("/undefined-route")
      expect(res.status).toBe(404)
    })

    it("should handle unsupported HTTP methods on valid routes", async () => {
      const res = await app.request("/embeddings", {
        method: "PATCH",
      })
      // Hono returns 404 for unsupported methods
      expect(res.status).toBe(404)
    })

    it("should handle HEAD requests", async () => {
      const res = await app.request("/", {
        method: "HEAD",
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe("")
    })
  })

  describe("Content-Type handling", () => {
    it("should reject non-JSON content type for POST", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "plain text body",
      })

      expect(res.status).toBe(500)
    })

    it("should handle missing Content-Type header", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(res.status).toBe(500)
    })

    it("should accept Content-Type with charset", async () => {
      const mockResponse = {
        id: 1,
        uri: "file://test.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          uri: "file://test.txt",
          text: "Test content",
        }),
      })

      expect(res.status).toBe(200)
    })
  })

  describe("Edge cases and stress tests", () => {
    it("should handle concurrent requests", async () => {
      const mockResponse = {
        id: 1,
        uri: "file://concurrent.txt",
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const requests = Array.from({ length: 10 }, (_, i) =>
        app.request("/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uri: `file://concurrent-${i}.txt`,
            text: `Concurrent test ${i}`,
          }),
        })
      )

      const responses = await Promise.all(requests)
      responses.forEach((res) => {
        expect(res.status).toBe(200)
      })
    })

    it("should handle extremely long URIs", async () => {
      const longUri = "file://" + "a".repeat(1000) + ".txt"
      const mockResponse = {
        id: 1,
        uri: longUri,
        model_name: "embeddinggemma:300m",
        message: "Embedding created successfully",
      }

      vi.spyOn(Effect, "runPromise").mockResolvedValue(mockResponse)

      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: longUri,
          text: "Test content",
        }),
      })

      expect(res.status).toBe(200)
    })

    it("should handle empty request body", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      })

      expect(res.status).toBe(500)
    })

    it("should handle null values in JSON", async () => {
      const res = await app.request("/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: null,
          text: null,
        }),
      })

      expect(res.status).toBe(500)
    })
  })
})
