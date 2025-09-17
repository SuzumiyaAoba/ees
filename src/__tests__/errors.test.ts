import { describe, expect, it } from "vitest"
import {
  DatabaseConnectionError,
  DatabaseError,
  DatabaseQueryError,
} from "../shared/errors/database"
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderError,
  ProviderModelError,
  ProviderRateLimitError,
} from "../shared/providers/types"

describe("Error Classes", () => {
  describe("DatabaseError", () => {
    it("should create DatabaseError with message", () => {
      const error = new DatabaseError({
        message: "Test database error",
      })

      expect(error).toBeInstanceOf(DatabaseError)
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
  })

  describe("DatabaseConnectionError", () => {
    it("should create DatabaseConnectionError with correct tag", () => {
      const error = new DatabaseConnectionError({
        message: "Connection failed",
      })

      expect(error).toBeInstanceOf(DatabaseConnectionError)
      expect(error._tag).toBe("DatabaseConnectionError")
      expect(error.message).toBe("Connection failed")
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
  })

  describe("ProviderError", () => {
    it("should create ProviderError with message and provider", () => {
      const error = new ProviderError({
        provider: "ollama",
        message: "Provider service error",
      })

      expect(error).toBeInstanceOf(ProviderError)
      expect(error._tag).toBe("ProviderError")
      expect(error.provider).toBe("ollama")
      expect(error.message).toBe("Provider service error")
    })

    it("should handle different providers", () => {
      const openaiError = new ProviderError({
        provider: "openai",
        message: "OpenAI service down",
      })

      const googleError = new ProviderError({
        provider: "google",
        message: "Google AI error",
      })

      expect(openaiError.provider).toBe("openai")
      expect(googleError.provider).toBe("google")
    })
  })

  describe("ProviderConnectionError", () => {
    it("should create ProviderConnectionError with correct tag", () => {
      const error = new ProviderConnectionError({
        provider: "ollama",
        message: "Cannot connect to provider",
      })

      expect(error).toBeInstanceOf(ProviderConnectionError)
      expect(error._tag).toBe("ProviderConnectionError")
      expect(error.provider).toBe("ollama")
      expect(error.message).toBe("Cannot connect to provider")
    })
  })

  describe("ProviderModelError", () => {
    it("should create ProviderModelError with model name", () => {
      const error = new ProviderModelError({
        provider: "ollama",
        modelName: "nonexistent-model",
        message: "Model not found",
      })

      expect(error).toBeInstanceOf(ProviderModelError)
      expect(error._tag).toBe("ProviderModelError")
      expect(error.provider).toBe("ollama")
      expect(error.modelName).toBe("nonexistent-model")
      expect(error.message).toBe("Model not found")
    })
  })

  describe("ProviderAuthenticationError", () => {
    it("should create ProviderAuthenticationError with correct tag", () => {
      const error = new ProviderAuthenticationError({
        provider: "openai",
        message: "Invalid API key",
      })

      expect(error).toBeInstanceOf(ProviderAuthenticationError)
      expect(error._tag).toBe("ProviderAuthenticationError")
      expect(error.provider).toBe("openai")
      expect(error.message).toBe("Invalid API key")
    })
  })

  describe("ProviderRateLimitError", () => {
    it("should create ProviderRateLimitError with retry information", () => {
      const error = new ProviderRateLimitError({
        provider: "google",
        message: "Rate limit exceeded",
        retryAfter: 60,
      })

      expect(error).toBeInstanceOf(ProviderRateLimitError)
      expect(error._tag).toBe("ProviderRateLimitError")
      expect(error.provider).toBe("google")
      expect(error.retryAfter).toBe(60)
    })
  })

  describe("Error type hierarchy", () => {
    it("should have unique tags for each error type", () => {
      const errors = [
        new DatabaseError({ message: "test" }),
        new DatabaseConnectionError({ message: "test" }),
        new DatabaseQueryError({ message: "test" }),
        new ProviderError({ provider: "test", message: "test" }),
        new ProviderConnectionError({ provider: "test", message: "test" }),
        new ProviderModelError({
          provider: "test",
          modelName: "test",
          message: "test",
        }),
        new ProviderAuthenticationError({ provider: "test", message: "test" }),
        new ProviderRateLimitError({ provider: "test", message: "test" }),
      ]

      const tags = errors.map((error) => error._tag)
      const uniqueTags = new Set(tags)

      expect(uniqueTags.size).toBe(tags.length)
      expect(uniqueTags).toEqual(
        new Set([
          "DatabaseError",
          "DatabaseConnectionError",
          "DatabaseQueryError",
          "ProviderError",
          "ProviderConnectionError",
          "ProviderModelError",
          "ProviderAuthenticationError",
          "ProviderRateLimitError",
        ])
      )
    })

    it("should support pattern matching on error types", () => {
      const errors: Array<DatabaseError | ProviderError | ProviderModelError> =
        [
          new DatabaseError({ message: "db" }),
          new ProviderModelError({
            provider: "ollama",
            modelName: "test",
            message: "model",
          }),
          new ProviderError({ provider: "openai", message: "provider" }),
        ]

      const results = errors.map((error) => {
        switch (error._tag) {
          case "DatabaseError":
            return "database"
          case "ProviderError":
            return "provider"
          case "ProviderModelError":
            return "provider-model"
          default:
            return "unknown"
        }
      })

      expect(results).toEqual(["database", "provider-model", "provider"])
    })
  })
})
