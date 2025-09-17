/**
 * Tests for console utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as Console from "../console"

describe("Console Utilities", () => {
  let logSpy: any
  let errorSpy: any

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe("log", () => {
    it("should call console.log with the provided message", () => {
      const message = "Test log message"

      Console.log(message)

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith(message)
    })

    it("should handle empty messages", () => {
      Console.log("")

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith("")
    })

    it("should handle messages with special characters", () => {
      const message = "Special chars: 日本語 🚀 \n\t"

      Console.log(message)

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith(message)
    })

    it("should handle long messages", () => {
      const message = "A".repeat(1000)

      Console.log(message)

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith(message)
    })
  })

  describe("error", () => {
    it("should call console.error with the provided message", () => {
      const message = "Test error message"

      Console.error(message)

      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(message)
    })

    it("should handle empty error messages", () => {
      Console.error("")

      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith("")
    })

    it("should handle error messages with special characters", () => {
      const message = "Error: Failed to parse JSON at line 42"

      Console.error(message)

      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(message)
    })
  })

  describe("Integration", () => {
    it("should not interfere with each other", () => {
      Console.log("Log message")
      Console.error("Error message")

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith("Log message")
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith("Error message")
    })

    it("should maintain separate call counts", () => {
      Console.log("First log")
      Console.log("Second log")
      Console.error("First error")

      expect(logSpy).toHaveBeenCalledTimes(2)
      expect(errorSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("Type Safety", () => {
    it("should accept string parameters only", () => {
      // These should compile without issues
      Console.log("string message")
      Console.error("string error")

      // TypeScript should prevent non-string types (compile-time check)
      expect(logSpy).toHaveBeenCalledWith("string message")
      expect(errorSpy).toHaveBeenCalledWith("string error")
    })
  })
})
