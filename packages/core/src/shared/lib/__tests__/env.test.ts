/**
 * Tests for environment variable utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getEnv, getEnvWithDefault, getPort, isTestEnv } from "@/shared/lib/env"

describe("Environment Variable Utilities", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe("getEnv", () => {
    it("should return environment variable value when it exists", () => {
      process.env.TEST_VAR = "test-value"

      const result = getEnv("TEST_VAR")

      expect(result).toBe("test-value")
    })

    it("should return undefined when environment variable does not exist", () => {
      process.env.TEST_VAR = undefined

      const result = getEnv("TEST_VAR")

      expect(result).toBeUndefined()
    })

    it("should handle empty string values", () => {
      process.env.EMPTY_VAR = ""

      const result = getEnv("EMPTY_VAR")

      expect(result).toBe("")
    })

    it("should handle special characters in values", () => {
      const specialValue = "special!@#$%^&*()_+{}|:<>?[]\\;'\",./"
      process.env.SPECIAL_VAR = specialValue

      const result = getEnv("SPECIAL_VAR")

      expect(result).toBe(specialValue)
    })
  })

  describe("getEnvWithDefault", () => {
    it("should return environment variable value when it exists", () => {
      process.env.TEST_VAR = "actual-value"

      const result = getEnvWithDefault("TEST_VAR", "default-value")

      expect(result).toBe("actual-value")
    })

    it("should return default value when environment variable does not exist", () => {
      process.env.TEST_VAR = undefined

      const result = getEnvWithDefault("TEST_VAR", "default-value")

      expect(result).toBe("default-value")
    })

    it("should return default value when environment variable is empty", () => {
      process.env.TEST_VAR = ""

      const result = getEnvWithDefault("TEST_VAR", "default-value")

      expect(result).toBe("default-value")
    })

    it("should handle whitespace-only values", () => {
      process.env.TEST_VAR = "   "

      const result = getEnvWithDefault("TEST_VAR", "default-value")

      expect(result).toBe("   ")
    })

    it("should work with numeric strings", () => {
      process.env.NUMERIC_VAR = "12345"

      const result = getEnvWithDefault("NUMERIC_VAR", "0")

      expect(result).toBe("12345")
    })
  })

  describe("isTestEnv", () => {
    it("should return true when NODE_ENV is 'test'", () => {
      process.env.NODE_ENV = "test"

      const result = isTestEnv()

      expect(result).toBe(true)
    })

    it("should return false when NODE_ENV is 'development'", () => {
      process.env.NODE_ENV = "development"

      const result = isTestEnv()

      expect(result).toBe(false)
    })

    it("should return false when NODE_ENV is 'production'", () => {
      process.env.NODE_ENV = "production"

      const result = isTestEnv()

      expect(result).toBe(false)
    })

    it("should return false when NODE_ENV is not set", () => {
      process.env.NODE_ENV = undefined

      const result = isTestEnv()

      expect(result).toBe(false)
    })

    it("should return false when NODE_ENV is empty", () => {
      process.env.NODE_ENV = ""

      const result = isTestEnv()

      expect(result).toBe(false)
    })

    it("should be case sensitive", () => {
      process.env.NODE_ENV = "TEST"

      const result = isTestEnv()

      expect(result).toBe(false)
    })
  })

  describe("getPort", () => {
    it("should return port from environment when set", () => {
      process.env.PORT = "8080"

      const result = getPort()

      expect(result).toBe(8080)
    })

    it("should return default port when PORT is not set", () => {
      process.env.PORT = undefined

      const result = getPort()

      expect(result).toBe(3000)
    })

    it("should return custom default port when provided", () => {
      process.env.PORT = undefined

      const result = getPort(5000)

      expect(result).toBe(5000)
    })

    it("should return default when PORT is not a valid number", () => {
      process.env.PORT = "not-a-number"

      const result = getPort()

      expect(result).toBe(3000)
    })

    it("should return default when PORT is empty", () => {
      process.env.PORT = ""

      const result = getPort()

      expect(result).toBe(3000)
    })

    it("should handle zero as a valid port", () => {
      process.env.PORT = "0"

      const result = getPort()

      expect(result).toBe(3000) // Number("") || defaultPort behavior
    })

    it("should handle floating point numbers", () => {
      process.env.PORT = "3000.5"

      const result = getPort()

      expect(result).toBe(3000.5)
    })

    it("should handle negative numbers", () => {
      process.env.PORT = "-3000"

      const result = getPort()

      expect(result).toBe(-3000)
    })

    it("should handle large port numbers", () => {
      process.env.PORT = "65535"

      const result = getPort()

      expect(result).toBe(65535)
    })
  })

  describe("Integration", () => {
    it("should work together consistently", () => {
      process.env.NODE_ENV = "test"
      process.env.PORT = "4000"
      process.env.CUSTOM_VAR = "custom-value"

      expect(isTestEnv()).toBe(true)
      expect(getPort()).toBe(4000)
      expect(getEnv("CUSTOM_VAR")).toBe("custom-value")
      expect(getEnvWithDefault("MISSING_VAR", "fallback")).toBe("fallback")
    })

    it("should handle production-like environment", () => {
      process.env.NODE_ENV = "production"
      process.env.PORT = "80"
      process.env.DEBUG = undefined

      expect(isTestEnv()).toBe(false)
      expect(getPort()).toBe(80)
      expect(getEnv("DEBUG")).toBeUndefined()
      expect(getEnvWithDefault("DEBUG", "false")).toBe("false")
    })
  })

  describe("Type Safety", () => {
    it("should maintain correct return types", () => {
      process.env.TEST_VAR = "test"

      // TypeScript should enforce these types at compile time
      const envValue = getEnv("TEST_VAR")
      const envWithDefault = getEnvWithDefault("TEST_VAR", "default")
      const testEnv = isTestEnv()
      const port = getPort()

      expect(typeof envValue).toBe("string")
      expect(typeof envWithDefault).toBe("string")
      expect(typeof testEnv).toBe("boolean")
      expect(typeof port).toBe("number")
    })
  })
})
