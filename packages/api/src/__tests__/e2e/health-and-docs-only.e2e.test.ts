/**
 * Basic E2E Tests for Health Check and Documentation Endpoints
 * Tests that don't require external service dependencies
 */

import { describe, it, expect } from "vitest"
import app from "@/app"

describe("Health Check and Documentation E2E Tests", () => {
  describe("GET / (Health Check)", () => {
    it("should return service identification", async () => {
      const response = await app.request("/")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/plain")

      const text = await response.text()
      expect(text).toBe("EES - Embeddings API Service")
    })

    it("should handle HEAD requests", async () => {
      const response = await app.request("/", { method: "HEAD" })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/plain")

      // HEAD request should not have body
      const text = await response.text()
      expect(text).toBe("")
    })
  })

  describe("GET /openapi.json (OpenAPI Specification)", () => {
    it("should serve valid OpenAPI specification", async () => {
      const response = await app.request("/openapi.json")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const spec = await response.json() as any

      // Validate OpenAPI 3.0 structure
      expect(spec).toHaveProperty("openapi")
      expect(spec.openapi).toBe("3.0.0")

      expect(spec).toHaveProperty("info")
      expect(spec.info).toHaveProperty("title", "EES - Embeddings API Service")
      expect(spec.info).toHaveProperty("version", "1.0.0")
      expect(spec.info).toHaveProperty("description")

      expect(spec).toHaveProperty("paths")
      expect(typeof spec.paths).toBe("object")

      // Validate that key endpoints are documented
      expect(spec.paths).toHaveProperty("/embeddings")
      expect(spec.paths).toHaveProperty("/embeddings/search")
      expect(spec.paths).toHaveProperty("/embeddings/batch")

      expect(spec).toHaveProperty("servers")
      expect(Array.isArray(spec.servers)).toBe(true)
      expect(spec.servers.length).toBeGreaterThan(0)

      expect(spec).toHaveProperty("tags")
      expect(Array.isArray(spec.tags)).toBe(true)

      // Validate required tags
      const tagNames = spec.tags.map((tag: any) => tag.name)
      expect(tagNames).toContain("Health")
      expect(tagNames).toContain("Embeddings")
      expect(tagNames).toContain("Models")
    })

    it("should have proper license information", async () => {
      const response = await app.request("/openapi.json")
      const spec = await response.json() as any

      expect(spec.info).toHaveProperty("license")
      expect(spec.info.license).toHaveProperty("name", "MIT")
      expect(spec.info.license).toHaveProperty("url", "https://opensource.org/licenses/MIT")
    })
  })

  describe("GET /docs (Swagger UI)", () => {
    it("should serve Swagger UI interface", async () => {
      const response = await app.request("/docs")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/html")

      const html = await response.text()

      // Validate Swagger UI content
      expect(html).toContain("swagger-ui")
      expect(html).toContain("openapi.json")

      // Check for essential Swagger UI elements
      expect(html).toContain("SwaggerUIBundle")
      expect(html).toContain("swagger-ui-bundle")
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid routes with 404", async () => {
      const response = await app.request("/non-existent-endpoint")

      expect(response.status).toBe(404)
    })

    it("should handle malformed requests gracefully", async () => {
      const response = await app.request("/openapi.json", {
        method: "POST",
        body: "invalid data"
      })

      // Should either return 404 (method not allowed) or 405 (method not allowed)
      expect([404, 405]).toContain(response.status)
    })
  })

  describe("Validation Tests", () => {
    it("should reject invalid embedding creation requests", async () => {
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

    it("should reject empty embedding creation requests", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it("should reject invalid search requests", async () => {
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

    it("should reject malformed JSON in search", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      })

      expect(response.status).toBe(400)
    })

    it("should reject invalid batch requests", async () => {
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

    it("should handle invalid pagination parameters", async () => {
      const response = await app.request("/embeddings?page=invalid&limit=invalid")

      expect(response.status).toBe(400)
    })

    it("should handle invalid delete ID parameter", async () => {
      const response = await app.request("/embeddings/invalid", {
        method: "DELETE",
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      // Hono validation error format
      expect(data).toHaveProperty("success", false)
      expect(data).toHaveProperty("error")
    })
  })
})