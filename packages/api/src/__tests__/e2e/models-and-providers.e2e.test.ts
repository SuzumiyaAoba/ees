/**
 * E2E Tests for Models and Providers Management
 */

import { describe, it, expect } from "vitest"
import {
  getTestApp,
  setupE2ETests,
  validateTestEnvironment
} from "../e2e-setup"
import {
  validateHttpResponse,
  validateModelStructure,
  measureResponseTime
} from "../helpers/test-helpers"
import { performanceThresholds } from "../fixtures/test-data"

// Setup E2E test environment
setupE2ETests()

const app = getTestApp()

describe("Models and Providers E2E Tests", () => {
  describe("GET /models (List Available Models)", () => {
    it("should list available models", async () => {
      validateTestEnvironment()

      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/models")
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(5000) // 5 seconds for model listing

      const result = await response.json()

      // Validate response structure
      expect(result).toHaveProperty("models")
      expect(result).toHaveProperty("count")
      expect(result).toHaveProperty("providers")

      expect(Array.isArray(result.models)).toBe(true)
      expect(typeof result.count).toBe("number")
      expect(Array.isArray(result.providers)).toBe(true)

      expect(result.count).toBe(result.models.length)

      // Validate each model structure
      result.models.forEach(validateModelStructure)

      // Should have at least one model available
      expect(result.models.length).toBeGreaterThan(0)
      expect(result.count).toBeGreaterThan(0)
      expect(result.providers.length).toBeGreaterThan(0)
    })

    it("should include ollama models", async () => {
      const response = await app.request("/models")

      validateHttpResponse(response, 200)

      const result = await response.json()

      // Should include ollama provider
      expect(result.providers).toContain("ollama")

      // Should have nomic-embed-text model
      const nomicModel = result.models.find((model: any) =>
        model.name === "nomic-embed-text" && model.provider === "ollama"
      )
      expect(nomicModel).toBeDefined()
    })

    it("should return consistent model information", async () => {
      const response1 = await app.request("/models")
      const response2 = await app.request("/models")

      validateHttpResponse(response1, 200)
      validateHttpResponse(response2, 200)

      const result1 = await response1.json()
      const result2 = await response2.json()

      // Results should be consistent
      expect(result1.count).toBe(result2.count)
      expect(result1.providers).toEqual(result2.providers)
      expect(result1.models.length).toBe(result2.models.length)
    })

    it("should handle HEAD request for models", async () => {
      const response = await app.request("/models", { method: "HEAD" })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      // HEAD request should not have body
      const text = await response.text()
      expect(text).toBe("")
    })
  })

  describe("Provider Management Endpoints", () => {
    describe("GET /providers (List Providers)", () => {
      it("should list available providers", async () => {
        const response = await app.request("/providers")

        validateHttpResponse(response, 200)

        const result = await response.json()

        expect(result).toHaveProperty("providers")
        expect(Array.isArray(result.providers)).toBe(true)

        // Should include ollama provider
        const ollamaProvider = result.providers.find((p: any) => p.name === "ollama")
        expect(ollamaProvider).toBeDefined()
        expect(ollamaProvider.status).toBeDefined()
      })
    })

    describe("GET /providers/status (Provider Status)", () => {
      it("should return provider status information", async () => {
        const response = await app.request("/providers/status")

        validateHttpResponse(response, 200)

        const result = await response.json()

        expect(result).toHaveProperty("providers")
        expect(Array.isArray(result.providers)).toBe(true)

        // Each provider should have status information
        result.providers.forEach((provider: any) => {
          expect(provider).toHaveProperty("name")
          expect(provider).toHaveProperty("status")
          expect(provider).toHaveProperty("available")
          expect(typeof provider.name).toBe("string")
          expect(typeof provider.status).toBe("string")
          expect(typeof provider.available).toBe("boolean")
        })
      })
    })

    describe("GET /providers/ollama/status (Ollama Status)", () => {
      it("should return ollama-specific status", async () => {
        const response = await app.request("/providers/ollama/status")

        // Should either return 200 with status or error if ollama is not available
        expect([200, 404, 500]).toContain(response.status)

        if (response.status === 200) {
          const result = await response.json()
          expect(result).toHaveProperty("status")
          expect(result).toHaveProperty("available")
          expect(typeof result.available).toBe("boolean")

          if (result.available) {
            expect(result).toHaveProperty("version")
            expect(result).toHaveProperty("models")
          }
        }
      })
    })

    describe("GET /providers/ollama/models (Ollama Models)", () => {
      it("should list ollama-specific models", async () => {
        const response = await app.request("/providers/ollama/models")

        // Should either return models or indicate ollama is not available
        expect([200, 404, 500]).toContain(response.status)

        if (response.status === 200) {
          const result = await response.json()
          expect(result).toHaveProperty("models")
          expect(Array.isArray(result.models)).toBe(true)

          result.models.forEach((model: any) => {
            expect(model).toHaveProperty("name")
            expect(model.provider).toBe("ollama")
          })
        }
      })
    })
  })

  describe("Model Compatibility and Migration", () => {
    describe("POST /models/compatibility (Check Model Compatibility)", () => {
      it("should check compatibility between models", async () => {
        const compatibilityRequest = {
          source_model: "nomic-embed-text",
          target_model: "nomic-embed-text"
        }

        const response = await app.request("/models/compatibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(compatibilityRequest),
        })

        validateHttpResponse(response, 200)

        const result = await response.json()
        expect(result).toHaveProperty("compatible")
        expect(result).toHaveProperty("reason")
        expect(typeof result.compatible).toBe("boolean")
        expect(typeof result.reason).toBe("string")

        // Same model should be compatible with itself
        expect(result.compatible).toBe(true)
      })

      it("should handle incompatible models", async () => {
        const compatibilityRequest = {
          source_model: "nomic-embed-text",
          target_model: "non-existent-model"
        }

        const response = await app.request("/models/compatibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(compatibilityRequest),
        })

        // Should either indicate incompatibility or error
        expect([200, 400]).toContain(response.status)

        if (response.status === 200) {
          const result = await response.json()
          expect(result.compatible).toBe(false)
          expect(result.reason).toContain("model")
        }
      })
    })

    describe("POST /migrate (Migrate Embeddings)", () => {
      it("should validate migration request", async () => {
        const migrationRequest = {
          source_model: "nomic-embed-text",
          target_model: "nomic-embed-text",
          dry_run: true
        }

        const response = await app.request("/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(migrationRequest),
        })

        // Should either process the request or indicate validation errors
        expect([200, 400, 500]).toContain(response.status)

        if (response.status === 200) {
          const result = await response.json()
          expect(result).toHaveProperty("dry_run", true)
          expect(result).toHaveProperty("compatible")
        }
      })

      it("should reject migration with invalid models", async () => {
        const migrationRequest = {
          source_model: "",
          target_model: "nomic-embed-text",
          dry_run: true
        }

        const response = await app.request("/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(migrationRequest),
        })

        expect(response.status).toBe(400)
      })
    })
  })

  describe("Model Discovery and Health", () => {
    it("should discover models from all configured providers", async () => {
      const response = await app.request("/models")
      validateHttpResponse(response, 200)

      const result = await response.json()

      // Should have discovered models from available providers
      expect(result.models.length).toBeGreaterThan(0)

      // Check that we have the expected provider types
      const providerTypes = result.providers
      expect(providerTypes).toContain("ollama")

      // Validate that models have consistent structure
      result.models.forEach((model: any) => {
        validateModelStructure(model)
        expect(providerTypes).toContain(model.provider)
      })
    })

    it("should handle provider failures gracefully", async () => {
      // Test with potentially unavailable providers
      const response = await app.request("/models")

      // Should still return a valid response even if some providers fail
      expect([200, 500]).toContain(response.status)

      if (response.status === 200) {
        const result = await response.json()
        expect(result).toHaveProperty("models")
        expect(result).toHaveProperty("count")
        expect(result).toHaveProperty("providers")
      }
    })
  })

  describe("Performance Tests", () => {
    it("should retrieve models within performance limits", async () => {
      const { result: response, duration } = await measureResponseTime(async () =>
        app.request("/models")
      )

      validateHttpResponse(response, 200)
      expect(duration).toBeLessThan(5000) // 5 seconds max for model discovery

      const result = await response.json()
      expect(result.models.length).toBeGreaterThan(0)
    })

    it("should handle concurrent model requests", async () => {
      const requests = Array.from({ length: 5 }, () =>
        app.request("/models")
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // All responses should be consistent
      const results = await Promise.all(responses.map(r => r.json()))
      const firstResult = results[0]

      results.forEach(result => {
        expect(result.count).toBe(firstResult.count)
        expect(result.providers).toEqual(firstResult.providers)
      })
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed requests gracefully", async () => {
      const response = await app.request("/models", {
        method: "POST",
        body: "invalid data"
      })

      // Should return appropriate error for unsupported method
      expect([404, 405]).toContain(response.status)
    })

    it("should handle invalid provider endpoints", async () => {
      const response = await app.request("/providers/nonexistent/status")

      expect([404, 400]).toContain(response.status)
    })
  })
})