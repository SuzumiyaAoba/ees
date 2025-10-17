import { describe, it, expect, beforeEach } from "vitest"
import { Effect } from "effect"
import { UploadDirectoryRepository, UploadDirectoryRepositoryLive } from "@ees/core"

describe("UploadDirectoryRepository", () => {
  // Helper function to run Effect programs with the repository layer
  const runTest = <A>(effect: Effect.Effect<A, unknown, UploadDirectoryRepository>) =>
    Effect.runPromise(effect.pipe(Effect.provide(UploadDirectoryRepositoryLive)))

  // Clean up database before each test
  beforeEach(async () => {
    const repository = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* UploadDirectoryRepository
      }).pipe(Effect.provide(UploadDirectoryRepositoryLive))
    )

    // Delete all upload directories
    const directories = await Effect.runPromise(repository.findAll())
    for (const dir of directories) {
      await Effect.runPromise(repository.deleteById(dir.id))
    }
  })

  describe("create", () => {
    it("should create a new upload directory with all fields", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
            modelName: "nomic-embed-text",
            description: "Test description",
          })

          expect(created.id).toBeTypeOf("number")
          expect(created.id).toBeGreaterThan(0)

          // Verify it was created
          const found = yield* repository.findById(created.id)
          expect(found).not.toBeNull()
          expect(found?.name).toBe("Test Directory")
          expect(found?.path).toBe("/test/path")
          expect(found?.modelName).toBe("nomic-embed-text")
          expect(found?.description).toBe("Test description")

          return created
        })
      )

      expect(result.id).toBeGreaterThan(0)
    })

    it("should create a directory with default model name when not specified", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          const found = yield* repository.findById(created.id)
          expect(found?.modelName).toBe("nomic-embed-text")

          return created
        })
      )

      expect(result.id).toBeGreaterThan(0)
    })

    it("should create a directory without description", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
            modelName: "custom-model",
          })

          const found = yield* repository.findById(created.id)
          expect(found?.description).toBeNull()

          return created
        })
      )

      expect(result.id).toBeGreaterThan(0)
    })
  })

  describe("findAll", () => {
    it("should return empty array when no directories exist", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.findAll()
        })
      )

      expect(result).toEqual([])
    })

    it("should return all upload directories ordered by creation date", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          // Create multiple directories
          const dir1 = yield* repository.create({
            name: "Directory 1",
            path: "/path/1",
          })

          const dir2 = yield* repository.create({
            name: "Directory 2",
            path: "/path/2",
          })

          const dir3 = yield* repository.create({
            name: "Directory 3",
            path: "/path/3",
          })

          const directories = yield* repository.findAll()

          expect(directories).toHaveLength(3)
          expect(directories[0]?.id).toBe(dir1.id)
          expect(directories[1]?.id).toBe(dir2.id)
          expect(directories[2]?.id).toBe(dir3.id)

          return directories
        })
      )

      expect(result).toHaveLength(3)
    })
  })

  describe("findById", () => {
    it("should find an upload directory by ID", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
            modelName: "test-model",
            description: "Test description",
          })

          const found = yield* repository.findById(created.id)

          expect(found).not.toBeNull()
          expect(found?.id).toBe(created.id)
          expect(found?.name).toBe("Test Directory")
          expect(found?.path).toBe("/test/path")
          expect(found?.modelName).toBe("test-model")
          expect(found?.description).toBe("Test description")
          expect(found?.lastSyncedAt).toBeNull()
          expect(found?.createdAt).toBeTypeOf("string")
          expect(found?.updatedAt).toBeTypeOf("string")

          return found
        })
      )

      expect(result).not.toBeNull()
    })

    it("should return null for non-existent ID", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.findById(99999)
        })
      )

      expect(result).toBeNull()
    })
  })

  describe("findByPath", () => {
    it("should find an upload directory by path", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/unique/test/path",
            modelName: "test-model",
          })

          const found = yield* repository.findByPath("/unique/test/path")

          expect(found).not.toBeNull()
          expect(found?.id).toBe(created.id)
          expect(found?.path).toBe("/unique/test/path")

          return found
        })
      )

      expect(result).not.toBeNull()
    })

    it("should return null for non-existent path", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.findByPath("/non/existent/path")
        })
      )

      expect(result).toBeNull()
    })
  })

  describe("update", () => {
    it("should update upload directory name", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Original Name",
            path: "/test/path",
          })

          const updated = yield* repository.update(created.id, {
            name: "Updated Name",
          })

          expect(updated).toBe(true)

          const found = yield* repository.findById(created.id)
          expect(found?.name).toBe("Updated Name")
          expect(found?.path).toBe("/test/path") // unchanged

          return updated
        })
      )

      expect(result).toBe(true)
    })

    it("should update upload directory model name", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
            modelName: "old-model",
          })

          const updated = yield* repository.update(created.id, {
            modelName: "new-model",
          })

          expect(updated).toBe(true)

          const found = yield* repository.findById(created.id)
          expect(found?.modelName).toBe("new-model")

          return updated
        })
      )

      expect(result).toBe(true)
    })

    it("should update upload directory description", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
            description: "Original description",
          })

          const updated = yield* repository.update(created.id, {
            description: "Updated description",
          })

          expect(updated).toBe(true)

          const found = yield* repository.findById(created.id)
          expect(found?.description).toBe("Updated description")

          return updated
        })
      )

      expect(result).toBe(true)
    })

    it("should update multiple fields at once", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Original Name",
            path: "/test/path",
            modelName: "old-model",
            description: "Original description",
          })

          const updated = yield* repository.update(created.id, {
            name: "Updated Name",
            modelName: "new-model",
            description: "Updated description",
          })

          expect(updated).toBe(true)

          const found = yield* repository.findById(created.id)
          expect(found?.name).toBe("Updated Name")
          expect(found?.modelName).toBe("new-model")
          expect(found?.description).toBe("Updated description")

          return updated
        })
      )

      expect(result).toBe(true)
    })

    it("should return false when updating non-existent directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.update(99999, {
            name: "Updated Name",
          })
        })
      )

      expect(result).toBe(false)
    })

    it("should update updatedAt timestamp", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          const original = yield* repository.findById(created.id)
          const originalUpdatedAt = original?.updatedAt

          // Wait a bit to ensure timestamp changes
          yield* Effect.sleep("10 millis")

          yield* repository.update(created.id, {
            name: "Updated Name",
          })

          const updated = yield* repository.findById(created.id)
          expect(updated?.updatedAt).not.toBe(originalUpdatedAt)

          return true
        })
      )

      expect(result).toBe(true)
    })
  })

  describe("updateLastSynced", () => {
    it("should update last synced timestamp", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          const original = yield* repository.findById(created.id)
          expect(original?.lastSyncedAt).toBeNull()

          const updated = yield* repository.updateLastSynced(created.id)
          expect(updated).toBe(true)

          const after = yield* repository.findById(created.id)
          expect(after?.lastSyncedAt).not.toBeNull()
          expect(after?.lastSyncedAt).toBeTypeOf("string")

          return updated
        })
      )

      expect(result).toBe(true)
    })

    it("should update both lastSyncedAt and updatedAt", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          const original = yield* repository.findById(created.id)
          const originalUpdatedAt = original?.updatedAt

          // Wait to ensure timestamp changes
          yield* Effect.sleep("10 millis")

          yield* repository.updateLastSynced(created.id)

          const after = yield* repository.findById(created.id)
          expect(after?.lastSyncedAt).not.toBeNull()
          expect(after?.updatedAt).not.toBe(originalUpdatedAt)

          return true
        })
      )

      expect(result).toBe(true)
    })

    it("should return false when updating non-existent directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.updateLastSynced(99999)
        })
      )

      expect(result).toBe(false)
    })
  })

  describe("deleteById", () => {
    it("should delete an upload directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          const deleted = yield* repository.deleteById(created.id)
          expect(deleted).toBe(true)

          const found = yield* repository.findById(created.id)
          expect(found).toBeNull()

          return deleted
        })
      )

      expect(result).toBe(true)
    })

    it("should return false when deleting non-existent directory", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository
          return yield* repository.deleteById(99999)
        })
      )

      expect(result).toBe(false)
    })

    it("should allow creating directory with same path after deletion", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          const created1 = yield* repository.create({
            name: "Test Directory",
            path: "/test/path",
          })

          yield* repository.deleteById(created1.id)

          // Should be able to create another directory with the same path
          const created2 = yield* repository.create({
            name: "Test Directory 2",
            path: "/test/path",
          })

          expect(created2.id).not.toBe(created1.id)

          const found = yield* repository.findByPath("/test/path")
          expect(found?.id).toBe(created2.id)
          expect(found?.name).toBe("Test Directory 2")

          return true
        })
      )

      expect(result).toBe(true)
    })
  })

  describe("Integration scenarios", () => {
    it("should handle complete CRUD lifecycle", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          // Create
          const created = yield* repository.create({
            name: "Lifecycle Test",
            path: "/lifecycle/test",
            modelName: "test-model",
            description: "Initial description",
          })

          // Read
          const found = yield* repository.findById(created.id)
          expect(found?.name).toBe("Lifecycle Test")

          // Update
          yield* repository.update(created.id, {
            name: "Updated Name",
            description: "Updated description",
          })

          const updated = yield* repository.findById(created.id)
          expect(updated?.name).toBe("Updated Name")
          expect(updated?.description).toBe("Updated description")

          // Update last synced
          yield* repository.updateLastSynced(created.id)

          const synced = yield* repository.findById(created.id)
          expect(synced?.lastSyncedAt).not.toBeNull()

          // Delete
          const deleted = yield* repository.deleteById(created.id)
          expect(deleted).toBe(true)

          const afterDelete = yield* repository.findById(created.id)
          expect(afterDelete).toBeNull()

          return true
        })
      )

      expect(result).toBe(true)
    })

    it("should handle multiple directories with different paths", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const repository = yield* UploadDirectoryRepository

          // Create multiple directories
          yield* repository.create({ name: "Dir 1", path: "/path/1" })
          yield* repository.create({ name: "Dir 2", path: "/path/2" })
          yield* repository.create({ name: "Dir 3", path: "/path/3" })

          const directories = yield* repository.findAll()
          expect(directories).toHaveLength(3)

          // Each path should be unique and findable
          const dir1 = yield* repository.findByPath("/path/1")
          const dir2 = yield* repository.findByPath("/path/2")
          const dir3 = yield* repository.findByPath("/path/3")

          expect(dir1?.name).toBe("Dir 1")
          expect(dir2?.name).toBe("Dir 2")
          expect(dir3?.name).toBe("Dir 3")

          return true
        })
      )

      expect(result).toBe(true)
    })
  })
})
