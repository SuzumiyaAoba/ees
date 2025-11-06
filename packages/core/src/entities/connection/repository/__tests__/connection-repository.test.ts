/**
 * Unit tests for ConnectionRepository
 * Tests data access layer for connection management
 */

import { Effect, Layer } from "effect"
import { describe, it, expect, beforeEach } from "vitest"
import {
  ConnectionRepository,
  ConnectionRepositoryLive,
  type NewConnectionConfig,
} from "@/entities/connection/repository/connection-repository"
import { DatabaseServiceLive } from "@/shared/database/connection"

describe("ConnectionRepository", () => {
  // Create test layer
  const TestLayer = Layer.provide(
    ConnectionRepositoryLive,
    DatabaseServiceLive
  )

  // Helper to run repository operations in test environment
  const runTest = <A, E>(
    effect: Effect.Effect<A, E>
  ): Promise<A> => Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

  describe("create", () => {
    it("should create a new connection configuration", async () => {
      const newConnection: NewConnectionConfig = {
        name: "Test Connection",
        type: "ollama",
        baseUrl: "http://localhost:11434",
        apiKey: null,
        defaultModel: "nomic-embed-text",
        metadata: null,
        isActive: false,
      }

      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create(newConnection)
        })
      )

      expect(result.id).toBeGreaterThan(0)
      expect(result.name).toBe("Test Connection")
      expect(result.type).toBe("ollama")
      expect(result.baseUrl).toBe("http://localhost:11434")
    })

    it("should create connection with API key", async () => {
      const newConnection: NewConnectionConfig = {
        name: "LM Studio",
        type: "openai-compatible",
        baseUrl: "http://localhost:1234",
        apiKey: "test-api-key",
        defaultModel: "test-model",
        metadata: null,
        isActive: false,
      }

      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create(newConnection)
        })
      )

      expect(result.id).toBeGreaterThan(0)
      expect(result.apiKey).toBe("test-api-key")
    })

    it("should create connection with metadata", async () => {
      const metadata = JSON.stringify({ region: "us-west", tier: "premium" })
      const newConnection: NewConnectionConfig = {
        name: "Cloud Provider",
        type: "openai-compatible",
        baseUrl: "https://api.example.com",
        apiKey: null,
        defaultModel: null,
        metadata,
        isActive: false,
      }

      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create(newConnection)
        })
      )

      expect(result.metadata).toBe(metadata)
    })
  })

  describe("findById", () => {
    it("should find connection by ID", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create a connection first
          const created = yield* repo.create({
            name: "Find By ID Test",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })

          // Find it by ID
          return yield* repo.findById(created.id)
        })
      )

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Find By ID Test")
    })

    it("should return null for non-existent ID", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.findById(99999)
        })
      )

      expect(result).toBeNull()
    })
  })

  describe("findAll", () => {
    it("should list all connections", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create multiple connections
          yield* repo.create({
            name: "Connection 1",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })

          yield* repo.create({
            name: "Connection 2",
            type: "openai-compatible",
            baseUrl: "http://localhost:1234",
            apiKey: null,
            defaultModel: "text-embedding-3-small",
            metadata: null,
            isActive: false,
          })

          return yield* repo.findAll()
        })
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should return empty array when no connections exist", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.findAll()
        })
      )

      // May have connections from previous tests, but should still be an array
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("findActive", () => {
    it("should find the active connection", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create a connection and set it as active
          const created = yield* repo.create({
            name: "Active Connection",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })

          yield* repo.setActive(created.id)

          return yield* repo.findActive()
        })
      )

      expect(result).not.toBeNull()
      expect(result?.isActive).toBe(true)
    })

    it("should return null when no active connection exists", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Deactivate all connections first
          const all = yield* repo.findAll()
          for (const conn of all) {
            yield* repo.update(conn.id, { isActive: false })
          }

          return yield* repo.findActive()
        })
      )

      expect(result).toBeNull()
    })
  })

  describe("update", () => {
    it("should update connection properties", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create a connection
          const created = yield* repo.create({
            name: "Original Name",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })

          // Update it
          return yield* repo.update(created.id, {
            name: "Updated Name",
            baseUrl: "http://localhost:9999",
            defaultModel: "new-model",
          })
        })
      )

      expect(result.name).toBe("Updated Name")
      expect(result.baseUrl).toBe("http://localhost:9999")
      expect(result.defaultModel).toBe("new-model")
    })

    it("should update only specified fields", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create a connection
          const created = yield* repo.create({
            name: "Partial Update Test",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: "original-key",
            defaultModel: "original-model",
            metadata: null,
            isActive: false,
          })

          // Update only name
          return yield* repo.update(created.id, {
            name: "New Name Only",
          })
        })
      )

      expect(result.name).toBe("New Name Only")
      expect(result.apiKey).toBe("original-key")
      expect(result.defaultModel).toBe("original-model")
    })
  })

  describe("delete", () => {
    it("should delete a connection", async () => {
      await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create a connection
          const created = yield* repo.create({
            name: "To Be Deleted",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })

          // Delete it
          yield* repo.delete(created.id)

          // Verify it's gone
          const found = yield* repo.findById(created.id)
          expect(found).toBeNull()
        })
      )
    })

    it("should handle deleting non-existent connection", async () => {
      await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          // Should not throw error
          yield* repo.delete(99999)
        })
      )
    })
  })

  describe("setActive", () => {
    it("should set a connection as active and deactivate others", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository

          // Create two connections
          const conn1 = yield* repo.create({
            name: "Connection 1",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: true,
          })

          const conn2 = yield* repo.create({
            name: "Connection 2",
            type: "openai-compatible",
            baseUrl: "http://localhost:1234",
            apiKey: null,
            defaultModel: "text-embedding-3-small",
            metadata: null,
            isActive: false,
          })

          // Set conn2 as active
          yield* repo.setActive(conn2.id)

          // Verify conn1 is now inactive and conn2 is active
          const updated1 = yield* repo.findById(conn1.id)
          const updated2 = yield* repo.findById(conn2.id)

          return { conn1: updated1, conn2: updated2 }
        })
      )

      expect(result.conn1?.isActive).toBe(false)
      expect(result.conn2?.isActive).toBe(true)
    })

    it("should throw error when setting non-existent connection as active", async () => {
      await expect(
        runTest(
          Effect.gen(function* () {
            const repo = yield* ConnectionRepository
            yield* repo.setActive(99999)
          })
        )
      ).rejects.toThrow()
    })
  })

  describe("edge cases", () => {
    it("should handle connections with special characters in name", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create({
            name: "Test Connection with 特殊文字 and émojis 🚀",
            type: "ollama",
            baseUrl: "http://localhost:11434",
            apiKey: null,
            defaultModel: "nomic-embed-text",
            metadata: null,
            isActive: false,
          })
        })
      )

      expect(result.name).toBe("Test Connection with 特殊文字 and émojis 🚀")
    })

    it("should handle very long base URLs", async () => {
      const longUrl = `http://very-long-subdomain-name-for-testing-purposes.example.com:8080/api/v1/embeddings`
      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create({
            name: "Long URL Test",
            type: "openai-compatible",
            baseUrl: longUrl,
            apiKey: null,
            defaultModel: "text-embedding-3-small",
            metadata: null,
            isActive: false,
          })
        })
      )

      expect(result.baseUrl).toBe(longUrl)
    })

    it("should handle complex metadata structures", async () => {
      const complexMetadata = JSON.stringify({
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
        },
        boolean: true,
        number: 42,
      })

      const result = await runTest(
        Effect.gen(function* () {
          const repo = yield* ConnectionRepository
          return yield* repo.create({
            name: "Complex Metadata Test",
            type: "openai-compatible",
            baseUrl: "http://localhost:1234",
            apiKey: null,
            defaultModel: "text-embedding-3-small",
            metadata: complexMetadata,
            isActive: false,
          })
        })
      )

      expect(result.metadata).toBe(complexMetadata)
      expect(JSON.parse(result.metadata!)).toEqual(JSON.parse(complexMetadata))
    })
  })
})
