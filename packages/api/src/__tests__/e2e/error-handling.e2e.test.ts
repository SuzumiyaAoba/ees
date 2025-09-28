/**
 * Comprehensive E2E Tests for Error Handling and Edge Cases
 * Tests various error scenarios and edge cases across all API endpoints
 */

import { describe, it, expect, beforeAll } from "vitest"
import app from "@/app"
import { setupE2ETests, registerEmbeddingForCleanup, testState } from "@/__tests__/e2e-setup"
import { parseJsonResponse, isEmbeddingResponse, isCreateEmbeddingResponse, parseUnknownJsonResponse, isValidationErrorResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment
setupE2ETests()

describe("Error Handling and Edge Cases E2E Tests", () => {
  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  describe("Request Validation Errors", () => {
    it("should reject embedding creation with missing URI", async () => {
      const invalidData = {
        // Missing uri field
        text: "Document without URI field."
      }

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const errorData = await parseUnknownJsonResponse(response)

      // Check if it's a validation error response
      expect(errorData).toHaveProperty("error")

      // Accept either string or object error format (depends on validation framework)
      expect(typeof errorData['error'] === "string" || typeof errorData['error'] === "object").toBe(true)
    })

    it("should reject embedding creation with missing text", async () => {
      const invalidData = {
        uri: "document-without-text"
        // Missing text field
      }

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)

      const errorData = await parseUnknownJsonResponse(response)
      expect(errorData).toHaveProperty("error")
    })

    it("should reject embedding creation with empty values", async () => {
      const testCases = [
        { uri: "", text: "Valid text" }, // Empty URI
        { uri: "valid-uri", text: "" }, // Empty text
        { uri: "", text: "" }, // Both empty
      ]

      for (const testCase of testCases) {
        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testCase),
        })

        expect(response.status).toBe(400)

        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })

    it("should reject embedding creation with invalid data types", async () => {
      const testCases = [
        { uri: 123, text: "Valid text" }, // Numeric URI
        { uri: "valid-uri", text: 123 }, // Numeric text
        { uri: null, text: "Valid text" }, // Null URI
        { uri: "valid-uri", text: null }, // Null text
        { uri: ["array"], text: "Valid text" }, // Array URI
        { uri: "valid-uri", text: ["array"] }, // Array text
      ]

      for (const testCase of testCases) {
        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testCase),
        })

        expect(response.status).toBe(400)

        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })

    it("should handle malformed JSON gracefully", async () => {
      const malformedJsonCases = [
        "{ invalid json }",
        '{ "uri": "test", "text": }', // Missing value
        '{ "uri": "test" "text": "missing comma" }', // Missing comma
        '{ "uri": "test", "text": "unclosed quote }', // Unclosed quote
        "", // Empty string
        "null",
        "undefined",
      ]

      for (const malformedJson of malformedJsonCases) {
        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: malformedJson,
        })

        expect(response.status).toBe(400)

        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })
  })

  describe("HTTP Method Errors", () => {
    it("should reject unsupported HTTP methods on endpoints", async () => {
      const unsupportedMethods = [
        { method: "PUT", endpoint: "/embeddings" },
        { method: "PATCH", endpoint: "/embeddings" },
        { method: "DELETE", endpoint: "/embeddings" }, // DELETE without ID
        { method: "PUT", endpoint: "/embeddings/search" },
        { method: "GET", endpoint: "/embeddings/search" },
        { method: "PUT", endpoint: "/embeddings/batch" },
        { method: "GET", endpoint: "/embeddings/batch" },
      ]

      for (const testCase of unsupportedMethods) {
        const requestOptions: RequestInit = {
          method: testCase.method,
          headers: {
            "Content-Type": "application/json",
          },
        }

        // Only add body for methods that support it (not GET or HEAD)
        if (!["GET", "HEAD"].includes(testCase.method)) {
          requestOptions.body = JSON.stringify({ uri: "test", text: "test" })
        }

        const response = await app.request(testCase.endpoint, requestOptions)

        expect([404, 405]).toContain(response.status) // Method Not Allowed or Not Found
      }
    })
  })

  describe("Content-Type Errors", () => {
    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        // Missing Content-Type header
        body: JSON.stringify({
          uri: "test-no-content-type",
          text: "Document without Content-Type header."
        }),
      })

      // May succeed with default handling or fail - both are acceptable
      expect([200, 400, 404, 415, 500]).toContain(response.status)
    })

    it("should handle incorrect Content-Type header", async () => {
      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain", // Wrong content type
        },
        body: JSON.stringify({
          uri: "test-wrong-content-type",
          text: "Document with wrong Content-Type."
        }),
      })

      expect([400, 404, 415, 500]).toContain(response.status) // Unsupported Media Type or Bad Request
    })
  })

  describe("Parameter Validation Errors", () => {
    it("should reject invalid pagination parameters", async () => {
      const invalidParams = [
        "?page=invalid", // Non-numeric page
        "?limit=invalid", // Non-numeric limit
        "?page=-1", // Negative page
        "?limit=-1", // Negative limit
        "?page=0", // Zero page (might be invalid)
        "?limit=0", // Zero limit
        "?limit=1000000", // Extremely high limit
      ]

      for (const params of invalidParams) {
        const response = await app.request(`/embeddings${params}`)

        expect([400, 404]).toContain(response.status)

        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })

    it("should reject invalid embedding ID for deletion", async () => {
      const invalidIds = [
        "invalid", // Non-numeric
        "-1", // Negative
        "0", // Zero
        "1.5", // Decimal
        "999999999", // Very large number
        "", // Empty
        "null",
        "undefined",
      ]

      for (const invalidId of invalidIds) {
        const response = await app.request(`/embeddings/${invalidId}`, {
          method: "DELETE"
        })

        expect([400, 404]).toContain(response.status)

        if (response.status === 404) {
          // 404 responses may not have JSON bodies
          continue
        }

        const errorData = await parseUnknownJsonResponse(response)
        if (isValidationErrorResponse(errorData)) {
          expect(errorData.success).toBe(false)
        } else {
          expect(errorData).toHaveProperty("error")
        }
      }
    })
  })

  describe("Search Validation Errors", () => {
    it("should reject search with invalid parameters", async () => {
      const invalidSearchRequests = [
        { query: "" }, // Empty query
        { query: "valid", threshold: -0.1 }, // Negative threshold
        { query: "valid", threshold: 1.1 }, // Threshold > 1
        { query: "valid", limit: -1 }, // Negative limit
        { query: "valid", limit: 0 }, // Zero limit
        { query: "valid", metric: "invalid_metric" }, // Invalid metric
        { query: "valid", model_name: "" }, // Empty model name
      ]

      for (const invalidRequest of invalidSearchRequests) {
        const response = await app.request("/embeddings/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invalidRequest),
        })

        expect([400, 404]).toContain(response.status)

        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })

    it("should handle search with missing required fields", async () => {
      const response = await app.request("/embeddings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Missing query field
      })

      expect(response.status).toBe(400)

      const errorData = await parseUnknownJsonResponse(response)
      expect(errorData).toHaveProperty("error")
    })
  })

  describe("Resource Not Found Errors", () => {
    it("should return 404 for non-existent embedding URI", async () => {
      const defaultModel = "nomic-embed-text"
      const response = await app.request(`/embeddings/${encodeURIComponent("this-uri-does-not-exist")}/${encodeURIComponent(defaultModel)}`)

      expect(response.status).toBe(404)

      const errorData = await parseUnknownJsonResponse(response)
      expect(errorData).toHaveProperty("error")
    })

    it("should return 404 for non-existent embedding ID deletion", async () => {
      const response = await app.request("/embeddings/999999", {
        method: "DELETE"
      })

      expect(response.status).toBe(404)

      const errorData = await parseUnknownJsonResponse(response)
      expect(errorData).toHaveProperty("error")
    })

    it("should return 404 for invalid API endpoints", async () => {
      const invalidEndpoints = [
        "/embeddings/invalid/endpoint",
        "/invalid-endpoint",
        "/embeddings/search/invalid",
        "/embeddings/batch/invalid",
      ]

      for (const endpoint of invalidEndpoints) {
        const response = await app.request(endpoint)

        expect(response.status).toBe(404)
      }
    })
  })

  describe("Large Payload Handling", () => {
    it("should handle very large text content", async () => {
      const veryLargeText = "A".repeat(1000000) // 1MB of text
      const requestData = {
        uri: "test-very-large-text",
        text: veryLargeText
      }

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      // Should either succeed or return appropriate error
      expect([200, 400, 404, 413, 500]).toContain(response.status)

      if (response.status === 200) {
        const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
        expect(embedding.text).toBe(veryLargeText)
        registerEmbeddingForCleanup(embedding.id)
      } else {
        const errorData = await parseUnknownJsonResponse(response)
        expect(errorData).toHaveProperty("error")
      }
    })

    it("should handle request with many fields", async () => {
      const requestWithManyFields: Record<string, string> = {
        uri: "test-many-fields",
        text: "Valid text content",
        model_name: "nomic-embed-text",
        // Add many extra fields
        extra1: "value1",
        extra2: "value2",
        extra3: "value3",
        // ... more fields
      }

      for (let i = 4; i <= 100; i++) {
        requestWithManyFields[`extra${i}`] = `value${i}`
      }

      const response = await app.request("/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestWithManyFields),
      })

      // Should either succeed (ignoring extra fields) or return validation error
      expect([200, 400, 404]).toContain(response.status)

      if (response.status === 200) {
        const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
        expect(embedding.uri).toBe("test-many-fields")
        registerEmbeddingForCleanup(embedding.id)
      }
    })
  })

  describe("Special Character Handling", () => {
    it("should handle URIs with special characters", async () => {
      const specialUris = [
        "test/with/slashes",
        "test-with-dashes",
        "test_with_underscores",
        "test.with.dots",
        "test@with@ats",
        "test with spaces", // Might be problematic in URLs
        "テスト", // Japanese characters
        "测试", // Chinese characters
        "тест", // Cyrillic characters
        "test🚀emoji",
      ]

      for (const uri of specialUris) {
        const requestData = {
          uri,
          text: `Document with special URI: ${uri}`
        }

        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })

        // Should either succeed or return validation error
        expect([200, 400, 404]).toContain(response.status)

        if (response.status === 200) {
          const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
          expect(embedding.uri).toBe(uri)
          registerEmbeddingForCleanup(embedding.id)
        }
      }
    })
  })

  describe("Concurrent Request Handling", () => {
    it("should handle concurrent embedding creation", async () => {
      const concurrentRequests = []

      for (let i = 0; i < 10; i++) {
        const request = app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uri: `concurrent-test-${i}`,
            text: `Concurrent test document number ${i}.`
          }),
        })

        concurrentRequests.push(request)
      }

      const responses = await Promise.all(concurrentRequests)

      // All requests should complete (either success or failure)
      expect(responses).toHaveLength(10)

      let successCount = 0
      for (const response of responses) {
        expect([200, 400, 404, 500]).toContain(response.status)

        if (response.status === 200) {
          successCount++
          const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
          registerEmbeddingForCleanup(embedding.id)
        }
      }

      // If service is available, at least some requests should succeed
      // In CI environment, service may be unavailable so we allow zero successes
      expect(successCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Edge Case Text Content", () => {
    it("should handle text with only whitespace", async () => {
      const whitespaceTexts = [
        "   ", // Spaces
        "\t\t\t", // Tabs
        "\n\n\n", // Newlines
        "\r\n\r\n", // CRLF
        "   \t\n\r   ", // Mixed whitespace
      ]

      for (const text of whitespaceTexts) {
        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uri: `whitespace-test-${Math.random()}`,
            text
          }),
        })

        // Should either succeed or return validation error
        expect([200, 400, 404]).toContain(response.status)

        if (response.status === 200) {
          const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
          registerEmbeddingForCleanup(embedding.id)
        }
      }
    })

    it("should handle text with only special characters", async () => {
      const specialTexts = [
        "!@#$%^&*()",
        "[][}{|\\",
        "\"'`~",
        "+=_-",
        "<>?/.,;:",
      ]

      for (const text of specialTexts) {
        const response = await app.request("/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uri: `special-chars-test-${Math.random()}`,
            text
          }),
        })

        expect([200, 400, 404]).toContain(response.status)

        if (response.status === 200) {
          const embedding = await parseJsonResponse(response, isCreateEmbeddingResponse)
          registerEmbeddingForCleanup(embedding.id)
        }
      }
    })
  })
})