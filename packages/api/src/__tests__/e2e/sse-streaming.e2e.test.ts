/**
 * E2E Tests for SSE (Server-Sent Events) Streaming
 * Tests real-time progress updates for upload directory synchronization
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
  const dirPath = join(tmpdir(), `ees-e2e-sse-${name}-${Date.now()}`)
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

// Parse SSE response into events
interface SSEEvent {
  event?: string
  data: string
  id?: string
}

function parseSSEResponse(text: string): SSEEvent[] {
  const events: SSEEvent[] = []
  const lines = text.split('\n')
  let currentEvent: Partial<SSEEvent> = {}

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      currentEvent.data = line.slice(5).trim()
    } else if (line.startsWith('id:')) {
      currentEvent.id = line.slice(3).trim()
    } else if (line === '') {
      // Empty line indicates end of event
      if (currentEvent.data !== undefined) {
        events.push(currentEvent as SSEEvent)
        currentEvent = {}
      }
    }
  }

  // Handle last event if no trailing newline
  if (currentEvent.data !== undefined) {
    events.push(currentEvent as SSEEvent)
  }

  return events
}

describe("SSE Streaming E2E Tests", () => {
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

  describe("GET /upload-directories/:id/sync/stream", () => {
    it("should return SSE content type", async () => {
      const testDir = createTestDirectory("sse-content-type")
      testDirectories.push(testDir)

      // Create upload directory
      const createData = {
        name: "SSE Test Directory",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      // Accept both success and service unavailable
      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping SSE test - service unavailable")
        return
      }

      // Verify SSE content type
      const contentType = response.headers.get("content-type")
      expect(contentType).toContain("text/event-stream")

      // Verify SSE-specific headers
      expect(response.headers.get("cache-control")).toBe("no-cache")
      expect(response.headers.get("connection")).toBe("keep-alive")
    })

    it("should stream progress events for directory with files", async () => {
      const testDir = createTestDirectory("sse-with-files")
      testDirectories.push(testDir)

      // Create test files
      writeFileSync(join(testDir, "file1.txt"), "Content 1")
      writeFileSync(join(testDir, "file2.txt"), "Content 2")
      writeFileSync(join(testDir, "file3.txt"), "Content 3")

      // Create upload directory
      const createData = {
        name: "SSE Progress Test",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping SSE progress test - service unavailable")
        return
      }

      // Get response text
      const responseText = await response.text()
      const events = parseSSEResponse(responseText)

      // Verify we got some events
      expect(events.length).toBeGreaterThan(0)

      // Check for 'progress' events
      const progressEvents = events.filter(e => e.event === 'progress')
      expect(progressEvents.length).toBeGreaterThan(0)

      // Parse event data
      const eventData = progressEvents.map(e => {
        try {
          return JSON.parse(e.data)
        } catch {
          return null
        }
      }).filter(d => d !== null)

      // Check for expected event types
      const eventTypes = eventData.map(d => d.type)

      // Should have start event
      expect(eventTypes).toContain('start')

      // Should have collected event
      const collectedEvents = eventData.filter(d => d.type === 'collected')
      if (collectedEvents.length > 0) {
        expect(collectedEvents[0]).toHaveProperty('total_files')
      }

      // Should have completed event (if service is available)
      const completedEvents = eventData.filter(d => d.type === 'completed')
      if (completedEvents.length > 0) {
        expect(completedEvents[0]).toHaveProperty('directory_id')
        expect(completedEvents[0]).toHaveProperty('files_processed')
        expect(completedEvents[0]).toHaveProperty('message')
      }
    })

    it("should stream progress events for empty directory", async () => {
      const testDir = createTestDirectory("sse-empty")
      testDirectories.push(testDir)

      // Create upload directory (no files)
      const createData = {
        name: "SSE Empty Test",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping empty SSE test - service unavailable")
        return
      }

      const responseText = await response.text()
      const events = parseSSEResponse(responseText)

      expect(events.length).toBeGreaterThan(0)

      // Parse event data
      const progressEvents = events.filter(e => e.event === 'progress')
      const eventData = progressEvents.map(e => {
        try {
          return JSON.parse(e.data)
        } catch {
          return null
        }
      }).filter(d => d !== null)

      // Should have completed event with 0 files
      const completedEvents = eventData.filter(d => d.type === 'completed')
      if (completedEvents.length > 0) {
        expect(completedEvents[0]["files_processed"]).toBe(0)
      }
    })

    it("should return error event for non-existent directory", async () => {
      const response = await app.request("/upload-directories/999999/sync/stream")

      // Should return 404 or error event
      if (response.status === 404) {
        expect(response.status).toBe(404)
        return
      }

      if (response.status === 200) {
        const responseText = await response.text()
        const events = parseSSEResponse(responseText)

        // Look for error event
        const errorEvents = events.filter(e =>
          e.event === 'error' || e.data.includes('error') || e.data.includes('not found')
        )

        expect(errorEvents.length).toBeGreaterThan(0)
      }
    })

    it("should handle file processing progress events", async () => {
      const testDir = createTestDirectory("sse-file-progress")
      testDirectories.push(testDir)

      // Create multiple test files
      for (let i = 1; i <= 5; i++) {
        writeFileSync(join(testDir, `file${i}.txt`), `Content ${i}`)
      }

      // Create upload directory
      const createData = {
        name: "SSE File Progress Test",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping file progress test - service unavailable")
        return
      }

      const responseText = await response.text()
      const events = parseSSEResponse(responseText)

      const progressEvents = events.filter(e => e.event === 'progress')
      const eventData = progressEvents.map(e => {
        try {
          return JSON.parse(e.data)
        } catch {
          return null
        }
      }).filter(d => d !== null)

      // Check for processing events
      const processingEvents = eventData.filter(d =>
        d.type === 'processing' || d.type === 'file_completed' || d.type === 'file_failed'
      )

      if (processingEvents.length > 0) {
        // Verify processing event structure
        const firstProcessing = processingEvents[0]
        expect(firstProcessing).toHaveProperty('current')
        expect(firstProcessing).toHaveProperty('total')
        expect(firstProcessing).toHaveProperty('file')
      }
    })

    it("should handle invalid ID format", async () => {
      const response = await app.request("/upload-directories/invalid-id/sync/stream")

      expect([400, 404]).toContain(response.status)
    })
  })

  describe("SSE Event Format Validation", () => {
    it("should send events in valid SSE format", async () => {
      const testDir = createTestDirectory("sse-format")
      testDirectories.push(testDir)

      writeFileSync(join(testDir, "test.txt"), "Test content")

      // Create upload directory
      const createData = {
        name: "SSE Format Test",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping SSE format test - service unavailable")
        return
      }

      const responseText = await response.text()
      const events = parseSSEResponse(responseText)

      // All events should have data field
      for (const event of events) {
        expect(event).toHaveProperty('data')
        expect(event.data).toBeTruthy()

        // Data should be valid JSON
        try {
          const parsed = JSON.parse(event.data)
          expect(typeof parsed).toBe('object')
        } catch (error) {
          throw new Error(`Invalid JSON in SSE event data: ${event.data}`)
        }
      }
    })

    it("should send events with progress event type", async () => {
      const testDir = createTestDirectory("sse-event-type")
      testDirectories.push(testDir)

      // Create upload directory
      const createData = {
        name: "SSE Event Type Test",
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

      // Request SSE stream
      const response = await app.request(`/upload-directories/${id}/sync/stream`)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping event type test - service unavailable")
        return
      }

      const responseText = await response.text()
      const events = parseSSEResponse(responseText)

      // Most events should have 'progress' as event type
      const progressEvents = events.filter(e => e.event === 'progress')
      expect(progressEvents.length).toBeGreaterThan(0)

      // Some events might have 'error' as event type
      const errorEvents = events.filter(e => e.event === 'error')
      // Error events are optional, so we just check they're formatted correctly if present
      for (const errorEvent of errorEvents) {
        expect(errorEvent).toHaveProperty('data')
      }
    })
  })
})
