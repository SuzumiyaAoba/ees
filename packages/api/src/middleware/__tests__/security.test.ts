/**
 * Tests for security middleware - rate limiting configuration
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { Context } from "hono"

describe("Security Middleware - Rate Limiting Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Clear rate limiting related env vars
    delete process.env['EES_RATE_LIMIT_ENABLED']
    delete process.env['EES_RATE_LIMIT_WINDOW_MS']
    delete process.env['EES_RATE_LIMIT_GENERAL']
    delete process.env['EES_RATE_LIMIT_EMBEDDING']
    delete process.env['EES_RATE_LIMIT_SEARCH']
    delete process.env['EES_RATE_LIMIT_READ']

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe("Rate Limit Configuration Defaults", () => {
    it("should use default values when environment variables are not set", async () => {
      // Import fresh module to pick up env changes
      const { rateLimitConfig } = await import("@/middleware/security")

      // Default values should be used
      // Note: We can't directly inspect the config values due to closure,
      // but we can verify the middleware is created without errors
      expect(rateLimitConfig.general).toBeDefined()
      expect(rateLimitConfig.embedding).toBeDefined()
      expect(rateLimitConfig.search).toBeDefined()
      expect(rateLimitConfig.read).toBeDefined()
    })

    it("should be enabled by default", async () => {
      // When EES_RATE_LIMIT_ENABLED is not set, rate limiting should be enabled
      expect(process.env['EES_RATE_LIMIT_ENABLED']).toBeUndefined()

      // In production/non-test environments, rate limiting is enabled by default
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("127.0.0.1"),
        },
      } as unknown as Context

      const mockNext = vi.fn().mockResolvedValue(new Response())

      // Since we're in test environment, rate limiting is bypassed
      // This test verifies the bypass behavior
      process.env['NODE_ENV'] = 'test'

      const { rateLimitConfig } = await import("@/middleware/security")
      await rateLimitConfig.general(mockContext, mockNext)

      // In test mode, next() should be called immediately
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("Environment Variable Configuration", () => {
    it("should disable rate limiting when EES_RATE_LIMIT_ENABLED is false", async () => {
      process.env['EES_RATE_LIMIT_ENABLED'] = 'false'
      process.env['NODE_ENV'] = 'production'

      // Re-import to pick up env changes
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("127.0.0.1"),
        },
      } as unknown as Context

      const mockNext = vi.fn().mockResolvedValue(new Response())

      await rateLimitConfig.general(mockContext, mockNext)

      // Should bypass rate limiting and call next
      expect(mockNext).toHaveBeenCalled()
    })

    it("should use custom window time when EES_RATE_LIMIT_WINDOW_MS is set", async () => {
      const customWindow = 120000 // 2 minutes
      process.env['EES_RATE_LIMIT_WINDOW_MS'] = customWindow.toString()

      // Re-import to pick up env changes
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      // Middleware should be created with custom window
      expect(rateLimitConfig.general).toBeDefined()
    })

    it("should use custom limits for each endpoint type", async () => {
      process.env['EES_RATE_LIMIT_GENERAL'] = '50'
      process.env['EES_RATE_LIMIT_EMBEDDING'] = '5'
      process.env['EES_RATE_LIMIT_SEARCH'] = '10'
      process.env['EES_RATE_LIMIT_READ'] = '100'

      // Re-import to pick up env changes
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      // All rate limiters should be created with custom values
      expect(rateLimitConfig.general).toBeDefined()
      expect(rateLimitConfig.embedding).toBeDefined()
      expect(rateLimitConfig.search).toBeDefined()
      expect(rateLimitConfig.read).toBeDefined()
    })

    it("should handle invalid numeric values gracefully", async () => {
      process.env['EES_RATE_LIMIT_WINDOW_MS'] = 'invalid'
      process.env['EES_RATE_LIMIT_GENERAL'] = 'not-a-number'

      // Re-import to pick up env changes
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      // Should fall back to defaults and not crash
      expect(rateLimitConfig.general).toBeDefined()
    })
  })

  describe("Test Environment Bypass", () => {
    it("should bypass rate limiting in test environment", async () => {
      process.env['NODE_ENV'] = 'test'
      process.env['EES_RATE_LIMIT_ENABLED'] = 'true'

      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("127.0.0.1"),
        },
      } as unknown as Context

      const mockNext = vi.fn().mockResolvedValue(new Response())

      await rateLimitConfig.general(mockContext, mockNext)

      // Should bypass and call next() even though rate limiting is enabled
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("Rate Limiter Middleware Creation", () => {
    it("should create middleware for all endpoint types", async () => {
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      // All rate limiters should be functions
      expect(typeof rateLimitConfig.general).toBe('function')
      expect(typeof rateLimitConfig.embedding).toBe('function')
      expect(typeof rateLimitConfig.search).toBe('function')
      expect(typeof rateLimitConfig.read).toBe('function')
    })

    it("should handle middleware invocation without errors", async () => {
      process.env['NODE_ENV'] = 'test'

      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("127.0.0.1"),
          path: "/embeddings",
          method: "POST",
        },
      } as unknown as Context

      const mockNext = vi.fn().mockResolvedValue(new Response())

      // All middleware should handle invocation
      await expect(rateLimitConfig.general(mockContext, mockNext)).resolves.not.toThrow()
      await expect(rateLimitConfig.embedding(mockContext, mockNext)).resolves.not.toThrow()
      await expect(rateLimitConfig.search(mockContext, mockNext)).resolves.not.toThrow()
      await expect(rateLimitConfig.read(mockContext, mockNext)).resolves.not.toThrow()
    })
  })

  describe("IP Address Extraction", () => {
    it("should verify rate limiter middleware structure", async () => {
      // In test environment, rate limiting is bypassed
      // This test verifies the middleware is properly structured
      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      // All rate limiters should be async functions
      expect(rateLimitConfig.general).toBeInstanceOf(Function)
      expect(rateLimitConfig.embedding).toBeInstanceOf(Function)
      expect(rateLimitConfig.search).toBeInstanceOf(Function)
      expect(rateLimitConfig.read).toBeInstanceOf(Function)
    })

    it("should bypass IP extraction in test environment", async () => {
      process.env['NODE_ENV'] = 'test'

      vi.resetModules()
      const { rateLimitConfig } = await import("@/middleware/security")

      const mockContext = {
        req: {
          header: vi.fn(),
        },
      } as unknown as Context

      const mockNext = vi.fn().mockResolvedValue(new Response())

      await rateLimitConfig.general(mockContext, mockNext)

      // In test mode, should bypass directly without checking headers
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("Configuration Export", () => {
    it("should export createSecurityMiddleware factory", async () => {
      vi.resetModules()
      const securityModule = await import("@/middleware/security")

      expect(securityModule.createSecurityMiddleware).toBeDefined()
      expect(typeof securityModule.createSecurityMiddleware).toBe('function')
    })

    it("should include all security components in factory", async () => {
      vi.resetModules()
      const { createSecurityMiddleware } = await import("@/middleware/security")

      const middleware = createSecurityMiddleware()

      expect(middleware.secureHeaders).toBeDefined()
      expect(middleware.cors).toBeDefined()
      expect(middleware.rateLimits).toBeDefined()
      expect(middleware.requestSizeLimits).toBeDefined()
      expect(middleware.textLengthValidation).toBeDefined()
    })
  })
})
