/**
 * E2E Test Setup and Configuration
 * Configures the test environment for comprehensive API testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import app from "@/app"

// Global test state
export const testState = {
  createdEmbeddingIds: [] as number[],
  testStartTime: 0,
  isSetupComplete: false
}

/**
 * Global setup for E2E tests
 */
export async function setupE2ETests(): Promise<void> {
  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = "test"
    process.env.EES_DATABASE_URL = ":memory:"

    // Disable console output during tests (optional)
    if (process.env.TEST_SILENCE !== "false") {
      const originalConsoleLog = console.log
      const originalConsoleError = console.error
      console.log = () => {}
      console.error = () => {}

      // Store original functions for cleanup
      ;(global as any).__originalConsole = {
        log: originalConsoleLog,
        error: originalConsoleError
      }
    }

    // Initialize test timing
    testState.testStartTime = Date.now()
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
    if ((global as any).__originalConsole) {
      console.log = (global as any).__originalConsole.log
      console.error = (global as any).__originalConsole.error
    }

    // Final cleanup
    await cleanupTestEmbeddings()

    const testDuration = Date.now() - testState.testStartTime
    console.log(`✅ E2E Tests completed in ${testDuration}ms`)

    // Clean up environment
    delete process.env.NODE_ENV
    delete process.env.EES_DATABASE_URL
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
 * Mock provider configuration for testing
 */
export function setupMockProviders(): void {
  // Mock Ollama provider responses
  process.env.EES_PROVIDER = "ollama"
  process.env.EES_OLLAMA_BASE_URL = "http://localhost:11434"
  process.env.EES_OLLAMA_DEFAULT_MODEL = "nomic-embed-text"

  // Disable other providers for testing
  delete process.env.EES_OPENAI_API_KEY
  delete process.env.EES_GOOGLE_API_KEY
  delete process.env.EES_COHERE_API_KEY
  delete process.env.EES_MISTRAL_API_KEY
}

/**
 * Wait for service dependencies to be available
 */
export async function waitForServices(timeout: number = 10000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      // Test basic health check
      const response = await app.request("/")
      if (response.status === 200) {
        return true
      }
    } catch (error) {
      // Service not ready yet
    }

    // Wait 100ms before retry
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return false
}

/**
 * Create a test embedding and register it for cleanup
 */
export async function createTestEmbedding(
  uri: string,
  text: string,
  modelName?: string
): Promise<any> {
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
    const embedding = await response.json()
    registerEmbeddingForCleanup(embedding.id)
    return embedding
  }

  throw new Error(`Failed to create test embedding: ${response.status}`)
}

/**
 * Enhanced error handling for tests
 */
export function handleTestError(error: any, context: string): void {
  console.error(`Test error in ${context}:`, error)

  if (error.response) {
    console.error("Response status:", error.response.status)
    console.error("Response headers:", error.response.headers)
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

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Tests must run in NODE_ENV=test")
  }

  if (process.env.EES_DATABASE_URL !== ":memory:") {
    console.warn("Warning: Not using in-memory database for tests")
  }
}