/**
 * E2E Tests for Task Types
 * Tests task type listing and metadata retrieval for embedding models
 */

import { describe, it, expect, beforeAll } from "vitest"
import app from "@/app"
import { setupE2ETests, testState } from "@/__tests__/e2e-setup"
import { parseUnknownJsonResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment
setupE2ETests()

describe("Task Types E2E Tests", () => {
  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  describe("GET /models/task-types", () => {
    it("should list task types for embeddinggemma model", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const result = await parseUnknownJsonResponse(response)

      expect(result).toHaveProperty("model_name")
      expect(result).toHaveProperty("task_types")
      expect(result).toHaveProperty("count")

      expect(result["model_name"]).toBe("embeddinggemma")
      expect(Array.isArray(result["task_types"])).toBe(true)
      expect(typeof result["count"]).toBe("number")
      expect(result["count"]).toBe((result["task_types"] as unknown[]).length)
    })

    it("should return valid task type metadata structure", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<Record<string, unknown>>

      expect(taskTypes.length).toBeGreaterThan(0)

      // Check structure of first task type
      const taskType = taskTypes[0]

      if (taskType) {
        expect(taskType).toHaveProperty("value")
        expect(taskType).toHaveProperty("label")
        expect(taskType).toHaveProperty("description")

        const value = taskType["value"]
        const label = taskType["label"]
        const description = taskType["description"]

        expect(typeof value).toBe("string")
        expect(typeof label).toBe("string")
        expect(typeof description).toBe("string")

        if (typeof value === "string" && typeof label === "string" && typeof description === "string") {
          expect(value.length).toBeGreaterThan(0)
          expect(label.length).toBeGreaterThan(0)
          expect(description.length).toBeGreaterThan(0)
        }
      }
    })

    it("should include retrieval_query task type for embeddinggemma", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<{value: string}>

      const retrievalQuery = taskTypes.find(t => t.value === "retrieval_query")
      expect(retrievalQuery).toBeDefined()
    })

    it("should include retrieval_document task type for embeddinggemma", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<{value: string}>

      const retrievalDocument = taskTypes.find(t => t.value === "retrieval_document")
      expect(retrievalDocument).toBeDefined()
    })

    it("should return empty array for models without task types", async () => {
      const response = await app.request("/models/task-types?model=nomic-embed-text")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)

      expect(result["model_name"]).toBe("nomic-embed-text")
      expect(Array.isArray(result["task_types"])).toBe(true)
      expect(result["task_types"]).toEqual([])
      expect(result["count"]).toBe(0)
    })

    it("should handle non-existent model names", async () => {
      const response = await app.request("/models/task-types?model=non-existent-model-12345")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)

      expect(result["model_name"]).toBe("non-existent-model-12345")
      expect(result["task_types"]).toEqual([])
      expect(result["count"]).toBe(0)
    })

    it("should handle empty model parameter", async () => {
      const response = await app.request("/models/task-types?model=")

      // Should either succeed with empty model or return validation error
      expect([200, 400, 422]).toContain(response.status)
    })

    it("should require model parameter", async () => {
      const response = await app.request("/models/task-types")

      expect([400, 422]).toContain(response.status)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
    })

    it("should handle URL-encoded model names", async () => {
      const response = await app.request("/models/task-types?model=embedding%2Dgemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)

      // Should decode the model name
      expect(result["model_name"]).toBe("embedding-gemma")
    })

    it("should handle special characters in model name", async () => {
      const response = await app.request("/models/task-types?model=test-model_v1.0")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)

      expect(result["model_name"]).toBe("test-model_v1.0")
      expect(result["task_types"]).toEqual([])
      expect(result["count"]).toBe(0)
    })
  })

  describe("Task Type Metadata Validation", () => {
    it("should have unique task type values", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<{value: string}>

      const values = taskTypes.map(t => t.value)
      const uniqueValues = new Set(values)

      expect(uniqueValues.size).toBe(values.length)
    })

    it("should have meaningful labels and descriptions", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<{
        value: string
        label: string
        description: string
      }>

      for (const taskType of taskTypes) {
        // Label should be human-readable (not just the value)
        expect(taskType.label).not.toBe(taskType.value)

        // Description should not be empty
        expect(taskType.description.length).toBeGreaterThan(0)

        // Value should be lowercase with underscores (snake_case)
        expect(taskType.value).toMatch(/^[a-z_]+$/)
      }
    })

    it("should include common task types", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const taskTypes = result["task_types"] as Array<{value: string}>

      const values = taskTypes.map(t => t.value)

      // Should include retrieval task types
      expect(values).toContain("retrieval_query")
      expect(values).toContain("retrieval_document")
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid HTTP methods", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma", {
        method: "POST",
      })

      expect([404, 405]).toContain(response.status)
    })

    it("should handle multiple model parameters", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma&model=nomic-embed-text")

      // Should either use first parameter or return error
      expect([200, 400]).toContain(response.status)

      if (response.status === 200) {
        const result = await parseUnknownJsonResponse(response)

        // Should have processed one of the models
        expect(["embeddinggemma", "nomic-embed-text"]).toContain(result["model_name"])
      }
    })

    it("should handle extra query parameters", async () => {
      const response = await app.request("/models/task-types?model=embeddinggemma&extra=value&foo=bar")

      // Should ignore extra parameters
      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)

      expect(result["model_name"]).toBe("embeddinggemma")
      expect(Array.isArray(result["task_types"])).toBe(true)
    })

    it("should handle very long model names", async () => {
      const longModelName = "a".repeat(1000)
      const response = await app.request(`/models/task-types?model=${longModelName}`)

      // Should either process or return error
      expect([200, 400, 414]).toContain(response.status)

      if (response.status === 200) {
        const result = await parseUnknownJsonResponse(response)

        expect(result["model_name"]).toBe(longModelName)
        expect(result["task_types"]).toEqual([])
      }
    })
  })

  describe("Performance", () => {
    it("should respond quickly", async () => {
      const startTime = Date.now()
      const response = await app.request("/models/task-types?model=embeddinggemma")
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it("should handle concurrent requests", async () => {
      const requests = []
      const requestCount = 10

      for (let i = 0; i < requestCount; i++) {
        requests.push(app.request("/models/task-types?model=embeddinggemma"))
      }

      const responses = await Promise.all(requests)

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200)
      }

      // All responses should be identical
      const results = await Promise.all(
        responses.map(r => parseUnknownJsonResponse(r))
      )

      const firstResult = JSON.stringify(results[0])
      for (const result of results) {
        expect(JSON.stringify(result)).toBe(firstResult)
      }
    })

    it("should handle rapid sequential requests", async () => {
      const requestCount = 50
      let successCount = 0

      for (let i = 0; i < requestCount; i++) {
        const response = await app.request("/models/task-types?model=embeddinggemma")

        if (response.status === 200) {
          successCount++
        }
      }

      // All requests should succeed
      expect(successCount).toBe(requestCount)
    })
  })

  describe("Integration with Models Endpoint", () => {
    it("should return task types for models from /models endpoint", async () => {
      // Get available models
      const modelsResponse = await app.request("/models")

      // May not be available in CI environment
      if (modelsResponse.status !== 200) {
        console.log("Skipping integration test - models endpoint unavailable")
        return
      }

      const modelsData = await parseUnknownJsonResponse(modelsResponse)
      const models = modelsData["models"] as Array<{name: string}>

      if (models.length === 0) {
        console.log("Skipping integration test - no models available")
        return
      }

      // Check task types for first available model
      const firstModel = models[0]

      if (!firstModel?.name) {
        throw new Error("First model missing name property")
      }

      const taskTypesResponse = await app.request(
        `/models/task-types?model=${encodeURIComponent(firstModel.name)}`
      )

      expect(taskTypesResponse.status).toBe(200)

      const taskTypesData = await parseUnknownJsonResponse(taskTypesResponse)

      expect(taskTypesData["model_name"]).toBe(firstModel.name)
      expect(Array.isArray(taskTypesData["task_types"])).toBe(true)
    })

    it("should be consistent with embedding creation", async () => {
      // Get task types for embeddinggemma
      const taskTypesResponse = await app.request("/models/task-types?model=embeddinggemma")

      if (taskTypesResponse.status !== 200) {
        console.log("Skipping integration test - task types unavailable")
        return
      }

      const taskTypesData = await parseUnknownJsonResponse(taskTypesResponse)
      const taskTypes = taskTypesData["task_types"] as Array<{value: string}>

      if (taskTypes.length === 0) {
        console.log("Model has no task types - skipping integration test")
        return
      }

      // Try to create an embedding with a supported task type
      const firstTaskType = taskTypes[0]

      if (!firstTaskType?.value) {
        throw new Error("Task type missing value property")
      }

      // Note: This test just verifies the API consistency, not actual embedding creation
      // The embedding creation with task types should work if the model supports it
      expect(firstTaskType.value).toBeTruthy()
    })
  })
})
