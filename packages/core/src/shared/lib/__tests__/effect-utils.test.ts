/**
 * Tests for Effect utility functions
 */

import { describe, it, expect } from "vitest"
import { Context, Effect, Layer } from "effect"
import {
  withService,
  dbQuery,
  dbQueryMap,
  tryPromiseWithError,
  parallel,
  parallelObject,
  toOption,
} from "../effect-utils"
import { DatabaseQueryError } from "@/shared/errors/database"

describe("Effect Utilities", () => {
  describe("withService", () => {
    it("should access service and call method", async () => {
      // Define a test service
      interface TestService {
        readonly getValue: () => Effect.Effect<number>
      }

      const TestService = Context.GenericTag<TestService>("TestService")

      const testServiceImpl: TestService = {
        getValue: () => Effect.succeed(42),
      }

      const TestServiceLive = Layer.succeed(TestService, testServiceImpl)

      // Use withService helper
      const program = withService(TestService, (service) => service.getValue())

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestServiceLive))
      )

      expect(result).toBe(42)
    })

    it("should properly propagate service requirements", async () => {
      interface ConfigService {
        readonly getConfig: () => Effect.Effect<string>
      }

      const ConfigService = Context.GenericTag<ConfigService>("ConfigService")

      const configServiceImpl: ConfigService = {
        getConfig: () => Effect.succeed("test-config"),
      }

      const ConfigServiceLive = Layer.succeed(ConfigService, configServiceImpl)

      const program = withService(ConfigService, (service) =>
        service.getConfig()
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ConfigServiceLive))
      )

      expect(result).toBe("test-config")
    })
  })

  describe("dbQuery", () => {
    it("should wrap successful database operation", async () => {
      const mockQuery = () => Promise.resolve([{ id: 1, name: "test" }])

      const program = dbQuery(mockQuery, "Failed to query")

      const result = await Effect.runPromise(program)

      expect(result).toEqual([{ id: 1, name: "test" }])
    })

    it("should create DatabaseQueryError on failure", async () => {
      const mockQuery = () => Promise.reject(new Error("DB connection failed"))

      const program = dbQuery(mockQuery, "Failed to execute query")

      const result = await Effect.runPromiseExit(program)

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        const error = result.cause
        expect(error._tag).toBe("Fail")
        if (error._tag === "Fail") {
          expect(error.error).toBeInstanceOf(DatabaseQueryError)
          expect(error.error.message).toBe("Failed to execute query")
        }
      }
    })

    it("should include query string in error when provided", async () => {
      const mockQuery = () => Promise.reject(new Error("Syntax error"))

      const program = dbQuery(
        mockQuery,
        "Failed to execute query",
        "SELECT * FROM users"
      )

      const result = await Effect.runPromiseExit(program)

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        const error = result.cause
        if (error._tag === "Fail") {
          expect(error.error.query).toBe("SELECT * FROM users")
        }
      }
    })
  })

  describe("dbQueryMap", () => {
    it("should query and transform result", async () => {
      const mockQuery = () => Promise.resolve([{ count: 5 }])

      const program = dbQueryMap(
        mockQuery,
        (rows) => rows[0]?.count ?? 0,
        "Failed to count"
      )

      const result = await Effect.runPromise(program)

      expect(result).toBe(5)
    })

    it("should handle empty results with transformation", async () => {
      const mockQuery = () => Promise.resolve([])

      const program = dbQueryMap(
        mockQuery,
        (rows) => rows.length,
        "Failed to query"
      )

      const result = await Effect.runPromise(program)

      expect(result).toBe(0)
    })
  })

  describe("tryPromiseWithError", () => {
    it("should wrap Promise with custom error", async () => {
      const mockOperation = () => Promise.resolve("success")

      const program = tryPromiseWithError(
        mockOperation,
        (cause) =>
          new DatabaseQueryError({ message: "Custom error", cause })
      )

      const result = await Effect.runPromise(program)

      expect(result).toBe("success")
    })

    it("should create custom error on failure", async () => {
      const mockOperation = () => Promise.reject(new Error("Failed"))

      class CustomError extends Error {
        constructor(cause: unknown) {
          super("Custom error occurred")
          this.cause = cause
        }
      }

      const program = tryPromiseWithError(
        mockOperation,
        (cause) => new CustomError(cause)
      )

      const result = await Effect.runPromiseExit(program)

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        const error = result.cause
        if (error._tag === "Fail") {
          expect(error.error).toBeInstanceOf(CustomError)
        }
      }
    })
  })

  describe("parallel", () => {
    it("should execute effects in parallel", async () => {
      const effect1 = Effect.succeed(1)
      const effect2 = Effect.succeed(2)
      const effect3 = Effect.succeed(3)

      const program = parallel([effect1, effect2, effect3])

      const result = await Effect.runPromise(program)

      expect(result).toEqual([1, 2, 3])
    })

    it("should respect concurrency limit", async () => {
      const effects = Array.from({ length: 10 }, (_, i) =>
        Effect.succeed(i + 1)
      )

      const program = parallel(effects, 3)

      const result = await Effect.runPromise(program)

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })
  })

  describe("parallelObject", () => {
    it("should execute object of effects in parallel", async () => {
      const effects = {
        user: Effect.succeed({ id: 1, name: "Alice" }),
        posts: Effect.succeed([{ id: 1, title: "Post 1" }]),
        count: Effect.succeed(42),
      }

      const program = parallelObject(effects)

      const result = await Effect.runPromise(program)

      expect(result).toEqual({
        user: { id: 1, name: "Alice" },
        posts: [{ id: 1, title: "Post 1" }],
        count: 42,
      })
    })
  })

  describe("toOption", () => {
    it("should convert null to null", () => {
      expect(toOption(null)).toBe(null)
    })

    it("should convert undefined to null", () => {
      expect(toOption(undefined)).toBe(null)
    })

    it("should preserve non-null values", () => {
      expect(toOption(42)).toBe(42)
      expect(toOption("test")).toBe("test")
      expect(toOption({ id: 1 })).toEqual({ id: 1 })
    })

    it("should preserve falsy non-null values", () => {
      expect(toOption(0)).toBe(0)
      expect(toOption("")).toBe("")
      expect(toOption(false)).toBe(false)
    })
  })
})
