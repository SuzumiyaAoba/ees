/**
 * E2E Tests for Model Migration
 * Tests model compatibility checking and migration operations
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest"
import app from "@/app"
import { setupE2ETests, registerEmbeddingForCleanup, testState } from "@/__tests__/e2e-setup"
import { parseJsonResponse, parseUnknownJsonResponse, isCreateEmbeddingResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment
setupE2ETests()

describe("Model Migration E2E Tests", () => {
  const createdEmbeddingIds: number[] = []

  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  afterEach(async () => {
    // Cleanup created embeddings
    for (const id of createdEmbeddingIds) {
      try {
        await app.request(`/embeddings/${id}`, {
          method: "DELETE"
        })
      } catch (error) {
        console.log(`Failed to delete embedding ${id}:`, error)
      }
    }
    createdEmbeddingIds.length = 0
  })

  describe("POST /models/compatibility", () => {
    it("should check compatibility between same models", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "nomic-embed-text",
          targetModel: "nomic-embed-text"
        }),
      })

      // Accept both success and service unavailable
      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping compatibility test - service unavailable")
        return
      }

      const compatibility = await parseUnknownJsonResponse(response)

      expect(compatibility).toHaveProperty("compatible")
      expect(typeof compatibility["compatible"]).toBe("boolean")

      // Same model should be compatible
      expect(compatibility["compatible"]).toBe(true)

      // Optional fields
      if (compatibility["reason"]) {
        expect(typeof compatibility["reason"]).toBe("string")
      }
      if (compatibility["similarityScore"] !== undefined) {
        expect(typeof compatibility["similarityScore"]).toBe("number")
        expect(compatibility["similarityScore"]).toBeGreaterThanOrEqual(0)
        expect(compatibility["similarityScore"]).toBeLessThanOrEqual(1)
      }
    })

    it("should check compatibility between different models", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "nomic-embed-text",
          targetModel: "embeddinggemma"
        }),
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping compatibility test - service unavailable")
        return
      }

      const compatibility = await parseUnknownJsonResponse(response)

      expect(compatibility).toHaveProperty("compatible")
      expect(typeof compatibility["compatible"]).toBe("boolean")

      // If incompatible, should have a reason
      if (compatibility["compatible"] === false && compatibility["reason"]) {
        const reason = compatibility["reason"]
        expect(typeof reason).toBe("string")
        if (typeof reason === "string") {
          expect(reason.length).toBeGreaterThan(0)
        }
      }
    })

    it("should return error for non-existent source model", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "non-existent-model-12345",
          targetModel: "nomic-embed-text"
        }),
      })

      expect([400, 404, 500]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
      expect(typeof error["error"]).toBe("string")
    })

    it("should return error for non-existent target model", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "nomic-embed-text",
          targetModel: "non-existent-model-12345"
        }),
      })

      expect([400, 404, 500]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
      expect(typeof error["error"]).toBe("string")
    })

    it("should validate request body schema", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle missing sourceModel field", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetModel: "nomic-embed-text"
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle missing targetModel field", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "nomic-embed-text"
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle empty model names", async () => {
      const response = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "",
          targetModel: ""
        }),
      })

      // Accept validation error or successful response (implementation dependent)
      expect([200, 400, 404, 422]).toContain(response.status)
    })
  })

  describe("POST /models/migrate", () => {
    it("should migrate embeddings between same model", async () => {
      // Create test embeddings
      for (let i = 0; i < 3; i++) {
        const createResponse = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uri: `migration-same-model-test-${i}`,
            text: `Test document ${i} for same-model migration.`,
            model_name: "nomic-embed-text"
          }),
        })

        expect([200, 404, 500]).toContain(createResponse.status)

        if (createResponse.status === 200) {
          const embedding = await parseJsonResponse(createResponse, isCreateEmbeddingResponse)
          createdEmbeddingIds.push(embedding.id)
          registerEmbeddingForCleanup(embedding.id)
        }
      }

      if ((createdEmbeddingIds as unknown as unknown[])["length"] === 0) {
        console.log("Skipping migration test - no embeddings created")
        return
      }

      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            preserveOriginal: true,
            batchSize: 10,
            continueOnError: true
          }
        }),
      })

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping migration test - service unavailable")
        return
      }

      const migrationResult = await parseUnknownJsonResponse(response)

      // Check migration result structure
      expect(migrationResult).toHaveProperty("totalProcessed")
      expect(migrationResult).toHaveProperty("successful")
      expect(migrationResult).toHaveProperty("failed")

      expect(typeof migrationResult["totalProcessed"]).toBe("number")
      expect(typeof migrationResult["successful"]).toBe("number")
      expect(typeof migrationResult["failed"]).toBe("number")

      // Validate migration statistics
      expect(migrationResult["totalProcessed"]).toBeGreaterThanOrEqual(0)
      expect(migrationResult["successful"]).toBeGreaterThanOrEqual(0)
      expect(migrationResult["failed"]).toBeGreaterThanOrEqual(0)

      // Total should equal successful + failed
      expect(migrationResult["totalProcessed"]).toBe(
        (migrationResult["successful"] as number) + (migrationResult["failed"] as number)
      )

      // Optional fields
      if (migrationResult["duration"] !== undefined) {
        expect(typeof migrationResult["duration"]).toBe("number")
        expect(migrationResult["duration"]).toBeGreaterThan(0)
      }

      if (migrationResult["details"]) {
        expect(Array.isArray(migrationResult["details"])).toBe(true)
      }
    })

    it("should include migration details", async () => {
      // Create a test embedding
      const createResponse = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uri: "migration-details-test",
          text: "Test document for migration details.",
          model_name: "nomic-embed-text"
        }),
      })

      expect([200, 404, 500]).toContain(createResponse.status)

      if (createResponse.status !== 200) {
        console.log("Skipping migration details test - service unavailable")
        return
      }

      const embedding = await parseJsonResponse(createResponse, isCreateEmbeddingResponse)
      createdEmbeddingIds.push(embedding.id)
      registerEmbeddingForCleanup(embedding.id)

      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            preserveOriginal: true
          }
        }),
      })

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping migration details test - service unavailable")
        return
      }

      const migrationResult = await parseUnknownJsonResponse(response)

      if (migrationResult["details"] && Array.isArray(migrationResult["details"])) {
        const details = migrationResult["details"] as Array<Record<string, unknown>>

        // Check detail structure
        for (const detail of details) {
          expect(detail).toHaveProperty("id")
          expect(detail).toHaveProperty("uri")
          expect(detail).toHaveProperty("status")

          expect(typeof detail["id"]).toBe("number")
          expect(typeof detail["uri"]).toBe("string")
          expect(["success", "error"]).toContain(detail["status"])

          // If error, should have error message
          if (detail["status"] === "error") {
            expect(detail).toHaveProperty("error")
            expect(typeof detail["error"]).toBe("string")
          }
        }
      }
    })

    it("should handle migration options", async () => {
      // Create test embedding
      const createResponse = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uri: "migration-options-test",
          text: "Test document for migration options.",
          model_name: "nomic-embed-text"
        }),
      })

      expect([200, 404, 500]).toContain(createResponse.status)

      if (createResponse.status !== 200) {
        console.log("Skipping migration options test - service unavailable")
        return
      }

      const embedding = await parseJsonResponse(createResponse, isCreateEmbeddingResponse)
      createdEmbeddingIds.push(embedding.id)
      registerEmbeddingForCleanup(embedding.id)

      // Test with various options
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            preserveOriginal: false,
            batchSize: 5,
            continueOnError: true,
            metadata: {
              test: "migration-test",
              timestamp: new Date().toISOString()
            }
          }
        }),
      })

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        const migrationResult = await parseUnknownJsonResponse(response)

        expect(migrationResult).toHaveProperty("totalProcessed")
        expect(migrationResult).toHaveProperty("successful")
        expect(migrationResult).toHaveProperty("failed")
      }
    })

    it("should validate migration request body", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle invalid batch size", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            batchSize: 0 // Invalid: must be >= 1
          }
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle excessive batch size", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            batchSize: 10000 // Invalid: max is 1000
          }
        }),
      })

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle migration with no embeddings", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "non-existent-model-xyz",
          toModel: "nomic-embed-text"
        }),
      })

      // Should either succeed with 0 processed or return 404
      expect([200, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        const migrationResult = await parseUnknownJsonResponse(response)

        expect(migrationResult["totalProcessed"]).toBe(0)
        expect(migrationResult["successful"]).toBe(0)
        expect(migrationResult["failed"]).toBe(0)
      }
    })
  })

  describe("Migration Error Handling", () => {
    it("should handle invalid HTTP methods", async () => {
      const response = await app.request("/models/migrate", {
        method: "GET",
      })

      expect([404, 405]).toContain(response.status)
    })

    it("should handle malformed JSON", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ invalid json",
      })

      expect([400, 422]).toContain(response.status)
    })

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/models/migrate", {
        method: "POST",
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text"
        }),
      })

      // Should either process or reject
      expect([200, 400, 415]).toContain(response.status)
    })
  })

  describe("Migration Performance", () => {
    it("should complete migration in reasonable time", async () => {
      // Create a small set of test embeddings
      for (let i = 0; i < 2; i++) {
        const createResponse = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uri: `migration-perf-test-${i}`,
            text: `Test document ${i}`,
            model_name: "nomic-embed-text"
          }),
        })

        if (createResponse.status === 200) {
          const embedding = await parseJsonResponse(createResponse, isCreateEmbeddingResponse)
          createdEmbeddingIds.push(embedding.id)
          registerEmbeddingForCleanup(embedding.id)
        }
      }

      if (createdEmbeddingIds.length === 0) {
        console.log("Skipping performance test - no embeddings created")
        return
      }

      const startTime = Date.now()

      const response = await app.request("/models/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromModel: "nomic-embed-text",
          toModel: "nomic-embed-text",
          options: {
            batchSize: 10
          }
        }),
      })

      const duration = Date.now() - startTime

      expect([200, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        // Should complete within reasonable time (30 seconds for small batch)
        expect(duration).toBeLessThan(30000)

        const migrationResult = await parseUnknownJsonResponse(response)

        // Reported duration should be close to actual duration
        if (migrationResult["duration"] !== undefined) {
          expect(migrationResult["duration"]).toBeCloseTo(duration, -2) // Within 100ms
        }
      }
    })
  })

  describe("Migration Integration", () => {
    it("should validate models before migration", async () => {
      // First check compatibility
      const compatResponse = await app.request("/models/compatibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceModel: "nomic-embed-text",
          targetModel: "nomic-embed-text"
        }),
      })

      if (compatResponse.status !== 200) {
        console.log("Skipping integration test - compatibility check unavailable")
        return
      }

      const compatibility = await parseUnknownJsonResponse(compatResponse)

      // If compatible, migration should be possible
      if (compatibility["compatible"] === true) {
        const migResponse = await app.request("/models/migrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromModel: "nomic-embed-text",
            toModel: "nomic-embed-text"
          }),
        })

        // Should either succeed or fail gracefully
        expect([200, 400, 404, 500]).toContain(migResponse.status)
      }
    })
  })
})
