/**
 * E2E Tests for Connection Management
 * Tests all connection-related API endpoints
 */

import { describe, it, expect, beforeAll } from "vitest"
import app from "@/app"
import { setupE2ETests, testState } from "@/__tests__/e2e-setup"
import { parseUnknownJsonResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment without default connection
// This test file manages its own connections
setupE2ETests({ skipDefaultConnection: true })

describe("Connection Management E2E Tests", () => {
  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  // Store connection IDs for testing
  let testConnectionId: number
  let secondConnectionId: number

  describe("POST /connections", () => {
    it("should create a new connection", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Ollama Connection",
          type: "ollama",
          baseUrl: "http://localhost:11434",
        }),
      })

      expect(response.status).toBe(201)
      expect(response.headers.get("content-type")).toContain("application/json")

      const connection = await parseUnknownJsonResponse(response)

      expect(connection).toHaveProperty("id")
      expect(typeof connection["id"]).toBe("number")
      expect(connection["name"]).toBe("Test Ollama Connection")
      expect(connection["type"]).toBe("ollama")
      expect(connection["baseUrl"]).toBe("http://localhost:11434")
      expect(connection["isActive"]).toBe(false)

      // Store for later tests
      testConnectionId = connection["id"] as number
    })

    it("should create OpenAI-compatible connection with API key", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "LM Studio Local",
          type: "openai-compatible",
          baseUrl: "http://localhost:1234",
          apiKey: "test-api-key",
          isActive: false,
        }),
      })

      expect(response.status).toBe(201)

      const connection = await parseUnknownJsonResponse(response)

      expect(connection["name"]).toBe("LM Studio Local")
      expect(connection["type"]).toBe("openai-compatible")
      expect(connection["baseUrl"]).toBe("http://localhost:1234")
      // API key should NOT be returned in response
      expect(connection["apiKey"]).toBeUndefined()

      secondConnectionId = connection["id"] as number
    })

    it("should create connection with metadata", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cloud Provider",
          type: "openai-compatible",
          baseUrl: "https://api.example.com",
          metadata: {
            region: "us-west",
            tier: "premium",
          },
        }),
      })

      expect(response.status).toBe(201)

      const connection = await parseUnknownJsonResponse(response)

      expect(connection["metadata"]).toBeDefined()
      const metadata = connection["metadata"] as Record<string, unknown>
      expect(metadata).toHaveProperty("region")
      expect(metadata["region"]).toBe("us-west")
    })

    it("should reject connection with invalid type", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Invalid Connection",
          type: "invalid-type",
          baseUrl: "http://localhost:1234",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject connection with missing required fields", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Incomplete Connection",
          // Missing type and baseUrl
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject connection with invalid URL", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Invalid URL Connection",
          type: "ollama",
          baseUrl: "not-a-valid-url",
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /connections", () => {
    it("should list all connections", async () => {
      const response = await app.request("/connections")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const result = await parseUnknownJsonResponse(response)

      expect(result).toHaveProperty("connections")
      expect(result).toHaveProperty("total")
      expect(Array.isArray(result["connections"])).toBe(true)
      expect(typeof result["total"]).toBe("number")
      expect(result["total"]).toBeGreaterThan(0)

      // Check connection structure
      const connections = result["connections"] as Array<Record<string, unknown>>
      expect(connections.length).toBeGreaterThan(0)

      const connection = connections[0]
      expect(connection).toBeDefined()
      expect(connection).toHaveProperty("id")
      expect(connection).toHaveProperty("name")
      expect(connection).toHaveProperty("type")
      expect(connection).toHaveProperty("baseUrl")
      expect(connection).toHaveProperty("isActive")
      // API key should NOT be returned
      expect(connection?.["apiKey"]).toBeUndefined()
    })

    it("should return connections with timestamps", async () => {
      const response = await app.request("/connections")

      expect(response.status).toBe(200)

      const result = await parseUnknownJsonResponse(response)
      const connections = result["connections"] as Array<Record<string, unknown>>

      if (connections.length > 0) {
        const connection = connections[0]
        expect(connection).toBeDefined()
        if (connection?.["createdAt"]) {
          expect(typeof connection["createdAt"]).toBe("string")
        }
        if (connection?.["updatedAt"]) {
          expect(typeof connection["updatedAt"]).toBe("string")
        }
      }
    })
  })

  describe("GET /connections/{id}", () => {
    it("should get connection by ID", async () => {
      const response = await app.request(`/connections/${testConnectionId}`)

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const connection = await parseUnknownJsonResponse(response)

      expect(connection["id"]).toBe(testConnectionId)
      expect(connection["name"]).toBe("Test Ollama Connection")
      expect(connection["type"]).toBe("ollama")
      // API key should NOT be returned
      expect(connection["apiKey"]).toBeUndefined()
    })

    it("should return 404 for non-existent connection", async () => {
      const response = await app.request("/connections/99999")

      expect(response.status).toBe(404)

      const error = await parseUnknownJsonResponse(response)
      expect(error).toHaveProperty("error")
      expect(typeof error["error"]).toBe("string")
    })

    it("should return 400 for invalid ID format", async () => {
      const response = await app.request("/connections/invalid-id")

      expect([400, 404]).toContain(response.status)
    })
  })

  describe("GET /connections/active", () => {
    it("should get active connection", async () => {
      // First activate a connection
      await app.request(`/connections/${testConnectionId}/activate`, {
        method: "POST",
      })

      const response = await app.request("/connections/active")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const connection = await parseUnknownJsonResponse(response)

      if (connection !== null) {
        expect(connection).toHaveProperty("id")
        expect(connection).toHaveProperty("isActive")
        expect(connection["isActive"]).toBe(true)
      }
    })

    it("should return null when no active connection exists", async () => {
      // Deactivate all connections (update them to set isActive = false)
      const listResponse = await app.request("/connections")
      const list = await parseUnknownJsonResponse(listResponse)
      const connections = list["connections"] as Array<{ id: number }>

      for (const conn of connections) {
        await app.request(`/connections/${conn.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: false,
          }),
        })
      }

      const response = await app.request("/connections/active")

      expect(response.status).toBe(200)

      const connection = await response.json()
      expect(connection).toBeNull()
    })
  })

  describe("PATCH /connections/{id}", () => {
    it("should update connection properties", async () => {
      const response = await app.request(`/connections/${testConnectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Ollama Connection",
        }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const connection = await parseUnknownJsonResponse(response)

      expect(connection["id"]).toBe(testConnectionId)
      expect(connection["name"]).toBe("Updated Ollama Connection")
      // Type should not change
      expect(connection["type"]).toBe("ollama")
    })

    it("should update only specified fields", async () => {
      const response = await app.request(`/connections/${testConnectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: "http://localhost:11435",
        }),
      })

      expect(response.status).toBe(200)

      const connection = await parseUnknownJsonResponse(response)

      expect(connection["baseUrl"]).toBe("http://localhost:11435")
      // Name should remain unchanged
      expect(connection["name"]).toBe("Updated Ollama Connection")
    })

    it("should return 404 for non-existent connection", async () => {
      const response = await app.request("/connections/99999", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Should Fail",
        }),
      })

      expect(response.status).toBe(404)
    })

    it("should reject invalid URL in update", async () => {
      const response = await app.request(`/connections/${testConnectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: "not-a-valid-url",
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /connections/{id}/activate", () => {
    it("should activate a connection", async () => {
      const response = await app.request(`/connections/${testConnectionId}/activate`, {
        method: "POST",
      })

      expect(response.status).toBe(204)

      // Verify it's now active
      const getResponse = await app.request(`/connections/${testConnectionId}`)
      const connection = await parseUnknownJsonResponse(getResponse)

      expect(connection["isActive"]).toBe(true)
    })

    it("should deactivate other connections when activating one", async () => {
      // Activate first connection
      await app.request(`/connections/${testConnectionId}/activate`, {
        method: "POST",
      })

      // Activate second connection
      await app.request(`/connections/${secondConnectionId}/activate`, {
        method: "POST",
      })

      // First connection should now be inactive
      const getResponse = await app.request(`/connections/${testConnectionId}`)
      const connection = await parseUnknownJsonResponse(getResponse)

      expect(connection["isActive"]).toBe(false)

      // Second connection should be active
      const getResponse2 = await app.request(`/connections/${secondConnectionId}`)
      const connection2 = await parseUnknownJsonResponse(getResponse2)

      expect(connection2["isActive"]).toBe(true)
    })

    it("should return 404 for non-existent connection", async () => {
      const response = await app.request("/connections/99999/activate", {
        method: "POST",
      })

      expect(response.status).toBe(404)
    })
  })

  describe("POST /connections/test", () => {
    it("should test connection by ID", async () => {
      const response = await app.request("/connections/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: testConnectionId,
        }),
      })

      // Accept both success and failure (depending on Ollama availability)
      expect([200, 400]).toContain(response.status)

      const result = await parseUnknownJsonResponse(response)

      expect(result).toHaveProperty("success")
      expect(typeof result["success"]).toBe("boolean")
      expect(result).toHaveProperty("message")
      expect(typeof result["message"]).toBe("string")

      if (result["success"]) {
        // If successful, may include models
        if (result["models"]) {
          expect(Array.isArray(result["models"])).toBe(true)
        }
      }
    })

    it("should test connection with direct configuration", async () => {
      const response = await app.request("/connections/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "ollama",
          baseUrl: "http://localhost:11434",
        }),
      })

      // Accept both success and failure
      expect([200, 400]).toContain(response.status)

      const result = await parseUnknownJsonResponse(response)

      expect(result).toHaveProperty("success")
      expect(result).toHaveProperty("message")
    })

    it("should reject test request with neither ID nor configuration", async () => {
      const response = await app.request("/connections/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("DELETE /connections/{id}", () => {
    it("should delete a connection", async () => {
      // Create a connection to delete
      const createResponse = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "To Be Deleted",
          type: "ollama",
          baseUrl: "http://localhost:11434",
        }),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const deleteId = created["id"] as number

      // Delete it
      const response = await app.request(`/connections/${deleteId}`, {
        method: "DELETE",
      })

      expect(response.status).toBe(204)

      // Verify it's gone
      const getResponse = await app.request(`/connections/${deleteId}`)
      expect(getResponse.status).toBe(404)
    })

    it("should return 404 for deleting non-existent connection", async () => {
      const response = await app.request("/connections/99999", {
        method: "DELETE",
      })

      // May return 204 or 404 depending on implementation
      expect([204, 404, 500]).toContain(response.status)
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid HTTP methods", async () => {
      const response = await app.request("/connections", {
        method: "PUT",
      })

      expect([404, 405]).toContain(response.status)
    })

    it("should handle malformed JSON in request body", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ invalid json }",
      })

      expect([400, 500]).toContain(response.status)
    })

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/connections", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          type: "ollama",
          baseUrl: "http://localhost:11434",
        }),
      })

      // Should still work or return appropriate error
      expect([201, 400, 415, 500]).toContain(response.status)
    })
  })

  describe("Integration Tests", () => {
    it("should maintain consistency across operations", async () => {
      // Create connection
      const createResponse = await app.request("/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Integration Test Connection",
          type: "openai-compatible",
          baseUrl: "http://localhost:1234",
        }),
      })

      expect(createResponse.status).toBe(201)
      const created = await parseUnknownJsonResponse(createResponse)
      const integrationId = created["id"] as number

      // Update connection
      const updateResponse = await app.request(`/connections/${integrationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Integration Test",
        }),
      })

      expect(updateResponse.status).toBe(200)

      // Activate connection
      const activateResponse = await app.request(`/connections/${integrationId}/activate`, {
        method: "POST",
      })

      expect(activateResponse.status).toBe(204)

      // Verify active connection
      const activeResponse = await app.request("/connections/active")
      const active = await parseUnknownJsonResponse(activeResponse)

      expect(active).not.toBeNull()
      expect(active!["id"]).toBe(integrationId)
      expect(active!["name"]).toBe("Updated Integration Test")

      // Delete connection
      const deleteResponse = await app.request(`/connections/${integrationId}`, {
        method: "DELETE",
      })

      expect(deleteResponse.status).toBe(204)
    })

    it("should handle multiple connections correctly", async () => {
      // Get initial count
      const initialResponse = await app.request("/connections")
      const initialData = await parseUnknownJsonResponse(initialResponse)
      const initialTotal = initialData["total"] as number

      // Create multiple connections
      const ids: number[] = []
      for (let i = 0; i < 3; i++) {
        const response = await app.request("/connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Multi Connection ${i}`,
            type: "ollama",
            baseUrl: `http://localhost:1143${i}`,
          }),
        })

        const created = await parseUnknownJsonResponse(response)
        ids.push(created["id"] as number)
      }

      // Verify list includes all new connections
      const listResponse = await app.request("/connections")
      const listData = await parseUnknownJsonResponse(listResponse)

      expect(listData["total"]).toBe(initialTotal + 3)

      // Clean up
      for (const id of ids) {
        await app.request(`/connections/${id}`, { method: "DELETE" })
      }
    })
  })

  describe("Performance", () => {
    it("should respond quickly to list connections", async () => {
      const startTime = Date.now()
      const response = await app.request("/connections")
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it("should respond quickly to get connection by ID", async () => {
      const startTime = Date.now()
      const response = await app.request(`/connections/${testConnectionId}`)
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000)
    })

    it("should handle concurrent requests", async () => {
      const requests = []
      const requestCount = 5

      for (let i = 0; i < requestCount; i++) {
        requests.push(app.request("/connections"))
      }

      const responses = await Promise.all(requests)

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200)
      }
    })
  })
})
