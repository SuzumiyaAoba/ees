import { Effect, Exit } from "effect"
import { describe, expect, it } from "vitest"
import {
  EmbeddingDataParseError,
  parseStoredEmbeddingData,
  validateEmbeddingVector,
} from "@/entities/embedding/lib/embedding-data"

describe("EmbeddingDataParser", () => {
  describe("parseStoredEmbeddingData", () => {
    it("should parse F32_BLOB (ArrayBuffer) format correctly", async () => {
      // Create F32_BLOB data (768 dimensions for testing)
      const testVector = [0.1, -0.2, 0.3, -0.4, 0.5]
      const float32Array = new Float32Array(testVector)
      const arrayBuffer = float32Array.buffer

      const result = await Effect.runPromise(
        parseStoredEmbeddingData(arrayBuffer)
      )

      expect(result).toHaveLength(5)
      expect(result[0]).toBeCloseTo(0.1, 5)
      expect(result[1]).toBeCloseTo(-0.2, 5)
      expect(result[2]).toBeCloseTo(0.3, 5)
      expect(result[3]).toBeCloseTo(-0.4, 5)
      expect(result[4]).toBeCloseTo(0.5, 5)
    })

    it("should parse large F32_BLOB vectors correctly", async () => {
      // Test with 768-dimensional vector (typical embedding size)
      const testVector = Array.from({ length: 768 }, (_, i) => i * 0.001)
      const float32Array = new Float32Array(testVector)
      const arrayBuffer = float32Array.buffer

      const result = await Effect.runPromise(
        parseStoredEmbeddingData(arrayBuffer)
      )

      expect(result).toHaveLength(768)
      expect(result[0]).toBeCloseTo(0, 5)
      expect(result[100]).toBeCloseTo(0.1, 5)
      expect(result[767]).toBeCloseTo(0.767, 5)
    })

    it("should parse legacy Uint8Array format correctly", async () => {
      const testVector = [0.1, 0.2, 0.3]
      const jsonString = JSON.stringify(testVector)
      const uint8Array = new Uint8Array(Buffer.from(jsonString))

      const result = await Effect.runPromise(
        parseStoredEmbeddingData(uint8Array)
      )

      expect(result).toEqual(testVector)
    })

    it("should parse legacy string format correctly", async () => {
      const testVector = [1.5, -2.3, 0.0, 4.7]
      const jsonString = JSON.stringify(testVector)

      const result = await Effect.runPromise(
        parseStoredEmbeddingData(jsonString)
      )

      expect(result).toEqual(testVector)
    })

    it("should fail with empty ArrayBuffer", async () => {
      const emptyBuffer = new ArrayBuffer(0)

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(emptyBuffer)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Embedding vector must not be empty")
      }
    })

    it("should handle precision edge cases", async () => {
      const testVector = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.EPSILON,
        Math.PI,
        Math.E,
      ]
      const float32Array = new Float32Array(testVector)
      const arrayBuffer = float32Array.buffer

      const result = await Effect.runPromise(
        parseStoredEmbeddingData(arrayBuffer)
      )

      expect(result).toHaveLength(5)
      // Note: Float32 precision will cause some loss
      expect(result[3]).toBeCloseTo(Math.PI, 6)
      expect(result[4]).toBeCloseTo(Math.E, 6)
    })

    it("should fail with special float values", async () => {
      const testVector = [0, -0, Infinity, -Infinity, NaN]
      const float32Array = new Float32Array(testVector)
      const arrayBuffer = float32Array.buffer

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(arrayBuffer)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Invalid embedding vector format")
      }
    })

    it("should fail with invalid JSON in legacy format", async () => {
      const invalidJson = "invalid json string"

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(invalidJson)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Failed to parse")
      }
    })

    it("should fail with invalid vector data", async () => {
      const invalidVector = { not: "an array" }
      const jsonString = JSON.stringify(invalidVector)

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(jsonString)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Invalid embedding vector format")
      }
    })

    it("should fail with unsupported data types", async () => {
      const unsupportedData = 123

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(unsupportedData)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Invalid stored embedding data format")
      }
    })

    it("should handle corrupted ArrayBuffer gracefully", async () => {
      // Create buffer with odd byte count (not divisible by 4)
      const corruptBuffer = new ArrayBuffer(7)

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(corruptBuffer)
      )

      // Should fail because truncated floats or empty results aren't valid
      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
      }
    })

    it("should handle mixed data corruption in Uint8Array", async () => {
      const corruptedData = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC])

      const result = await Effect.runPromiseExit(
        parseStoredEmbeddingData(corruptedData)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe("validateEmbeddingVector", () => {
    it("should validate correct number array", async () => {
      const validVector = [0.1, 0.2, 0.3, -0.4, 0.5]

      const result = await Effect.runPromise(
        validateEmbeddingVector(validVector)
      )

      expect(result).toEqual(validVector)
    })

    it("should fail with empty array", async () => {
      const emptyVector: number[] = []

      const result = await Effect.runPromiseExit(
        validateEmbeddingVector(emptyVector)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Embedding vector must not be empty")
      }
    })

    it("should validate large vectors", async () => {
      const largeVector = Array.from({ length: 1536 }, (_, i) => i * 0.001)

      const result = await Effect.runPromise(
        validateEmbeddingVector(largeVector)
      )

      expect(result).toHaveLength(1536)
      expect(result).toEqual(largeVector)
    })

    it("should fail with non-array input", async () => {
      const invalidInput = "not an array"

      const result = await Effect.runPromiseExit(
        validateEmbeddingVector(invalidInput)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Invalid embedding vector")
      }
    })

    it("should fail with array containing non-numbers", async () => {
      const invalidVector = [0.1, "not a number", 0.3]

      const result = await Effect.runPromiseExit(
        validateEmbeddingVector(invalidVector)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("should fail with special number values", async () => {
      const specialVector = [0, -0, Infinity, -Infinity, NaN]

      const result = await Effect.runPromiseExit(
        validateEmbeddingVector(specialVector)
      )

      expect(Exit.isFailure(result)).toBe(true)
      if (Exit.isFailure(result)) {
        expect(result.cause._tag).toBe("Fail")
        const error = (result.cause as { error: EmbeddingDataParseError }).error
        expect(error).toBeInstanceOf(EmbeddingDataParseError)
        expect(error.message).toContain("Invalid embedding vector")
      }
    })

    it("should handle very large and small numbers", async () => {
      const extremeVector = [
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.EPSILON,
      ]

      const result = await Effect.runPromise(
        validateEmbeddingVector(extremeVector)
      )

      expect(result).toEqual(extremeVector)
    })

    it("should fail with null or undefined", async () => {
      const nullResult = await Effect.runPromiseExit(
        validateEmbeddingVector(null)
      )
      const undefinedResult = await Effect.runPromiseExit(
        validateEmbeddingVector(undefined)
      )

      expect(Exit.isFailure(nullResult)).toBe(true)
      expect(Exit.isFailure(undefinedResult)).toBe(true)
    })

    it("should fail with object that looks like array", async () => {
      const fakeArray = { 0: 0.1, 1: 0.2, length: 2 }

      const result = await Effect.runPromiseExit(
        validateEmbeddingVector(fakeArray)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe("EmbeddingDataParseError", () => {
    it("should create error with message and cause", () => {
      const cause = new Error("Original error")
      const error = new EmbeddingDataParseError("Parse failed", cause)

      expect(error.name).toBe("EmbeddingDataParseError")
      expect(error.message).toBe("Parse failed")
      expect(error.cause).toBe(cause)
    })

    it("should create error without cause", () => {
      const error = new EmbeddingDataParseError("Parse failed")

      expect(error.name).toBe("EmbeddingDataParseError")
      expect(error.message).toBe("Parse failed")
      expect(error.cause).toBeUndefined()
    })

    it("should be instanceof Error", () => {
      const error = new EmbeddingDataParseError("Test error")

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(EmbeddingDataParseError)
    })
  })
})