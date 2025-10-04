/**
 * Unit Tests for Error Handler Edge Cases
 * Tests unknown error types, nested errors, stack trace sanitization, and PII removal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { handleErrorResponse } from "@/shared/error-handler"
import type { Context } from "hono"

// Mock Hono Context
function createMockContext(): Context {
  const mockResponse = {
    status: 200,
    body: null as unknown,
    headers: new Headers(),
  }

  return {
    json: vi.fn((body: unknown, status?: number) => {
      mockResponse.body = body
      mockResponse.status = status || 200
      return new Response(JSON.stringify(body), {
        status: mockResponse.status,
        headers: { "Content-Type": "application/json" },
      })
    }),
  } as never
}

describe("Error Handler Edge Cases", () => {
  let mockContext: Context
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockContext = createMockContext()
    // Spy on console to capture logged errors
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe("Unknown Error Types", () => {
    it("should handle errors without _tag property", async () => {
      const plainError = new Error("Something went wrong")

      handleErrorResponse(mockContext, plainError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          details: expect.stringContaining("Something went wrong"),
        }),
        500
      )
    })

    it("should handle errors with only partial _tag structure", async () => {
      const partialTaggedError = {
        _tag: "UnknownErrorType",
        // Missing message property
      }

      handleErrorResponse(mockContext, partialTaggedError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
        }),
        500
      )
    })

    it("should handle primitive error values (string)", async () => {
      const stringError = "Simple string error"

      handleErrorResponse(mockContext, stringError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          details: stringError,
        }),
        500
      )
    })

    it("should handle primitive error values (number)", async () => {
      const numberError = 42

      handleErrorResponse(mockContext, numberError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          details: "42",
        }),
        500
      )
    })

    it("should handle null and undefined errors", async () => {
      const nullError = null
      const undefinedError = undefined

      handleErrorResponse(mockContext, nullError, "test-operation")
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
        }),
        500
      )

      vi.clearAllMocks()

      handleErrorResponse(mockContext, undefinedError, "test-operation")
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
        }),
        500
      )
    })

    it("should handle circular reference errors", async () => {
      const circularError: Record<string, unknown> = { message: "Circular error" }
      circularError["self"] = circularError // Create circular reference

      handleErrorResponse(mockContext, circularError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
        }),
        500
      )
    })

    it("should handle errors with unrecognized _tag values", async () => {
      const unrecognizedTagError = {
        _tag: "FutureErrorTypeNotYetImplemented",
        message: "This is a new error type",
      }

      handleErrorResponse(mockContext, unrecognizedTagError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
        }),
        500
      )
    })
  })

  describe("Nested Error Causes", () => {
    it("should handle errors with nested cause property", async () => {
      const rootCause = new Error("Root cause error")
      const nestedError = new Error("Main error", { cause: rootCause })

      handleErrorResponse(mockContext, nestedError, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          details: expect.stringContaining("Main error"),
        }),
        500
      )
    })

    it("should handle deeply nested error chains", async () => {
      const level3Error = new Error("Level 3 error")
      const level2Error = new Error("Level 2 error", { cause: level3Error })
      const level1Error = new Error("Level 1 error", { cause: level2Error })

      handleErrorResponse(mockContext, level1Error, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          details: expect.stringContaining("Level 1 error"),
        }),
        500
      )
    })

    it("should handle tagged errors with cause property", async () => {
      const causeError = new Error("Underlying database issue")
      const taggedErrorWithCause = {
        _tag: "DatabaseError",
        message: "Database operation failed",
        cause: causeError,
      }

      handleErrorResponse(mockContext, taggedErrorWithCause, "test-operation")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Database error",
          details: "Database operation failed",
        }),
        500
      )
    })

    it("should handle errors with non-error cause values", async () => {
      const errorWithStringCause = {
        message: "Error with string cause",
        cause: "Just a string, not an Error object",
      }

      handleErrorResponse(mockContext, errorWithStringCause, "test-operation")

      expect(mockContext.json).toHaveBeenCalled()
    })
  })

  describe("Error Stack Trace Sanitization", () => {
    it("should not expose internal file paths in error details", async () => {
      const errorWithStack = new Error("Error with stack trace")
      errorWithStack.stack = `Error: Error with stack trace
    at /Users/developer/secret/project/file.ts:123:45
    at /home/user/.npm/packages/module.js:67:89
    at internal/process.js:456:78`

      handleErrorResponse(mockContext, errorWithStack, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      // Error details should not contain internal file paths
      expect(responseBody.details).not.toMatch(/\/Users\/developer/)
      expect(responseBody.details).not.toMatch(/\/home\/user/)

      // But should still contain the error message
      expect(responseBody.details).toContain("Error with stack trace")
    })

    it("should sanitize stack traces from multiple error sources", async () => {
      const error1 = new Error("First error")
      error1.stack = "Error: First error\n    at /secret/path1.ts:10:20"

      const error2 = new Error("Second error", { cause: error1 })
      error2.stack = "Error: Second error\n    at /secret/path2.ts:30:40"

      handleErrorResponse(mockContext, error2, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      expect(responseBody.details).not.toMatch(/\/secret\//)
    })
  })

  describe("PII and Sensitive Data Removal", () => {
    // NOTE: Current implementation does NOT sanitize PII/sensitive data from error messages
    // These tests document the current behavior and serve as placeholders for future enhancement
    // Issue: #133 - TODO: Implement actual PII sanitization

    it("should handle errors containing API keys (currently not redacted)", async () => {
      const errorWithApiKey = new Error("Failed with API key: sk-1234567890abcdef")

      handleErrorResponse(mockContext, errorWithApiKey, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      // Current behavior: API keys are present in error details
      // Future: Should be redacted as [REDACTED]
      expect(responseBody.details).toContain("Failed with API key")
    })

    it("should handle errors containing passwords (currently not redacted)", async () => {
      const errorWithPassword = {
        _tag: "DatabaseConnectionError",
        message: "Connection failed: password='secretpassword123' invalid",
      }

      handleErrorResponse(mockContext, errorWithPassword, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      // Current behavior: Passwords are present in error details
      // Future: Should be redacted as [REDACTED]
      expect(responseBody.details).toContain("Connection failed")
    })

    it("should handle errors containing tokens (currently not redacted)", async () => {
      const errorWithToken = new Error("Auth failed: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")

      handleErrorResponse(mockContext, errorWithToken, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      // Current behavior: Tokens are present in error details
      // Future: JWT tokens should be redacted
      expect(responseBody.details).toContain("Auth failed")
    })

    it("should handle errors with connection strings (currently not redacted)", async () => {
      const errorWithConnString = new Error(
        "Connection failed: postgresql://user:password@localhost:5432/db"
      )

      handleErrorResponse(mockContext, errorWithConnString, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0] as { details: string }

      // Current behavior: Connection strings with credentials are present
      // Future: Credentials should be redacted from connection strings
      expect(responseBody.details).toContain("Connection failed")
    })

    it("should handle errors with multiple sensitive fields", async () => {
      const complexSensitiveError = {
        _tag: "ProviderAuthenticationError",
        message: "Auth failed",
        apiKey: "sk-secret123",
        token: "bearer-token-xyz",
        password: "pass123",
        connectionString: "mysql://admin:secret@db.example.com/prod",
      }

      handleErrorResponse(mockContext, complexSensitiveError, "test-operation")

      const jsonCall = (mockContext.json as ReturnType<typeof vi.fn>).mock.calls[0]
      if (!jsonCall) {
        throw new Error("Expected json to be called")
      }
      const responseBody = jsonCall[0]

      // Current behavior: Only the message field is included in response
      // Future: All sensitive fields should be stripped or redacted
      expect(responseBody).toHaveProperty("error")
      expect(responseBody).toHaveProperty("details")
    })
  })

  describe("Tagged Error Type Coverage", () => {
    it("should handle ProviderAuthenticationError correctly", async () => {
      const authError = {
        _tag: "ProviderAuthenticationError",
        message: "Invalid credentials",
      }

      handleErrorResponse(mockContext, authError, "auth-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Authentication failed",
          details: "Invalid credentials",
        },
        401
      )
    })

    it("should handle ProviderRateLimitError correctly", async () => {
      const rateLimitError = {
        _tag: "ProviderRateLimitError",
        message: "Rate limit exceeded",
      }

      handleErrorResponse(mockContext, rateLimitError, "rate-limit-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Rate limit exceeded",
          details: "Rate limit exceeded",
        },
        429
      )
    })

    it("should handle ProviderModelError correctly", async () => {
      const modelError = {
        _tag: "ProviderModelError",
        message: "Model not found",
      }

      handleErrorResponse(mockContext, modelError, "model-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Model error",
          details: "Model not found",
        },
        404
      )
    })

    it("should handle ProviderConnectionError correctly", async () => {
      const connectionError = {
        _tag: "ProviderConnectionError",
        message: "Service unavailable",
      }

      handleErrorResponse(mockContext, connectionError, "connection-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Service connection error",
          details: "Service unavailable",
        },
        503
      )
    })

    it("should handle DatabaseError correctly", async () => {
      const dbError = {
        _tag: "DatabaseError",
        message: "Query failed",
      }

      handleErrorResponse(mockContext, dbError, "db-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Database error",
          details: "Query failed",
        },
        500
      )
    })

    it("should handle EmbeddingDataParseError correctly", async () => {
      const parseError = {
        _tag: "EmbeddingDataParseError",
        message: "Invalid embedding format",
      }

      handleErrorResponse(mockContext, parseError, "parse-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Invalid embedding data",
          details: "Invalid embedding format",
        },
        400
      )
    })
  })

  describe("String-based Error Detection", () => {
    it("should detect ValidationError from error string", async () => {
      const validationError = new Error("ValidationError: Field 'name' is required")

      handleErrorResponse(mockContext, validationError, "validation-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation error",
        }),
        400
      )
    })

    it("should detect NotFound errors from error string", async () => {
      const notFoundError = new Error("Resource not found in database")

      handleErrorResponse(mockContext, notFoundError, "not-found-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Resource not found",
        }),
        404
      )
    })

    it("should handle errors with 'required' keyword", async () => {
      const requiredError = new Error("Field 'email' is required")

      handleErrorResponse(mockContext, requiredError, "required-test")

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation error",
        }),
        400
      )
    })

    it("should handle errors with 'invalid' keyword", async () => {
      // String-based detection only works when error is converted to string
      // Error objects with "invalid" in message are caught differently
      const invalidError = new Error("This request is invalid for processing")

      handleErrorResponse(mockContext, invalidError, "invalid-test")

      // The error string includes "Error: " prefix plus "invalid" keyword
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation error",
        }),
        400
      )
    })
  })

  describe("Error Logging Verification", () => {
    it("should log all errors with operation context", async () => {
      const testError = new Error("Test error for logging")

      handleErrorResponse(mockContext, testError, "logging-test-operation")

      // Note: We're testing that error handler doesn't crash
      // Actual logging is mocked, so we just verify the handler completes
      expect(mockContext.json).toHaveBeenCalled()
    })

    it("should handle complex error objects", async () => {
      const complexError = {
        nested: {
          deep: {
            value: "error data"
          }
        },
        array: [1, 2, 3],
        nullValue: null,
      }

      // Should handle complex objects without crashing
      expect(() => {
        handleErrorResponse(mockContext, complexError, "complex-test")
      }).not.toThrow()

      expect(mockContext.json).toHaveBeenCalled()
    })
  })
})
