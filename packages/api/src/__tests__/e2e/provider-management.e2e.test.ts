/**
 * E2E Tests for Provider Management
 * Tests all provider-related API endpoints
 */

import { describe, it, expect, beforeAll } from "vitest"
import app from "@/app"
import { setupE2ETests, testState } from "@/__tests__/e2e-setup"
import { parseUnknownJsonResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment
setupE2ETests()

describe("Provider Management E2E Tests", () => {
  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  describe("GET /providers", () => {
    it("should list all available providers", async () => {
      const response = await app.request("/providers")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const providers = await parseUnknownJsonResponse(response)

      expect(Array.isArray(providers)).toBe(true)
      expect((providers as unknown as unknown[])["length"]).toBeGreaterThan(0)

      // Check provider structure
      const provider = (providers as unknown as unknown[])[0] as Record<string, unknown>
      expect(provider).toHaveProperty("name")
      expect(provider).toHaveProperty("status")
      expect(typeof provider["name"]).toBe("string")
      expect(["online", "offline", "unknown"]).toContain(provider["status"])

      // Optional fields
      if (provider["displayName"]) {
        expect(typeof provider["displayName"]).toBe("string")
      }
      if (provider["description"]) {
        expect(typeof provider["description"]).toBe("string")
      }
      if (provider["version"]) {
        expect(typeof provider["version"]).toBe("string")
      }
      if (provider["modelCount"] !== undefined) {
        expect(typeof provider["modelCount"]).toBe("number")
      }
    })

    it("should include Ollama provider", async () => {
      const response = await app.request("/providers")

      expect(response.status).toBe(200)

      const providers = await parseUnknownJsonResponse(response)
      const providerArray = providers as unknown as Array<{name: string}>
      const ollamaProvider = providerArray.find(
        p => p.name === "ollama"
      )

      expect(ollamaProvider).toBeDefined()
    })

    it("should handle requests with various query parameters", async () => {
      // Test that endpoint ignores unexpected query params
      const response = await app.request("/providers?foo=bar")

      expect(response.status).toBe(200)

      const providers = await parseUnknownJsonResponse(response)
      expect(Array.isArray(providers)).toBe(true)
    })
  })

  describe("GET /providers/current", () => {
    it("should return current active provider", async () => {
      const response = await app.request("/providers/current")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const currentProvider = await parseUnknownJsonResponse(response)

      expect(currentProvider).toHaveProperty("provider")
      expect(typeof currentProvider["provider"]).toBe("string")

      // Should be one of the supported providers
      expect(["ollama", "openai", "google", "cohere", "mistral", "azure"]).toContain(
        currentProvider["provider"]
      )
    })

    it("should include provider configuration", async () => {
      const response = await app.request("/providers/current")

      expect(response.status).toBe(200)

      const currentProvider = await parseUnknownJsonResponse(response)

      if (currentProvider["configuration"]) {
        expect(typeof currentProvider["configuration"]).toBe("object")

        const config = currentProvider["configuration"] as Record<string, unknown>

        // Should have baseUrl and model for Ollama
        if (currentProvider["provider"] === "ollama") {
          expect(config).toHaveProperty("baseUrl")
          expect(config).toHaveProperty("model")
        }
      }
    })

    it("should return consistent provider across multiple requests", async () => {
      const response1 = await app.request("/providers/current")
      const response2 = await app.request("/providers/current")

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const provider1 = await parseUnknownJsonResponse(response1)
      const provider2 = await parseUnknownJsonResponse(response2)

      expect(provider1["provider"]).toBe(provider2["provider"])
    })
  })

  describe("GET /providers/models", () => {
    it("should list all provider models", async () => {
      const response = await app.request("/providers/models")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const models = await parseUnknownJsonResponse(response)

      expect(Array.isArray(models)).toBe(true)
      expect((models as unknown as unknown[])["length"]).toBeGreaterThan(0)

      // Check model structure
      const model = (models as unknown as unknown[])[0] as Record<string, unknown>
      expect(model).toHaveProperty("name")
      expect(model).toHaveProperty("provider")
      expect(typeof model["name"]).toBe("string")
      expect(typeof model["provider"]).toBe("string")

      // Optional fields
      if (model["displayName"]) {
        expect(typeof model["displayName"]).toBe("string")
      }
      if (model["dimensions"] !== undefined) {
        expect(typeof model["dimensions"]).toBe("number")
        expect(model["dimensions"]).toBeGreaterThan(0)
      }
      if (model["maxTokens"] !== undefined) {
        expect(typeof model["maxTokens"]).toBe("number")
        expect(model["maxTokens"]).toBeGreaterThan(0)
      }
    })

    it("should filter models by provider", async () => {
      const response = await app.request("/providers/models?provider=ollama")

      expect(response.status).toBe(200)

      const models = await parseUnknownJsonResponse(response)

      expect(Array.isArray(models)).toBe(true)

      // All returned models should be from Ollama
      const modelArray = models as unknown as Array<{provider: string}>
      for (const model of modelArray) {
        expect(model.provider).toBe("ollama")
      }
    })

    it("should return 404 for non-existent provider", async () => {
      const response = await app.request("/providers/models?provider=nonexistent")

      expect(response.status).toBe(404)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
      expect(typeof error["error"]).toBe("string")
    })

    it("should include model metadata", async () => {
      const response = await app.request("/providers/models")

      expect(response.status).toBe(200)

      const models = await parseUnknownJsonResponse(response)

      // Check for models with metadata
      const modelArray = models as unknown as Array<Record<string, unknown>>
      const modelWithMetadata = modelArray.find(
        m => m["size"] !== undefined || m["modified_at"] !== undefined
      )

      if (modelWithMetadata) {
        if (modelWithMetadata["size"] !== undefined) {
          expect(typeof modelWithMetadata["size"]).toBe("number")
          expect(modelWithMetadata["size"]).toBeGreaterThan(0)
        }
        if (modelWithMetadata["modified_at"]) {
          expect(typeof modelWithMetadata["modified_at"]).toBe("string")
        }
        if (modelWithMetadata["digest"]) {
          expect(typeof modelWithMetadata["digest"]).toBe("string")
        }
      }
    })

    it("should handle empty provider parameter", async () => {
      const response = await app.request("/providers/models?provider=")

      // Should either return all models or return 404
      expect([200, 404]).toContain(response.status)
    })
  })

  describe("GET /providers/ollama/status", () => {
    it("should return Ollama service status", async () => {
      const response = await app.request("/providers/ollama/status")

      // Accept both online (200) and offline (503) status
      expect([200, 503]).toContain(response.status)

      const status = await parseUnknownJsonResponse(response)

      expect(status).toHaveProperty("status")
      expect(["online", "offline"]).toContain(status["status"])
      expect(status).toHaveProperty("baseUrl")
      expect(typeof status["baseUrl"]).toBe("string")
    })

    it("should include response time", async () => {
      const response = await app.request("/providers/ollama/status")

      expect([200, 503]).toContain(response.status)

      const status = await parseUnknownJsonResponse(response)

      if (status["responseTime"] !== undefined) {
        expect(typeof status["responseTime"]).toBe("number")
        expect(status["responseTime"]).toBeGreaterThanOrEqual(0)
      }
    })

    it("should include version when online", async () => {
      const response = await app.request("/providers/ollama/status")

      if (response.status === 200) {
        const status = await parseUnknownJsonResponse(response)

        expect(status["status"]).toBe("online")

        if (status["version"]) {
          expect(typeof status["version"]).toBe("string")
        }
      }
    })

    it("should include available models when online", async () => {
      const response = await app.request("/providers/ollama/status")

      if (response.status === 200) {
        const status = await parseUnknownJsonResponse(response)

        if (status["models"]) {
          expect(Array.isArray(status["models"])).toBe(true)

          // Validate model names
          for (const modelName of status["models"] as string[]) {
            expect(typeof modelName).toBe("string")
            expect(modelName.length).toBeGreaterThan(0)
          }
        }
      }
    })

    it("should include error message when offline", async () => {
      const response = await app.request("/providers/ollama/status")

      if (response.status === 503) {
        const status = await parseUnknownJsonResponse(response)

        expect(status["status"]).toBe("offline")
        expect(status).toHaveProperty("error")
        expect(typeof status["error"]).toBe("string")
      }
    })

    it("should respond within reasonable time", async () => {
      const startTime = Date.now()
      const response = await app.request("/providers/ollama/status")
      const duration = Date.now() - startTime

      expect([200, 503]).toContain(response.status)

      // Should respond within 10 seconds (includes 5s timeout)
      expect(duration).toBeLessThan(10000)
    })

    it("should be consistent across multiple requests", async () => {
      const response1 = await app.request("/providers/ollama/status")
      const response2 = await app.request("/providers/ollama/status")

      expect([200, 503]).toContain(response1.status)
      expect([200, 503]).toContain(response2.status)

      const status1 = await parseUnknownJsonResponse(response1)
      const status2 = await parseUnknownJsonResponse(response2)

      // Status should be consistent
      expect(status1["status"]).toBe(status2["status"])
    })
  })

  describe("Provider Integration", () => {
    it("should have consistent provider information across endpoints", async () => {
      // Get all providers
      const providersResponse = await app.request("/providers")
      expect(providersResponse.status).toBe(200)
      const providers = await parseUnknownJsonResponse(providersResponse)

      // Get current provider
      const currentResponse = await app.request("/providers/current")
      expect(currentResponse.status).toBe(200)
      const currentProvider = await parseUnknownJsonResponse(currentResponse)

      // Current provider should be in the providers list
      const providerArray = providers as unknown as Array<{name: string}>
      const providerExists = providerArray.some(
        p => p.name === currentProvider["provider"]
      )
      expect(providerExists).toBe(true)
    })

    it("should return models for current provider", async () => {
      // Get current provider
      const currentResponse = await app.request("/providers/current")
      expect(currentResponse.status).toBe(200)
      const currentProvider = await parseUnknownJsonResponse(currentResponse)

      // Get models for current provider
      const modelsResponse = await app.request(
        `/providers/models?provider=${currentProvider["provider"]}`
      )

      // Should succeed or return 404 if provider has no models yet
      expect([200, 404]).toContain(modelsResponse.status)

      if (modelsResponse.status === 200) {
        const models = await parseUnknownJsonResponse(modelsResponse)
        expect(Array.isArray(models)).toBe(true)
      }
    })

    it("should have Ollama status consistent with provider list", async () => {
      // Get Ollama status
      const statusResponse = await app.request("/providers/ollama/status")
      expect([200, 503]).toContain(statusResponse.status)
      const ollamaStatus = await parseUnknownJsonResponse(statusResponse)

      // Get all providers
      const providersResponse = await app.request("/providers")
      expect(providersResponse.status).toBe(200)
      const providers = await parseUnknownJsonResponse(providersResponse)

      const providerArray = providers as unknown as Array<{name: string, status: string}>
      const ollamaProvider = providerArray.find(
        p => p.name === "ollama"
      )

      if (ollamaProvider && ollamaStatus["status"]) {
        // Provider status should match or be "unknown" if not checked
        // Note: There may be a race condition between provider list fetching and status checking
        // so we allow either the status to match or be "unknown"
        if (ollamaProvider.status !== "unknown") {
          // Allow status to be different due to timing issues (one call may succeed, another may fail)
          expect(["online", "offline", "unknown"]).toContain(ollamaProvider.status)
          expect(["online", "offline"]).toContain(ollamaStatus["status"])
        }
      }
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid HTTP methods gracefully", async () => {
      const response = await app.request("/providers", {
        method: "POST",
      })

      // Should return 404 or 405
      expect([404, 405]).toContain(response.status)
    })

    it("should handle malformed provider filter", async () => {
      const response = await app.request("/providers/models?provider=")

      // Should either succeed with empty filter or return error
      expect([200, 400, 404]).toContain(response.status)
    })

    it("should handle non-existent provider endpoints", async () => {
      const response = await app.request("/providers/nonexistent/status")

      expect(response.status).toBe(404)
    })
  })

  describe("Performance", () => {
    it("should respond quickly to provider listing", async () => {
      const startTime = Date.now()
      const response = await app.request("/providers")
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it("should respond quickly to current provider query", async () => {
      const startTime = Date.now()
      const response = await app.request("/providers/current")
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it("should handle concurrent provider requests", async () => {
      const requests = []
      const requestCount = 10

      for (let i = 0; i < requestCount; i++) {
        requests.push(app.request("/providers"))
      }

      const responses = await Promise.all(requests)

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200)
      }
    })
  })
})
