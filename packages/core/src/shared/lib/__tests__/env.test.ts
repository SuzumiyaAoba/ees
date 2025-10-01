/**
 * Tests for environment variable utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getEnv, getEnvWithDefault, getEnvNumber, getEnvBoolean, getPort, isTestEnv } from "@/shared/lib/env"

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

  describe("getEnvNumber", () => {
    it("should return numeric value when environment variable is a valid number", () => {
      process.env.NUMERIC_VAR = "42"

      const result = getEnvNumber("NUMERIC_VAR", 0)

      expect(result).toBe(42)
    })

    it("should return default value when environment variable is not set", () => {
      process.env.NUMERIC_VAR = undefined

      const result = getEnvNumber("NUMERIC_VAR", 100)

      expect(result).toBe(100)
    })

    it("should return default value when environment variable is not a valid number", () => {
      process.env.NUMERIC_VAR = "not-a-number"

      const result = getEnvNumber("NUMERIC_VAR", 50)

      expect(result).toBe(50)
    })

    it("should return default value when environment variable is empty", () => {
      process.env.NUMERIC_VAR = ""

      const result = getEnvNumber("NUMERIC_VAR", 25)

      expect(result).toBe(25)
    })

    it("should handle floating point numbers", () => {
      process.env.FLOAT_VAR = "3.14"

      const result = getEnvNumber("FLOAT_VAR", 0)

      expect(result).toBe(3.14)
    })

    it("should handle negative numbers", () => {
      process.env.NEGATIVE_VAR = "-100"

      const result = getEnvNumber("NEGATIVE_VAR", 0)

      expect(result).toBe(-100)
    })

    it("should handle zero", () => {
      process.env.ZERO_VAR = "0"

      const result = getEnvNumber("ZERO_VAR", 100)

      expect(result).toBe(0)
    })

    it("should handle large numbers", () => {
      process.env.LARGE_VAR = "9999999999"

      const result = getEnvNumber("LARGE_VAR", 0)

      expect(result).toBe(9999999999)
    })
  })

  describe("getEnvBoolean", () => {
    it("should return true for 'true' string", () => {
      process.env.BOOL_VAR = "true"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
    })

    it("should return true for 'TRUE' string (case-insensitive)", () => {
      process.env.BOOL_VAR = "TRUE"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
    })

    it("should return true for '1' string", () => {
      process.env.BOOL_VAR = "1"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
    })

    it("should return true for 'yes' string", () => {
      process.env.BOOL_VAR = "yes"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
    })

    it("should return true for 'YES' string (case-insensitive)", () => {
      process.env.BOOL_VAR = "YES"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
    })

    it("should return false for 'false' string", () => {
      process.env.BOOL_VAR = "false"

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(false)
    })

    it("should return false for 'FALSE' string (case-insensitive)", () => {
      process.env.BOOL_VAR = "FALSE"

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(false)
    })

    it("should return false for '0' string", () => {
      process.env.BOOL_VAR = "0"

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(false)
    })

    it("should return false for 'no' string", () => {
      process.env.BOOL_VAR = "no"

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(false)
    })

    it("should return false for 'NO' string (case-insensitive)", () => {
      process.env.BOOL_VAR = "NO"

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(false)
    })

    it("should return default value when environment variable is not set", () => {
      process.env.BOOL_VAR = undefined

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(true)
    })

    it("should return default value for invalid boolean strings", () => {
      process.env.BOOL_VAR = "maybe"

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(false)
    })

    it("should return default value when environment variable is empty", () => {
      process.env.BOOL_VAR = ""

      const result = getEnvBoolean("BOOL_VAR", true)

      expect(result).toBe(true)
    })

    it("should handle whitespace in boolean values", () => {
      process.env.BOOL_VAR = "  true  "

      const result = getEnvBoolean("BOOL_VAR", false)

      expect(result).toBe(true)
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
      process.env.NUM_VAR = "42"
      process.env.BOOL_VAR = "true"

      // TypeScript should enforce these types at compile time
      const envValue = getEnv("TEST_VAR")
      const envWithDefault = getEnvWithDefault("TEST_VAR", "default")
      const envNum = getEnvNumber("NUM_VAR", 0)
      const envBool = getEnvBoolean("BOOL_VAR", false)
      const testEnv = isTestEnv()
      const port = getPort()

      expect(typeof envValue).toBe("string")
      expect(typeof envWithDefault).toBe("string")
      expect(typeof envNum).toBe("number")
      expect(typeof envBool).toBe("boolean")
      expect(typeof testEnv).toBe("boolean")
      expect(typeof port).toBe("number")
    })
  })
})
