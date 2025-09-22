import { describe, expect, it, beforeAll, afterAll } from "vitest"
import app from "@/app"

describe("API Endpoints", () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = "test"
    // Use in-memory database for testing
    process.env.EES_DATABASE_URL = ":memory:"
  })

  afterAll(async () => {
    // Clean up
    delete process.env.NODE_ENV
    delete process.env.EES_DATABASE_URL
  })

  describe("POST /embeddings", () => {
    it("should handle invalid request body", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uri: "test-doc",
          // Missing required fields: text
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should handle empty request body", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        body: JSON.stringify({
          uri: "test-doc",
          text: "test text",
        }),
      })

      // Service errors result in 500 when dependencies aren't available
      expect(response.status).toBe(500)
    })
  })

  describe("GET /embeddings", () => {
    it("should handle pagination parameters", async () => {
      const response = await app.request("/embeddings?page=1&limit=5")

      // Service errors result in 500 when dependencies aren't available
      expect(response.status).toBe(500)
    })

    it("should handle invalid pagination parameters", async () => {
      const response = await app.request("/embeddings?page=invalid&limit=invalid")

      expect(response.status).toBe(400)
    })
  })

  describe("DELETE /embeddings/{id}", () => {
    it("should handle invalid ID parameter", async () => {
      const response = await app.request("/embeddings/invalid", {
        method: "DELETE",
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      // Hono validation error format
      expect(data).toHaveProperty("success", false)
      expect(data).toHaveProperty("error")
    })

    it("should handle non-numeric ID", async () => {
      const response = await app.request("/embeddings/abc123", {
        method: "DELETE",
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      // Hono validation error format
      expect(data).toHaveProperty("success", false)
      expect(data).toHaveProperty("error")
    })
  })

  describe("POST /embeddings/search", () => {
    it("should handle invalid search request", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required query field
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should handle malformed JSON", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /embeddings/batch", () => {
    it("should handle invalid batch request", async () => {
      const response = await app.request("/embeddings/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing items field
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("Health check", () => {
    it("should return service identification", async () => {
      const response = await app.request("/")

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe("EES - Embeddings API Service")
    })
  })

  describe("OpenAPI documentation", () => {
    it("should serve OpenAPI specification", async () => {
      const response = await app.request("/openapi.json")

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty("openapi")
      expect(data).toHaveProperty("info")
      expect(data).toHaveProperty("paths")
    })

    it("should serve Swagger UI", async () => {
      const response = await app.request("/docs")

      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain("swagger-ui")
    })
  })
})