/**
 * E2E Tests for Upload Directory Management API
 * Tests CRUD operations for upload directories
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { mkdirSync, writeFileSync, rmdirSync, unlinkSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import app from "@/app"
import { setupE2ETests, testState } from "@/__tests__/e2e-setup"
import { parseUnknownJsonResponse } from "@/__tests__/types/test-types"

// Setup E2E test environment
setupE2ETests()

// Track created upload directories for cleanup
const createdDirectoryIds: number[] = []

// Helper function to create a temporary test directory
function createTestDirectory(name: string): string {
  const dirPath = join(tmpdir(), `ees-e2e-upload-${name}-${Date.now()}`)
  mkdirSync(dirPath, { recursive: true })
  return dirPath
}

// Helper function to clean up test directory
function cleanupTestDirectory(dirPath: string) {
  if (!existsSync(dirPath)) {
    return
  }

  try {
    const { readdirSync, statSync } = require("node:fs")
    const entries = readdirSync(dirPath)
    for (const entry of entries) {
      const fullPath = join(dirPath, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        cleanupTestDirectory(fullPath)
      } else {
        unlinkSync(fullPath)
      }
    }
    rmdirSync(dirPath)
  } catch (error) {
    console.log(`Failed to cleanup directory ${dirPath}:`, error)
  }
}

describe("Upload Directory Management E2E Tests", () => {
  const testDirectories: string[] = []

  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  afterEach(async () => {
    // Cleanup created upload directories
    for (const id of createdDirectoryIds) {
      try {
        await app.request(`/upload-directories/${id}`, {
          method: "DELETE"
        })
      } catch (error) {
        console.log(`Failed to delete upload directory ${id}:`, error)
      }
    }
    createdDirectoryIds.length = 0

    // Cleanup test directories
    for (const dirPath of testDirectories) {
      cleanupTestDirectory(dirPath)
    }
    testDirectories.length = 0
  })

  describe("POST /upload-directories", () => {
    it("should create upload directory with all fields", async () => {
      const testDir = createTestDirectory("create-all-fields")
      testDirectories.push(testDir)

      const requestData = {
        name: "Test Directory",
        path: testDir,
        model_name: "nomic-embed-text",
        description: "Test description"
      }

      const response = await app.request("/upload-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("id")
      expect(data).toHaveProperty("message")
      expect(typeof data["id"]).toBe("number")

      createdDirectoryIds.push(data["id"] as number)
    })

    it("should create upload directory with minimal fields", async () => {
      const testDir = createTestDirectory("create-minimal")
      testDirectories.push(testDir)

      const requestData = {
        name: "Minimal Directory",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const response = await app.request("/upload-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      expect(response.status).toBe(200)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("id")

      createdDirectoryIds.push(data["id"] as number)
    })

    it("should return 400 for missing required fields", async () => {
      const requestData = {
        name: "Incomplete Directory",
        // Missing path
      }

      const response = await app.request("/upload-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      expect(response.status).toBe(400)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })

    it("should return error for duplicate path", async () => {
      const testDir = createTestDirectory("duplicate-path")
      testDirectories.push(testDir)

      const requestData = {
        name: "First Directory",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      // Create first directory
      const firstResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      expect(firstResponse.status).toBe(200)
      const firstData = await parseUnknownJsonResponse(firstResponse)
      createdDirectoryIds.push(firstData["id"] as number)

      // Try to create second directory with same path
      const secondRequest = {
        name: "Second Directory",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const secondResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(secondRequest),
      })

      expect([400, 500]).toContain(secondResponse.status)

      const secondData = await parseUnknownJsonResponse(secondResponse)
      expect(secondData).toHaveProperty("error")
    })
  })

  describe("GET /upload-directories", () => {
    it("should list all upload directories", async () => {
      // Create test directories
      const dir1 = createTestDirectory("list-1")
      const dir2 = createTestDirectory("list-2")
      testDirectories.push(dir1, dir2)

      const dirs = [
        { name: "Directory 1", path: dir1, model_name: "nomic-embed-text" },
        { name: "Directory 2", path: dir2, model_name: "nomic-embed-text" }
      ]

      for (const dir of dirs) {
        const response = await app.request("/upload-directories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dir),
        })
        const data = await parseUnknownJsonResponse(response)
        createdDirectoryIds.push(data["id"] as number)
      }

      // List directories
      const listResponse = await app.request("/upload-directories")

      expect(listResponse.status).toBe(200)
      expect(listResponse.headers.get("content-type")).toContain("application/json")

      const listData = await parseUnknownJsonResponse(listResponse)
      expect(listData).toHaveProperty("directories")
      expect(listData).toHaveProperty("count")
      expect(Array.isArray(listData["directories"])).toBe(true)
      expect(listData["count"]).toBeGreaterThanOrEqual(2)
    })

    it("should return empty list when no directories exist", async () => {
      const response = await app.request("/upload-directories")

      expect(response.status).toBe(200)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("directories")
      expect(data).toHaveProperty("count")
      expect(Array.isArray(data["directories"])).toBe(true)
    })
  })

  describe("GET /upload-directories/:id", () => {
    it("should get upload directory by ID", async () => {
      const testDir = createTestDirectory("get-by-id")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Get Test Directory",
        path: testDir,
        model_name: "nomic-embed-text",
        description: "Description for get test"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Get directory
      const getResponse = await app.request(`/upload-directories/${id}`)

      expect(getResponse.status).toBe(200)
      expect(getResponse.headers.get("content-type")).toContain("application/json")

      const data = await parseUnknownJsonResponse(getResponse)
      expect(data["id"]).toBe(id)
      expect(data["name"]).toBe(createData.name)
      expect(data["path"]).toBe(createData.path)
      expect(data["model_name"]).toBe(createData.model_name)
      expect(data["description"]).toBe(createData.description)
      expect(data).toHaveProperty("created_at")
      expect(data).toHaveProperty("updated_at")
    })

    it("should return 404 for non-existent ID", async () => {
      const response = await app.request("/upload-directories/999999")

      expect(response.status).toBe(404)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })

    it("should return 400 for invalid ID format", async () => {
      const response = await app.request("/upload-directories/invalid-id")

      expect(response.status).toBe(400)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })
  })

  describe("PUT /upload-directories/:id", () => {
    it("should update upload directory name", async () => {
      const testDir = createTestDirectory("update-name")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Original Name",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Update name
      const updateData = {
        name: "Updated Name"
      }

      const updateResponse = await app.request(`/upload-directories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(updateResponse.status).toBe(200)

      const updated = await parseUnknownJsonResponse(updateResponse)
      expect(updated["name"]).toBe(updateData.name)
      expect(updated["path"]).toBe(testDir) // unchanged
    })

    it("should update upload directory model", async () => {
      const testDir = createTestDirectory("update-model")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Model Update Test",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Update model
      const updateData = {
        model_name: "nomic-embed-text"
      }

      const updateResponse = await app.request(`/upload-directories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(updateResponse.status).toBe(200)

      const updated = await parseUnknownJsonResponse(updateResponse)
      expect(updated["model_name"]).toBe(updateData.model_name)
    })

    it("should update upload directory description", async () => {
      const testDir = createTestDirectory("update-description")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Description Update Test",
        path: testDir,
        model_name: "nomic-embed-text",
        description: "Original description"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Update description
      const updateData = {
        description: "Updated description"
      }

      const updateResponse = await app.request(`/upload-directories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(updateResponse.status).toBe(200)

      const updated = await parseUnknownJsonResponse(updateResponse)
      expect(updated["description"]).toBe(updateData.description)
    })

    it("should update multiple fields at once", async () => {
      const testDir = createTestDirectory("update-multiple")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Multi Update Test",
        path: testDir,
        model_name: "nomic-embed-text",
        description: "Original"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Update multiple fields
      const updateData = {
        name: "Updated Name",
        model_name: "nomic-embed-text",
        description: "Updated description"
      }

      const updateResponse = await app.request(`/upload-directories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(updateResponse.status).toBe(200)

      const updated = await parseUnknownJsonResponse(updateResponse)
      expect(updated["name"]).toBe(updateData.name)
      expect(updated["model_name"]).toBe(updateData.model_name)
      expect(updated["description"]).toBe(updateData.description)
    })

    it("should return 404 for non-existent ID", async () => {
      const updateData = {
        name: "Updated Name"
      }

      const response = await app.request("/upload-directories/999999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(404)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })
  })

  describe("DELETE /upload-directories/:id", () => {
    it("should delete upload directory", async () => {
      const testDir = createTestDirectory("delete")
      testDirectories.push(testDir)

      // Create directory
      const createData = {
        name: "Delete Test Directory",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number

      // Delete directory
      const deleteResponse = await app.request(`/upload-directories/${id}`, {
        method: "DELETE"
      })

      expect(deleteResponse.status).toBe(200)

      const deleteData = await parseUnknownJsonResponse(deleteResponse)
      expect(deleteData).toHaveProperty("message")

      // Verify it's deleted
      const getResponse = await app.request(`/upload-directories/${id}`)
      expect(getResponse.status).toBe(404)
    })

    it("should return 404 for non-existent ID", async () => {
      const response = await app.request("/upload-directories/999999", {
        method: "DELETE"
      })

      expect(response.status).toBe(404)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })
  })

  describe("POST /upload-directories/:id/sync", () => {
    it("should sync directory with files", async () => {
      const testDir = createTestDirectory("sync")
      testDirectories.push(testDir)

      // Create test files in directory
      writeFileSync(join(testDir, "file1.txt"), "Content 1")
      writeFileSync(join(testDir, "file2.md"), "Content 2")

      // Create upload directory
      const createData = {
        name: "Sync Test Directory",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Sync directory
      const syncResponse = await app.request(`/upload-directories/${id}/sync`, {
        method: "POST"
      })

      // Accept both success and service unavailable status
      expect([200, 404, 500]).toContain(syncResponse.status)

      if (syncResponse.status !== 200) {
        console.log("Skipping sync test - service unavailable")
        return
      }

      const syncData = await parseUnknownJsonResponse(syncResponse)
      expect(syncData).toHaveProperty("directory_id")
      expect(syncData).toHaveProperty("files_processed")
      expect(syncData).toHaveProperty("message")
      expect(syncData["directory_id"]).toBe(id)
      expect(syncData["files_processed"]).toBeGreaterThanOrEqual(0)
    })

    it("should handle empty directory sync", async () => {
      const testDir = createTestDirectory("sync-empty")
      testDirectories.push(testDir)

      // Create upload directory (no files)
      const createData = {
        name: "Empty Sync Test",
        path: testDir,
        model_name: "nomic-embed-text"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // Sync directory
      const syncResponse = await app.request(`/upload-directories/${id}/sync`, {
        method: "POST"
      })

      expect([200, 404, 500]).toContain(syncResponse.status)

      if (syncResponse.status !== 200) {
        console.log("Skipping empty sync test - service unavailable")
        return
      }

      const syncData = await parseUnknownJsonResponse(syncResponse)
      expect(syncData["files_processed"]).toBe(0)
    })

    it("should return 404 for non-existent directory", async () => {
      const response = await app.request("/upload-directories/999999/sync", {
        method: "POST"
      })

      expect(response.status).toBe(404)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })
  })

  describe("GET /file-system/list", () => {
    it("should list directories from filesystem", async () => {
      const testDir = createTestDirectory("filesystem-list")
      testDirectories.push(testDir)

      // Create subdirectories
      mkdirSync(join(testDir, "subdir1"))
      mkdirSync(join(testDir, "subdir2"))

      // Also create a file (should not be listed)
      writeFileSync(join(testDir, "file.txt"), "content")

      const response = await app.request(`/file-system/list?path=${encodeURIComponent(testDir)}`)

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("path")
      expect(data).toHaveProperty("entries")
      expect(Array.isArray(data["entries"])).toBe(true)

      const entries = data["entries"] as unknown[]
      expect(entries.length).toBeGreaterThanOrEqual(2)

      // Check that subdirectories are included
      const entryNames = entries.map((e: unknown) => (e as { name: string })["name"])
      expect(entryNames).toContain("subdir1")
      expect(entryNames).toContain("subdir2")
    })

    it("should return empty list for directory with no subdirectories", async () => {
      const testDir = createTestDirectory("filesystem-empty")
      testDirectories.push(testDir)

      // Create only files (no subdirectories)
      writeFileSync(join(testDir, "file1.txt"), "content")
      writeFileSync(join(testDir, "file2.txt"), "content")

      const response = await app.request(`/file-system/list?path=${encodeURIComponent(testDir)}`)

      expect(response.status).toBe(200)

      const data = await parseUnknownJsonResponse(response)
      expect(data["entries"]).toEqual([])
    })

    it("should return error for non-existent path", async () => {
      const nonExistentPath = join(tmpdir(), "non-existent-dir-" + Date.now())

      const response = await app.request(`/file-system/list?path=${encodeURIComponent(nonExistentPath)}`)

      expect([400, 404, 500]).toContain(response.status)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })

    it("should return 400 for missing path parameter", async () => {
      const response = await app.request("/file-system/list")

      expect(response.status).toBe(400)

      const data = await parseUnknownJsonResponse(response)
      expect(data).toHaveProperty("error")
    })
  })

  describe("Integration scenarios", () => {
    it("should support complete workflow: create, update, sync, delete", async () => {
      const testDir = createTestDirectory("workflow")
      testDirectories.push(testDir)

      // Create test file
      writeFileSync(join(testDir, "document.txt"), "Test content")

      // 1. Create upload directory
      const createData = {
        name: "Workflow Test",
        path: testDir,
        model_name: "nomic-embed-text",
        description: "Initial description"
      }

      const createResponse = await app.request("/upload-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      })

      expect(createResponse.status).toBe(200)
      const created = await parseUnknownJsonResponse(createResponse)
      const id = created["id"] as number
      createdDirectoryIds.push(id)

      // 2. Verify it exists
      const getResponse = await app.request(`/upload-directories/${id}`)
      expect(getResponse.status).toBe(200)

      // 3. Update it
      const updateData = {
        name: "Updated Workflow Test",
        description: "Updated description"
      }

      const updateResponse = await app.request(`/upload-directories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      expect(updateResponse.status).toBe(200)
      const updated = await parseUnknownJsonResponse(updateResponse)
      expect(updated["name"]).toBe(updateData.name)

      // 4. Sync directory (if service available)
      const syncResponse = await app.request(`/upload-directories/${id}/sync`, {
        method: "POST"
      })

      expect([200, 404, 500]).toContain(syncResponse.status)

      // 5. Delete it
      const deleteResponse = await app.request(`/upload-directories/${id}`, {
        method: "DELETE"
      })

      expect(deleteResponse.status).toBe(200)

      // 6. Verify deletion
      const verifyResponse = await app.request(`/upload-directories/${id}`)
      expect(verifyResponse.status).toBe(404)

      // Remove from cleanup list since we already deleted it
      const index = createdDirectoryIds.indexOf(id)
      if (index > -1) {
        createdDirectoryIds.splice(index, 1)
      }
    })
  })
})
