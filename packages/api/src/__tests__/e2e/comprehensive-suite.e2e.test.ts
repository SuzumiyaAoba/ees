/**
 * Comprehensive E2E Test Suite Configuration
 * Orchestrates all E2E tests and provides suite-level reporting
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { setupE2ETests, testState } from "../e2e-setup"

// Import all test suites
import "./health-and-docs-only.e2e.test"
import "./embedding-lifecycle.e2e.test"
import "./search-functionality.e2e.test"
import "./batch-operations.e2e.test"
import "./error-handling.e2e.test"
import "./performance-load.e2e.test"
import "./integration-external.e2e.test"

// Setup E2E test environment
setupE2ETests()

describe("Comprehensive E2E Test Suite", () => {
  let suiteStartTime: number

  beforeAll(async () => {
    suiteStartTime = Date.now()
    console.log("\n🚀 Starting Comprehensive E2E Test Suite")
    console.log("=" .repeat(60))

    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }

    console.log("✅ Test environment initialized successfully")
    console.log(`📊 Test started at: ${new Date().toISOString()}`)

    // Check for CI environment and external service availability
    const isCI = process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true'
    if (isCI) {
      console.log("🔧 CI environment detected - checking service readiness...")

      // Import waitForServices from e2e-setup
      const { waitForServices } = await import("../e2e-setup")

      const servicesReady = await waitForServices(60000) // 60 second timeout for CI
      if (!servicesReady) {
        console.warn("⚠️ External services not fully ready - some tests may be skipped")
      } else {
        console.log("✅ All external services are ready")
      }
    }
  }, 90000) // 90 second timeout for CI setup

  afterAll(async () => {
    const suiteDuration = Date.now() - suiteStartTime
    console.log("\n" + "=" .repeat(60))
    console.log("🏁 Comprehensive E2E Test Suite Complete")
    console.log(`⏱️  Total suite duration: ${suiteDuration}ms (${(suiteDuration / 1000).toFixed(2)}s)`)
    console.log(`📈 Embeddings created: ${testState.createdEmbeddingIds.length}`)
    console.log(`🧹 Cleanup completed successfully`)
    console.log(`📅 Test completed at: ${new Date().toISOString()}`)
  })

  describe("Test Suite Validation", () => {
    it("should have proper test environment setup", () => {
      expect(testState.isSetupComplete).toBe(true)
      expect(process.env["NODE_ENV"]).toBe("test")
      expect(process.env["EES_DATABASE_URL"]).toBe(":memory:")
    })

    it("should have test state tracking", () => {
      expect(testState).toHaveProperty("createdEmbeddingIds")
      expect(testState).toHaveProperty("testStartTime")
      expect(testState).toHaveProperty("isSetupComplete")
      expect(Array.isArray(testState.createdEmbeddingIds)).toBe(true)
    })
  })
})

/**
 * Test Coverage Summary
 *
 * This comprehensive E2E test suite covers:
 *
 * 1. 📋 Health and Documentation Tests (health-and-docs-only.e2e.test.ts)
 *    - API health checks
 *    - OpenAPI specification validation
 *    - Swagger UI functionality
 *    - Basic error handling
 *
 * 2. 🔄 Embedding Lifecycle Tests (embedding-lifecycle.e2e.test.ts)
 *    - Create embeddings (minimal and complete)
 *    - Retrieve embeddings by URI
 *    - List embeddings with pagination
 *    - Delete embeddings by ID
 *    - URI uniqueness handling
 *    - Content preservation validation
 *
 * 3. 🔍 Search Functionality Tests (search-functionality.e2e.test.ts)
 *    - Basic search queries
 *    - Search with similarity thresholds
 *    - Search result limiting
 *    - Different similarity metrics (cosine, euclidean, dot_product)
 *    - Model-specific searches
 *    - Multilingual search capabilities
 *    - Search result consistency
 *    - Edge cases (empty queries, invalid parameters)
 *
 * 4. 📦 Batch Operations Tests (batch-operations.e2e.test.ts)
 *    - Multiple embedding creation in single request
 *    - Mixed model names in batches
 *    - Large batch processing (50+ items)
 *    - Mixed content types and sizes
 *    - Partial batch failure handling
 *    - Batch processing order maintenance
 *    - Duplicate URI handling in batches
 *    - Batch timeout handling
 *    - Performance validation for batch operations
 *
 * 5. ⚠️ Error Handling and Edge Cases (error-handling.e2e.test.ts)
 *    - Request validation errors
 *    - HTTP method validation
 *    - Content-Type handling
 *    - Parameter validation
 *    - Resource not found scenarios
 *    - Large payload handling
 *    - Special character processing
 *    - Concurrent request handling
 *    - Edge case text content
 *
 * 6. ⚡ Performance and Load Tests (performance-load.e2e.test.ts)
 *    - Single operation performance
 *    - Batch operation performance
 *    - Concurrent load testing
 *    - Stress testing with rapid requests
 *    - Variable document size performance
 *    - Memory and resource cleanup
 *    - Performance threshold validation
 *
 * 7. 🔗 External Service Integration (integration-external.e2e.test.ts)
 *    - Model provider integration
 *    - Model compatibility checking
 *    - Provider management
 *    - File upload capabilities
 *    - Service resilience testing
 *    - Rate limiting handling
 *    - Configuration validation
 *
 * Key Features:
 * - ✅ Type-safe test implementations
 * - 🧹 Automatic resource cleanup
 * - 📊 Performance monitoring
 * - 🌍 Multilingual support testing
 * - 🔄 Comprehensive lifecycle coverage
 * - ⚡ Load and stress testing
 * - 🛡️ Error boundary validation
 * - 📈 Metrics and reporting
 *
 * Test Environment:
 * - In-memory database for isolation
 * - Mocked external dependencies where appropriate
 * - Proper setup and teardown procedures
 * - Performance threshold validation
 * - Comprehensive error scenario coverage
 */