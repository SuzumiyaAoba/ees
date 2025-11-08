/**
 * E2E Test Setup and Configuration
 * Configures the test environment for comprehensive API testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { parseJsonResponse, isEmbeddingResponse, type EmbeddingResponse } from "./types/test-types"

// Set test environment BEFORE importing the app to ensure proper layer initialization
process.env["NODE_ENV"] = "test"
process.env["EES_DATABASE_URL"] = ":memory:"
process.env["EES_PROVIDER"] = "ollama"
process.env["EES_OLLAMA_BASE_URL"] = process.env["EES_OLLAMA_BASE_URL"] || "http://localhost:11434"
process.env["EES_OLLAMA_DEFAULT_MODEL"] = process.env["EES_OLLAMA_DEFAULT_MODEL"] || "nomic-embed-text"

import app from "@/app"

interface GlobalWithConsole {
  __originalConsole?: {
    log: typeof console.log
    error: typeof console.error
  }
}

// Global test state
export const testState = {
  createdEmbeddingIds: [] as number[],
  testStartTime: 0,
  isSetupComplete: false,
  defaultConnectionId: null as number | null
}

/**
 * E2E test setup options
 */
export interface E2ETestOptions {
  skipDefaultConnection?: boolean
}

/**
 * Global setup for E2E tests
 */
export async function setupE2ETests(options: E2ETestOptions = {}): Promise<void> {
  beforeAll(async () => {
    // Disable console output during tests (optional)
    if (process.env["TEST_SILENCE"] !== "false") {
      const originalConsoleLog = console.log
      const originalConsoleError = console.error
      console.log = () => {}
      console.error = () => {}

      // Store original functions for cleanup
      ;(global as GlobalWithConsole).__originalConsole = {
        log: originalConsoleLog,
        error: originalConsoleError
      }
    }

    // Initialize test timing
    testState.testStartTime = Date.now()

    // Create and activate default connection for tests (unless skipped)
    if (!options.skipDefaultConnection) {
      try {
        const connectionResponse = await app.request("/connections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "E2E Test Connection",
            type: "ollama",
            baseUrl: process.env["EES_OLLAMA_BASE_URL"] || "http://localhost:11434",
            defaultModel: process.env["EES_OLLAMA_DEFAULT_MODEL"] || "nomic-embed-text",
            isActive: true, // Set active during creation
          }),
        })

        if (connectionResponse.status === 201) {
          const connection = await connectionResponse.json() as { id?: number }
          if (connection.id) {
            testState.defaultConnectionId = connection.id
            console.log("🔧 Default connection created and activated for E2E tests")
          }
        } else {
          console.warn("⚠️  Failed to create default connection for E2E tests - status:", connectionResponse.status)
        }
      } catch (error) {
        console.warn("⚠️  Error setting up default connection:", error)
      }
    } else {
      console.log("⏭️  Skipping default connection setup (test manages connections)")
    }

    testState.isSetupComplete = true

    console.log("🔧 E2E Test environment initialized")
  })

  beforeEach(() => {
    // Reset test state for each test
    testState.createdEmbeddingIds = []
  })

  afterEach(async () => {
    // Cleanup created embeddings after each test
    await cleanupTestEmbeddings()
  })

  afterAll(async () => {
    // Restore console functions
    const globalWithConsole = global as GlobalWithConsole
    if (globalWithConsole.__originalConsole) {
      console.log = globalWithConsole.__originalConsole.log
      console.error = globalWithConsole.__originalConsole.error
    }

    // Final cleanup
    await cleanupTestEmbeddings()

    // Clean up default connection if it was created
    if (testState.defaultConnectionId) {
      try {
        await app.request(`/connections/${testState.defaultConnectionId}`, {
          method: "DELETE"
        })
        console.log("🧹 Default connection cleaned up")
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    const testDuration = Date.now() - testState.testStartTime
    console.log(`✅ E2E Tests completed in ${testDuration}ms`)

    // Clean up environment
    delete process.env["NODE_ENV"]
    delete process.env["EES_DATABASE_URL"]
  })
}

/**
 * Cleanup function to remove test embeddings
 */
async function cleanupTestEmbeddings(): Promise<void> {
  for (const id of testState.createdEmbeddingIds) {
    try {
      await app.request(`/embeddings/${id}`, {
        method: "DELETE"
      })
    } catch (error) {
      // Ignore cleanup errors - embedding might already be deleted
      // or the service might be unavailable
    }
  }
  testState.createdEmbeddingIds = []
}

/**
 * Helper to register created embedding for cleanup
 */
export function registerEmbeddingForCleanup(id: number): void {
  testState.createdEmbeddingIds.push(id)
}

/**
 * Helper to get the test app instance
 */
export function getTestApp() {
  return app
}


/**
 * Wait for service dependencies to be available
 */
export async function waitForServices(timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      // Test basic health check
      const response = await app.request("/")
      if (response.status === 200) {
        // Also check if we can create an embedding to verify full service readiness
        try {
          const testResponse = await app.request("/embeddings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uri: "service-readiness-test",
              text: "Test document to verify service readiness."
            }),
          })

          if (testResponse.status === 200) {
            // Clean up the test embedding
            const embedding = await testResponse.json() as { id?: number }
            if (embedding.id) {
              await app.request(`/embeddings/${embedding.id}`, {
                method: "DELETE"
              })
            }
            return true
          }
        } catch (embeddingError) {
          // Service partially ready, continue waiting
          // In CI environment with Ollama unavailable, continue anyway
          if (process.env["CI"] === "true") {
            console.log("⚠️  Ollama service not fully available in CI - continuing with limited functionality")
            return true
          }
        }
      }
    } catch (error) {
      // Service not ready yet
    }

    // Wait 500ms before retry (longer interval for external services)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  if (process.env["CI"] === "true") {
    console.log("⚠️  Services not fully ready in CI environment - continuing with limited functionality")
    return true
  }

  return false
}

/**
 * Check if Ollama service is available for tests
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (process.env["OLLAMA_UNAVAILABLE"] === "true") {
    console.log("Ollama marked as unavailable via OLLAMA_UNAVAILABLE env var")
    return false
  }

  try {
    const response = await fetch("http://localhost:11434/api/version", {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    })
    const available = response.ok
    if (!available) {
      console.log("Ollama health check failed with status:", response.status)
    }
    return available
  } catch (error) {
    console.log("Ollama not available:", error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * Skip test if Ollama is not available in CI environment
 */
export function skipIfOllamaUnavailable(testFn: () => void | Promise<void>) {
  return async () => {
    if (process.env["CI"] === "true") {
      const available = await isOllamaAvailable()
      if (!available) {
        console.log("Skipping test - Ollama service not available in CI")
        return // Skip the test
      }
    }
    return testFn()
  }
}

/**
 * Create a test embedding and register it for cleanup
 */
export async function createTestEmbedding(
  uri: string,
  text: string,
  modelName?: string
): Promise<EmbeddingResponse> {
  const response = await app.request("/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uri,
      text,
      model_name: modelName || "nomic-embed-text"
    }),
  })

  if (response.status === 200) {
    const embedding = await parseJsonResponse(response, isEmbeddingResponse)
    registerEmbeddingForCleanup(embedding.id)
    return embedding
  }

  throw new Error(`Failed to create test embedding: ${response.status}`)
}

/**
 * Enhanced error handling for tests
 */
export function handleTestError(error: unknown, context: string): void {
  console.error(`Test error in ${context}:`, error)

  if (error && typeof error === 'object' && 'response' in error) {
    console.error("Response status:", (error as { response: { status: unknown } }).response.status)
    console.error("Response headers:", (error as { response: { headers: unknown } }).response.headers)
  }

  throw error
}

/**
 * Test environment validation
 */
export function validateTestEnvironment(): void {
  if (!testState.isSetupComplete) {
    throw new Error("E2E test environment not properly initialized")
  }

  if (process.env["NODE_ENV"] !== "test") {
    throw new Error("Tests must run in NODE_ENV=test")
  }

  if (process.env["EES_DATABASE_URL"] !== ":memory:") {
    console.warn("Warning: Not using in-memory database for tests")
  }
}