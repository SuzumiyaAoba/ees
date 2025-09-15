import { Data } from "effect"
import { describe, expect, it } from "vitest"
import {
  DatabaseConnectionError,
  DatabaseError,
  DatabaseQueryError,
} from "../errors/database"
import {
  OllamaConnectionError,
  OllamaError,
  OllamaModelError,
} from "../errors/ollama"

describe("Error Classes", () => {
  describe("DatabaseError", () => {
    it("should create DatabaseError with message", () => {
      const error = new DatabaseError({
        message: "Test database error",
      })

      expect(error).toBeInstanceOf(DatabaseError)
      expect(error).toBeInstanceOf(Data.TaggedError)
      expect(error._tag).toBe("DatabaseError")
      expect(error.message).toBe("Test database error")
      expect(error.cause).toBeUndefined()
    })

    it("should create DatabaseError with message and cause", () => {
      const cause = new Error("Original error")
      const error = new DatabaseError({
        message: "Wrapped database error",
        cause,
      })

      expect(error.message).toBe("Wrapped database error")
      expect(error.cause).toBe(cause)
    })

    it("should be serializable", () => {
      const error = new DatabaseError({
        message: "Serialization test",
        cause: "simple cause",
      })

      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)

      expect(parsed._tag).toBe("DatabaseError")
      expect(parsed.message).toBe("Serialization test")
      expect(parsed.cause).toBe("simple cause")
    })

    it("should handle undefined message", () => {
      const error = new DatabaseError({
        message: undefined as any,
      })

      expect(error.message).toBeUndefined()
    })

    it("should handle null cause", () => {
      const error = new DatabaseError({
        message: "Test",
        cause: null,
      })

      expect(error.cause).toBeNull()
    })

    it("should handle complex cause objects", () => {
      const complexCause = {
        code: "DB_ERROR",
        details: { table: "embeddings", operation: "insert" },
        timestamp: new Date().toISOString(),
      }

      const error = new DatabaseError({
        message: "Complex error",
        cause: complexCause,
      })

      expect(error.cause).toEqual(complexCause)
    })
  })

  describe("DatabaseConnectionError", () => {
    it("should create DatabaseConnectionError with correct tag", () => {
      const error = new DatabaseConnectionError({
        message: "Connection failed",
      })

      expect(error).toBeInstanceOf(DatabaseConnectionError)
      expect(error).toBeInstanceOf(Data.TaggedError)
      expect(error._tag).toBe("DatabaseConnectionError")
      expect(error.message).toBe("Connection failed")
    })

    it("should handle connection-specific errors", () => {
      const connectionError = new Error("ECONNREFUSED")
      const error = new DatabaseConnectionError({
        message: "Failed to connect to database",
        cause: connectionError,
      })

      expect(error.message).toBe("Failed to connect to database")
      expect(error.cause).toBe(connectionError)
    })

    it("should handle timeout scenarios", () => {
      const timeoutError = new Error("Connection timeout after 30s")
      const error = new DatabaseConnectionError({
        message: "Database connection timeout",
        cause: timeoutError,
      })

      expect(error.cause).toBe(timeoutError)
    })

    it("should handle authentication failures", () => {
      const authError = { code: "AUTH_FAILED", reason: "Invalid credentials" }
      const error = new DatabaseConnectionError({
        message: "Authentication failed",
        cause: authError,
      })

      expect(error.cause).toEqual(authError)
    })

    it("should be distinguishable from other database errors", () => {
      const connectionError = new DatabaseConnectionError({
        message: "Connection error",
      })
      const generalError = new DatabaseError({
        message: "General error",
      })

      expect(connectionError._tag).toBe("DatabaseConnectionError")
      expect(generalError._tag).toBe("DatabaseError")
      expect(connectionError._tag).not.toBe(generalError._tag)
    })
  })

  describe("DatabaseQueryError", () => {
    it("should create DatabaseQueryError with query information", () => {
      const error = new DatabaseQueryError({
        message: "SQL syntax error",
        query: "SELECT * FROM invalid_table",
      })

      expect(error).toBeInstanceOf(DatabaseQueryError)
      expect(error._tag).toBe("DatabaseQueryError")
      expect(error.message).toBe("SQL syntax error")
      expect(error.query).toBe("SELECT * FROM invalid_table")
    })

    it("should handle query without explicit query field", () => {
      const error = new DatabaseQueryError({
        message: "Query failed",
      })

      expect(error.message).toBe("Query failed")
      expect(error.query).toBeUndefined()
    })

    it("should handle complex query objects", () => {
      const complexQuery = {
        sql: "INSERT INTO embeddings VALUES (?, ?, ?)",
        params: ["uri", "text", "model"],
        timeout: 5000,
      }

      const error = new DatabaseQueryError({
        message: "Insert failed",
        query: JSON.stringify(complexQuery),
        cause: new Error("Constraint violation"),
      })

      expect(error.query).toBe(JSON.stringify(complexQuery))
      expect(error.cause).toBeInstanceOf(Error)
    })

    it("should handle very long queries", () => {
      const longQuery =
        "SELECT * FROM embeddings WHERE " + "condition ".repeat(1000)
      const error = new DatabaseQueryError({
        message: "Query too complex",
        query: longQuery,
      })

      expect(error.query).toBe(longQuery)
      expect(error.query.length).toBeGreaterThan(10000)
    })

    it("should handle queries with special characters", () => {
      const specialQuery =
        "SELECT * FROM embeddings WHERE text LIKE '%こんにちは%' AND uri = 'file://test@#$.txt'"
      const error = new DatabaseQueryError({
        message: "Query with special chars failed",
        query: specialQuery,
      })

      expect(error.query).toBe(specialQuery)
    })

    it("should handle empty query strings", () => {
      const error = new DatabaseQueryError({
        message: "Empty query",
        query: "",
      })

      expect(error.query).toBe("")
    })
  })

  describe("OllamaError", () => {
    it("should create OllamaError with message", () => {
      const error = new OllamaError({
        message: "Ollama service error",
      })

      expect(error).toBeInstanceOf(OllamaError)
      expect(error).toBeInstanceOf(Data.TaggedError)
      expect(error._tag).toBe("OllamaError")
      expect(error.message).toBe("Ollama service error")
    })

    it("should handle general Ollama service failures", () => {
      const serviceError = new Error("Service unavailable")
      const error = new OllamaError({
        message: "Ollama service down",
        cause: serviceError,
      })

      expect(error.cause).toBe(serviceError)
    })

    it("should be serializable", () => {
      const error = new OllamaError({
        message: "Serialization test",
        cause: "HTTP 500",
      })

      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)

      expect(parsed._tag).toBe("OllamaError")
      expect(parsed.message).toBe("Serialization test")
    })
  })

  describe("OllamaConnectionError", () => {
    it("should create OllamaConnectionError with correct tag", () => {
      const error = new OllamaConnectionError({
        message: "Cannot connect to Ollama",
      })

      expect(error).toBeInstanceOf(OllamaConnectionError)
      expect(error._tag).toBe("OllamaConnectionError")
      expect(error.message).toBe("Cannot connect to Ollama")
    })

    it("should handle network connection failures", () => {
      const networkError = new Error("ENOTFOUND localhost")
      const error = new OllamaConnectionError({
        message: "Ollama server not reachable",
        cause: networkError,
      })

      expect(error.cause).toBe(networkError)
    })

    it("should handle port connection issues", () => {
      const portError = { code: "ECONNREFUSED", port: 11434 }
      const error = new OllamaConnectionError({
        message: "Cannot connect to Ollama on port 11434",
        cause: portError,
      })

      expect(error.cause).toEqual(portError)
    })

    it("should handle SSL/TLS connection errors", () => {
      const sslError = new Error("SSL handshake failed")
      const error = new OllamaConnectionError({
        message: "HTTPS connection to Ollama failed",
        cause: sslError,
      })

      expect(error.cause).toBe(sslError)
    })

    it("should be distinguishable from model errors", () => {
      const connectionError = new OllamaConnectionError({
        message: "Connection error",
      })
      const modelError = new OllamaModelError({
        message: "Model error",
        modelName: "test-model",
      })

      expect(connectionError._tag).toBe("OllamaConnectionError")
      expect(modelError._tag).toBe("OllamaModelError")
      expect(connectionError._tag).not.toBe(modelError._tag)
    })
  })

  describe("OllamaModelError", () => {
    it("should create OllamaModelError with model name", () => {
      const error = new OllamaModelError({
        message: "Model not found",
        modelName: "nonexistent-model",
      })

      expect(error).toBeInstanceOf(OllamaModelError)
      expect(error._tag).toBe("OllamaModelError")
      expect(error.message).toBe("Model not found")
      expect(error.modelName).toBe("nonexistent-model")
    })

    it("should handle model loading failures", () => {
      const loadError = new Error("Insufficient memory")
      const error = new OllamaModelError({
        message: "Failed to load model",
        modelName: "large-model:70b",
        cause: loadError,
      })

      expect(error.modelName).toBe("large-model:70b")
      expect(error.cause).toBe(loadError)
    })

    it("should handle model not found scenarios", () => {
      const error = new OllamaModelError({
        message: "Model does not exist",
        modelName: "invalid-model:latest",
      })

      expect(error.modelName).toBe("invalid-model:latest")
    })

    it("should handle model download failures", () => {
      const downloadError = {
        code: "DOWNLOAD_FAILED",
        url: "https://ollama.ai/models/model.bin",
        reason: "Network timeout",
      }
      const error = new OllamaModelError({
        message: "Model download failed",
        modelName: "remote-model:v1",
        cause: downloadError,
      })

      expect(error.modelName).toBe("remote-model:v1")
      expect(error.cause).toEqual(downloadError)
    })

    it("should handle model execution errors", () => {
      const executionError = new Error("Model inference failed")
      const error = new OllamaModelError({
        message: "Model execution error",
        modelName: "embeddinggemma:300m",
        cause: executionError,
      })

      expect(error.modelName).toBe("embeddinggemma:300m")
      expect(error.cause).toBe(executionError)
    })

    it("should handle empty or undefined model names", () => {
      const error1 = new OllamaModelError({
        message: "No model specified",
        modelName: "",
      })

      const error2 = new OllamaModelError({
        message: "Undefined model",
        modelName: undefined as any,
      })

      expect(error1.modelName).toBe("")
      expect(error2.modelName).toBeUndefined()
    })

    it("should handle special characters in model names", () => {
      const specialModelName = "model-with-special@chars:v1.0"
      const error = new OllamaModelError({
        message: "Special model error",
        modelName: specialModelName,
      })

      expect(error.modelName).toBe(specialModelName)
    })

    it("should be serializable with model name", () => {
      const error = new OllamaModelError({
        message: "Serialization test",
        modelName: "test-model:latest",
        cause: "Model corrupted",
      })

      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)

      expect(parsed._tag).toBe("OllamaModelError")
      expect(parsed.message).toBe("Serialization test")
      expect(parsed.modelName).toBe("test-model:latest")
      expect(parsed.cause).toBe("Model corrupted")
    })
  })

  describe("Error inheritance and type safety", () => {
    it("should maintain proper inheritance hierarchy", () => {
      const dbError = new DatabaseError({ message: "DB error" })
      const dbConnError = new DatabaseConnectionError({ message: "Conn error" })
      const dbQueryError = new DatabaseQueryError({ message: "Query error" })
      const ollamaError = new OllamaError({ message: "Ollama error" })
      const ollamaConnError = new OllamaConnectionError({
        message: "Ollama conn error",
      })
      const ollamaModelError = new OllamaModelError({
        message: "Model error",
        modelName: "test",
      })

      // All should be instances of Data.TaggedError
      expect(dbError).toBeInstanceOf(Data.TaggedError)
      expect(dbConnError).toBeInstanceOf(Data.TaggedError)
      expect(dbQueryError).toBeInstanceOf(Data.TaggedError)
      expect(ollamaError).toBeInstanceOf(Data.TaggedError)
      expect(ollamaConnError).toBeInstanceOf(Data.TaggedError)
      expect(ollamaModelError).toBeInstanceOf(Data.TaggedError)

      // Each should be instance of their specific class
      expect(dbError).toBeInstanceOf(DatabaseError)
      expect(dbConnError).toBeInstanceOf(DatabaseConnectionError)
      expect(dbQueryError).toBeInstanceOf(DatabaseQueryError)
      expect(ollamaError).toBeInstanceOf(OllamaError)
      expect(ollamaConnError).toBeInstanceOf(OllamaConnectionError)
      expect(ollamaModelError).toBeInstanceOf(OllamaModelError)
    })

    it("should have unique tags for each error type", () => {
      const errors = [
        new DatabaseError({ message: "test" }),
        new DatabaseConnectionError({ message: "test" }),
        new DatabaseQueryError({ message: "test" }),
        new OllamaError({ message: "test" }),
        new OllamaConnectionError({ message: "test" }),
        new OllamaModelError({ message: "test", modelName: "test" }),
      ]

      const tags = errors.map((error) => error._tag)
      const uniqueTags = new Set(tags)

      expect(uniqueTags.size).toBe(tags.length)
      expect(uniqueTags).toEqual(
        new Set([
          "DatabaseError",
          "DatabaseConnectionError",
          "DatabaseQueryError",
          "OllamaError",
          "OllamaConnectionError",
          "OllamaModelError",
        ])
      )
    })

    it("should support pattern matching on error types", () => {
      const errors: Array<
        | DatabaseError
        | DatabaseConnectionError
        | DatabaseQueryError
        | OllamaError
        | OllamaConnectionError
        | OllamaModelError
      > = [
        new DatabaseError({ message: "db" }),
        new OllamaModelError({ message: "model", modelName: "test" }),
        new DatabaseConnectionError({ message: "db conn" }),
      ]

      const results = errors.map((error) => {
        switch (error._tag) {
          case "DatabaseError":
            return "database"
          case "DatabaseConnectionError":
            return "database-connection"
          case "DatabaseQueryError":
            return "database-query"
          case "OllamaError":
            return "ollama"
          case "OllamaConnectionError":
            return "ollama-connection"
          case "OllamaModelError":
            return "ollama-model"
          default:
            return "unknown"
        }
      })

      expect(results).toEqual([
        "database",
        "ollama-model",
        "database-connection",
      ])
    })

    it("should handle Error instanceof checks", () => {
      const dbError = new DatabaseError({ message: "test" })
      const nativeError = new Error("native")

      // TaggedErrors should not be instances of native Error
      expect(dbError).not.toBeInstanceOf(Error)
      expect(nativeError).toBeInstanceOf(Error)
    })

    it("should handle nested error causes correctly", () => {
      const rootCause = new Error("Root cause")
      const intermediateCause = new DatabaseError({
        message: "Intermediate",
        cause: rootCause,
      })
      const topLevel = new OllamaModelError({
        message: "Top level",
        modelName: "test-model",
        cause: intermediateCause,
      })

      expect(topLevel.cause).toBe(intermediateCause)
      expect(intermediateCause.cause).toBe(rootCause)
    })
  })

  describe("Error message formatting and debugging", () => {
    it("should provide meaningful error messages", () => {
      const dbError = new DatabaseError({
        message: "Failed to connect to database at localhost:5432",
      })
      const modelError = new OllamaModelError({
        message:
          "Model 'embeddinggemma:300m' failed to generate embedding for input text",
        modelName: "embeddinggemma:300m",
      })

      expect(dbError.message).toContain("database")
      expect(dbError.message).toContain("localhost:5432")
      expect(modelError.message).toContain("embeddinggemma:300m")
      expect(modelError.message).toContain("embedding")
    })

    it("should handle toString() method", () => {
      const error = new DatabaseQueryError({
        message: "SELECT query failed",
        query: "SELECT * FROM embeddings",
      })

      const stringified = error.toString()
      expect(typeof stringified).toBe("string")
      expect(stringified.length).toBeGreaterThan(0)
    })

    it("should maintain stack traces when available", () => {
      const originalError = new Error("Original")
      originalError.stack = "Error: Original\n  at test.js:1:1"

      const wrappedError = new OllamaConnectionError({
        message: "Wrapped error",
        cause: originalError,
      })

      expect(wrappedError.cause).toBe(originalError)
      expect((wrappedError.cause as Error).stack).toBe(originalError.stack)
    })
  })
})
