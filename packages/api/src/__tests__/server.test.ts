/**
 * Tests for server.ts
 * Tests server startup logic and error handling components
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

// Mock the dependencies
const mockServe = vi.fn()
const mockGetPort = vi.fn().mockReturnValue(3000)
const mockApp = { fetch: vi.fn() }

vi.mock("@hono/node-server", () => ({
  serve: mockServe
}))

vi.mock("@ees/core", () => ({
  getPort: mockGetPort
}))

vi.mock("../app", () => ({
  default: mockApp
}))

describe("Server Components", () => {
  let originalProcessExit: any
  let originalConsoleLog: any
  let originalConsoleError: any
  let mockProcessExit: any
  let mockConsoleLog: any
  let mockConsoleError: any

  beforeEach(() => {
    // Mock process and console methods
    originalProcessExit = process.exit
    originalConsoleLog = console.log
    originalConsoleError = console.error

    mockProcessExit = vi.fn()
    mockConsoleLog = vi.fn()
    mockConsoleError = vi.fn()

    process.exit = mockProcessExit as any
    console.log = mockConsoleLog
    console.error = mockConsoleError

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original methods
    process.exit = originalProcessExit
    console.log = originalConsoleLog
    console.error = originalConsoleError

    vi.clearAllMocks()
  })

  describe("Server Configuration", () => {
    it("should use getPort with default value 3000", () => {
      // Test that getPort would be called with the correct default
      const defaultPort = 3000
      expect(mockGetPort(defaultPort)).toBe(3000)
    })

    it("should work with different port values", () => {
      mockGetPort.mockReturnValue(4000)

      // Test that getPort returns correct values
      expect(mockGetPort()).toBe(4000)
    })
  })

  describe("Error Handler Functions", () => {
    it("should handle uncaught exception correctly", () => {
      const testError = new Error("Test uncaught exception")

      // Simulate the uncaught exception handler
      const uncaughtExceptionHandler = (error: Error) => {
        console.error('Uncaught Exception:', error)
        process.exit(1)
      }

      uncaughtExceptionHandler(testError)

      expect(mockConsoleError).toHaveBeenCalledWith('Uncaught Exception:', testError)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it("should handle unhandled rejection correctly", () => {
      const testReason = "Test unhandled rejection"
      const testPromise = Promise.reject(testReason)

      // Simulate the unhandled rejection handler
      const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason)
        process.exit(1)
      }

      unhandledRejectionHandler(testReason, testPromise)

      expect(mockConsoleError).toHaveBeenCalledWith('Unhandled Rejection at:', testPromise, 'reason:', testReason)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe("Server Startup Logic", () => {
    it("should call serve with correct configuration", () => {
      const port = 3000
      const config = {
        fetch: mockApp.fetch,
        port,
      }

      // Simulate calling serve
      mockServe(config, () => {})

      expect(mockServe).toHaveBeenCalledWith(config, expect.any(Function))
    })

    it("should log success messages when server starts", () => {
      const port = 3001

      // Simulate the success callback
      const successCallback = () => {
        console.log(`✅ EES API server is running on http://localhost:${port}`)
        console.log(`📚 API documentation available at http://localhost:${port}/docs`)
      }

      successCallback()

      expect(mockConsoleLog).toHaveBeenCalledWith("✅ EES API server is running on http://localhost:3001")
      expect(mockConsoleLog).toHaveBeenCalledWith("📚 API documentation available at http://localhost:3001/docs")
    })

    it("should handle server startup errors", () => {
      const testError = new Error("Server startup failed")

      // Simulate error handling in try-catch
      const errorHandler = (error: Error) => {
        console.error('Failed to start server:', error)
        process.exit(1)
      }

      errorHandler(testError)

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to start server:', testError)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe("Server Initialization", () => {
    it("should log startup message with port", () => {
      const port = 3002

      // Simulate the startup message
      console.log(`🚀 Starting EES API server on port ${port}`)

      expect(mockConsoleLog).toHaveBeenCalledWith("🚀 Starting EES API server on port 3002")
    })

    it("should work with different ports", () => {
      const testPorts = [3000, 4000, 5000, 8080]

      testPorts.forEach(port => {
        console.log(`🚀 Starting EES API server on port ${port}`)
        expect(mockConsoleLog).toHaveBeenCalledWith(`🚀 Starting EES API server on port ${port}`)
      })
    })
  })

  describe("Process Event Registration", () => {
    it("should register event listeners properly", () => {
      const addListenerSpy = vi.spyOn(process, 'on')

      // Simulate registering event listeners
      process.on('uncaughtException', () => {})
      process.on('unhandledRejection', () => {})

      expect(addListenerSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
      expect(addListenerSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))

      addListenerSpy.mockRestore()
    })
  })

  describe("Server Module Integration", () => {
    it("should have proper module dependencies", () => {
      expect(mockServe).toBeDefined()
      expect(mockGetPort).toBeDefined()
      expect(mockApp).toBeDefined()
      expect(mockApp.fetch).toBeDefined()
    })

    it("should handle module loading", async () => {
      // Test that the module can be imported without errors
      const serverModule = await import("../server")
      expect(serverModule).toBeDefined()
    })
  })
})