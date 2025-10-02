/**
 * Tests for provider types and error classes
 */

import { describe, expect, it } from "vitest"
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "@/shared/errors/database"

describe("Provider Error Types", () => {
  describe("ProviderConnectionError", () => {
    it("should create error with basic properties", () => {
      const error = new ProviderConnectionError({
        provider: "test-provider",
        message: "Connection failed",
      })

      expect(error.provider).toBe("test-provider")
      expect(error.message).toBe("Connection failed")
      expect(error.errorCode).toBeUndefined()
      expect(error.cause).toBeUndefined()
    })

    it("should create error with all properties", () => {
      const cause = new Error("Network error")
      const error = new ProviderConnectionError({
        provider: "openai",
        message: "Failed to connect to OpenAI",
        errorCode: "NETWORK_ERROR",
        cause,
      })

      expect(error.provider).toBe("openai")
      expect(error.message).toBe("Failed to connect to OpenAI")
      expect(error.errorCode).toBe("NETWORK_ERROR")
      expect(error.cause).toBe(cause)
    })

    it("should be instance of Error", () => {
      const error = new ProviderConnectionError({
        provider: "test",
        message: "test",
      })

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe("ProviderModelError", () => {
    it("should create error with required properties", () => {
      const error = new ProviderModelError({
        provider: "google",
        modelName: "text-embedding-004",
        message: "Model not found",
      })

      expect(error.provider).toBe("google")
      expect(error.modelName).toBe("text-embedding-004")
      expect(error.message).toBe("Model not found")
      expect(error.errorCode).toBeUndefined()
      expect(error.cause).toBeUndefined()
    })

    it("should create error with all properties", () => {
      const cause = new Error("API error")
      const error = new ProviderModelError({
        provider: "openai",
        modelName: "text-embedding-3-large",
        message: "Model quota exceeded",
        errorCode: "QUOTA_EXCEEDED",
        cause,
      })

      expect(error.provider).toBe("openai")
      expect(error.modelName).toBe("text-embedding-3-large")
      expect(error.message).toBe("Model quota exceeded")
      expect(error.errorCode).toBe("QUOTA_EXCEEDED")
      expect(error.cause).toBe(cause)
    })
  })

  describe("ProviderAuthenticationError", () => {
    it("should create error with basic properties", () => {
      const error = new ProviderAuthenticationError({
        provider: "openai",
        message: "Invalid API key",
      })

      expect(error.provider).toBe("openai")
      expect(error.message).toBe("Invalid API key")
      expect(error.errorCode).toBeUndefined()
      expect(error.cause).toBeUndefined()
    })

    it("should create error with error code", () => {
      const error = new ProviderAuthenticationError({
        provider: "google",
        message: "API key expired",
        errorCode: "EXPIRED_TOKEN",
      })

      expect(error.provider).toBe("google")
      expect(error.message).toBe("API key expired")
      expect(error.errorCode).toBe("EXPIRED_TOKEN")
    })
  })

  describe("ProviderRateLimitError", () => {
    it("should create error with basic properties", () => {
      const error = new ProviderRateLimitError({
        provider: "openai",
        message: "Rate limit exceeded",
      })

      expect(error.provider).toBe("openai")
      expect(error.message).toBe("Rate limit exceeded")
      expect(error.retryAfter).toBeUndefined()
      expect(error.errorCode).toBeUndefined()
    })

    it("should create error with retry after", () => {
      const error = new ProviderRateLimitError({
        provider: "google",
        message: "Too many requests",
        retryAfter: 60,
        errorCode: "RATE_LIMITED",
      })

      expect(error.provider).toBe("google")
      expect(error.message).toBe("Too many requests")
      expect(error.retryAfter).toBe(60)
      expect(error.errorCode).toBe("RATE_LIMITED")
    })
  })

  describe("Error inheritance", () => {
    it("should all extend Error class", () => {
      const connectionError = new ProviderConnectionError({
        provider: "test",
        message: "test",
      })
      const modelError = new ProviderModelError({
        provider: "test",
        modelName: "test",
        message: "test",
      })
      const authError = new ProviderAuthenticationError({
        provider: "test",
        message: "test",
      })
      const rateLimitError = new ProviderRateLimitError({
        provider: "test",
        message: "test",
      })

      expect(connectionError).toBeInstanceOf(Error)
      expect(modelError).toBeInstanceOf(Error)
      expect(authError).toBeInstanceOf(Error)
      expect(rateLimitError).toBeInstanceOf(Error)
    })
  })
})
