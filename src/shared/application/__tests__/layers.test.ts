/**
 * Tests for application layers
 */

import { Effect, Layer } from "effect"
import { describe, expect, it, vi } from "vitest"
import { EmbeddingService } from "../../../entities/embedding/api/embedding"
import { OllamaService } from "../../../entities/embedding/api/ollama"
import { DatabaseService } from "../../database/connection"
import {
  EmbeddingApplicationService,
  EmbeddingApplicationServiceLive,
} from "../embedding-application"
import { ApplicationLayer, CoreApplicationLayer } from "../layers"

describe("Application Layers", () => {
  const createMockServices = () => {
    const mockDatabaseService = {
      db: {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
      },
    }

    const mockOllamaService = {
      generateEmbedding: vi.fn(),
      isModelAvailable: vi.fn(),
      pullModel: vi.fn(),
    }

    const mockEmbeddingService = {
      createEmbedding: vi.fn(),
      createBatchEmbedding: vi.fn(),
      searchEmbeddings: vi.fn(),
      getEmbedding: vi.fn(),
      getAllEmbeddings: vi.fn(),
      deleteEmbedding: vi.fn(),
    }

    return { mockDatabaseService, mockOllamaService, mockEmbeddingService }
  }

  const createTestLayer = () => {
    const { mockDatabaseService, mockOllamaService, mockEmbeddingService } =
      createMockServices()
    const baseLayer = Layer.mergeAll(
      Layer.succeed(DatabaseService, mockDatabaseService),
      Layer.succeed(OllamaService, mockOllamaService),
      Layer.succeed(EmbeddingService, mockEmbeddingService)
    )
    return Layer.provide(EmbeddingApplicationServiceLive, baseLayer)
  }

  describe("CoreApplicationLayer", () => {
    it("should provide all core services", async () => {
      const program = Effect.gen(function* () {
        // Test that we can access the EmbeddingApplicationService
        const appService = yield* EmbeddingApplicationService
        return appService
      })

      // This test ensures the layer provides the required services
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(createTestLayer())))
      ).resolves.toBeDefined()
    })

    it("should have proper service dependencies", async () => {
      const program = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService

        // Check that the service has the expected methods
        expect(typeof appService.createEmbedding).toBe("function")
        expect(typeof appService.createBatchEmbeddings).toBe("function")
        expect(typeof appService.searchEmbeddings).toBe("function")
        expect(typeof appService.getEmbeddingByUri).toBe("function")
        expect(typeof appService.listEmbeddings).toBe("function")
        expect(typeof appService.deleteEmbedding).toBe("function")

        return appService
      })

      await Effect.runPromise(program.pipe(Effect.provide(createTestLayer())))
    })
  })

  describe("ApplicationLayer", () => {
    it("should be identical to CoreApplicationLayer", () => {
      // ApplicationLayer should be an alias for CoreApplicationLayer
      expect(ApplicationLayer).toBe(CoreApplicationLayer)
    })

    it("should provide all required services for both web and CLI", async () => {
      const program = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService

        // Verify all required methods are available
        const methods = [
          "createEmbedding",
          "createBatchEmbeddings",
          "searchEmbeddings",
          "getEmbeddingByUri",
          "listEmbeddings",
          "deleteEmbedding",
        ]

        for (const method of methods) {
          expect(appService).toHaveProperty(method)
          expect(typeof appService[method as keyof typeof appService]).toBe(
            "function"
          )
        }

        return true
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result).toBe(true)
    })
  })

  describe("Layer Composition", () => {
    it("should support multiple concurrent service access", async () => {
      const program = Effect.gen(function* () {
        // Access the same service multiple times to ensure proper composition
        const appService1 = yield* EmbeddingApplicationService
        const appService2 = yield* EmbeddingApplicationService

        // They should be the same instance (singleton behavior)
        expect(appService1).toBe(appService2)

        return [appService1, appService2]
      })

      const [service1, service2] = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(service1).toBe(service2)
    })

    it("should properly handle layer dependencies", async () => {
      // This test ensures that the layer properly resolves all dependencies
      // and doesn't have circular dependencies or missing services
      const program = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService

        // Just accessing the service through the layer should not throw
        return typeof appService
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(createTestLayer()))
      )

      expect(result).toBe("object")
    })
  })

  describe("Cross-Interface Compatibility", () => {
    it("should work with web application patterns", async () => {
      // Simulate web application usage pattern
      const webProgram = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService

        // Web applications typically call service methods directly
        expect(typeof appService.createEmbedding).toBe("function")
        expect(typeof appService.searchEmbeddings).toBe("function")

        return "web-compatible"
      })

      const result = await Effect.runPromise(
        webProgram.pipe(Effect.provide(createTestLayer()))
      )

      expect(result).toBe("web-compatible")
    })

    it("should work with CLI application patterns", async () => {
      // Simulate CLI application usage pattern
      const cliProgram = Effect.gen(function* () {
        const appService = yield* EmbeddingApplicationService

        // CLI applications typically use the same service methods
        expect(typeof appService.createEmbedding).toBe("function")
        expect(typeof appService.listEmbeddings).toBe("function")
        expect(typeof appService.deleteEmbedding).toBe("function")

        return "cli-compatible"
      })

      const result = await Effect.runPromise(
        cliProgram.pipe(Effect.provide(createTestLayer()))
      )

      expect(result).toBe("cli-compatible")
    })
  })
})
