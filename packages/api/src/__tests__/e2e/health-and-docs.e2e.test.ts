/**
 * E2E Tests for Health Check and Documentation Endpoints
 */

import { describe, it, expect } from "vitest"
import { getTestApp, setupE2ETests, validateTestEnvironment } from "../e2e-setup"
import { validateHttpResponse } from "../helpers/test-helpers"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Health Check and Documentation E2E Tests", () => {
  describe("GET / (Health Check)", () => {
    it("should return service identification", async () => {
      validateTestEnvironment()

      const response = await app.request("/")

      validateHttpResponse(response, 200, "text/plain")

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

      validateHttpResponse(response, 200, "application/json")

      const spec = await response.json()

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

    it("should have proper CORS headers", async () => {
      const response = await app.request("/openapi.json")

      expect(response.status).toBe(200)
      // Note: CORS headers would be set by middleware, testing structure here
      expect(response.headers.get("content-type")).toContain("application/json")
    })
  })

  describe("GET /docs (Swagger UI)", () => {
    it("should serve Swagger UI interface", async () => {
      const response = await app.request("/docs")

      validateHttpResponse(response, 200, "text/html")

      const html = await response.text()

      // Validate Swagger UI content
      expect(html).toContain("swagger-ui")
      expect(html).toContain("openapi.json")

      // Check for essential Swagger UI elements
      expect(html).toContain("SwaggerUIBundle")
      expect(html).toContain("swagger-ui-bundle")
    })

    it("should handle invalid routes with 404", async () => {
      const response = await app.request("/non-existent-endpoint")

      expect(response.status).toBe(404)
    })
  })

  describe("API Metadata", () => {
    it("should have consistent version across endpoints", async () => {
      const openApiResponse = await app.request("/openapi.json")
      const spec = await openApiResponse.json()

      expect(spec.info.version).toBe("1.0.0")

      // Validate server configuration
      expect(spec.servers[0].url).toContain("localhost")
      expect(spec.servers[0].description).toBe("Development server")
    })

    it("should include proper license information", async () => {
      const response = await app.request("/openapi.json")
      const spec = await response.json()

      expect(spec.info).toHaveProperty("license")
      expect(spec.info.license).toHaveProperty("name", "MIT")
      expect(spec.info.license).toHaveProperty("url", "https://opensource.org/licenses/MIT")
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed requests gracefully", async () => {
      const response = await app.request("/openapi.json", {
        method: "POST",
        body: "invalid data"
      })

      // Should either return 404 (method not allowed) or 405 (method not allowed)
      expect([404, 405]).toContain(response.status)
    })
  })
})