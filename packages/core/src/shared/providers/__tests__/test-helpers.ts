/**
 * Shared test helper utilities for provider tests
 * Eliminates code duplication and standardizes test patterns across all providers
 */

import { Effect, Either } from "effect"
import { vi } from "vitest"
import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from "../types"

/**
 * Mock embedding response structure
 */
export interface MockEmbeddingResponse {
  readonly embeddings?: number[][]
  readonly embedding?: number[]
  readonly model: string
  readonly provider?: string
  readonly total_duration?: number
  readonly load_duration?: number
  readonly prompt_eval_count?: number
  readonly usage?: {
    readonly tokens: number
  }
}

/**
 * Mock fetch response configuration
 */
export interface MockFetchConfig {
  readonly ok: boolean
  readonly status: number
  readonly data?: MockEmbeddingResponse | any
  readonly error?: string
  readonly headers?: Record<string, string>
}

/**
 * Create a mock embedding response for testing
 */
export function createMockEmbeddingResponse(
  embeddings: number[][] | number[],
  model: string,
  options?: {
    provider?: string
    usage?: { tokens: number }
    total_duration?: number
    load_duration?: number
  }
): MockEmbeddingResponse {
  const embeddingArray = Array.isArray(embeddings[0]) ? embeddings as number[][] : [embeddings as number[]]

  return {
    embeddings: embeddingArray,
    embedding: embeddingArray[0], // For providers that return single embedding
    model,
    provider: options?.provider,
    total_duration: options?.total_duration,
    load_duration: options?.load_duration,
    usage: options?.usage,
  }
}

/**
 * Setup mock fetch with standardized response format
 */
export function setupMockFetch(config: MockFetchConfig): void {
  const mockFetch = vi.mocked(global.fetch)

  mockFetch.mockResolvedValue({
    ok: config.ok,
    status: config.status,
    headers: new Headers(config.headers || {}),
    json: vi.fn().mockResolvedValue(config.data || {}),
    text: vi.fn().mockResolvedValue(config.error || ""),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: vi.fn().mockReturnThis(),
  } as any)
}

/**
 * Setup mock fetch to reject with an error (for network errors)
 */
export function setupMockFetchError(error: Error): void {
  const mockFetch = vi.mocked(global.fetch)
  mockFetch.mockRejectedValue(error)
}

/**
 * Setup mock fetch with JSON parse error
 */
export function setupMockFetchJsonError(jsonError: Error): void {
  const mockFetch = vi.mocked(global.fetch)

  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockRejectedValue(jsonError),
    text: vi.fn().mockResolvedValue(""),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: vi.fn().mockReturnThis(),
  } as any)
}

/**
 * Execute a provider test with standardized error handling
 */
export async function runProviderTest<T extends EmbeddingProvider>(
  provider: T,
  request: EmbeddingRequest
): Promise<EmbeddingResponse> {
  return await Effect.runPromise(provider.generateEmbedding(request))
}

/**
 * Execute a provider test and capture the result with Either
 */
export async function runProviderTestWithEither<T extends EmbeddingProvider>(
  provider: T,
  request: EmbeddingRequest
): Promise<Either.Either<EmbeddingResponse, any>> {
  return await Effect.runPromise(Effect.either(provider.generateEmbedding(request)))
}

/**
 * Standardized assertions for embedding results
 */
export function expectEmbeddingResult(
  result: EmbeddingResponse,
  expected: Partial<EmbeddingResponse>
): void {
  if (expected.embedding !== undefined) {
    expect(result.embedding).toEqual(expected.embedding)
  }
  if (expected.model !== undefined) {
    expect(result.model).toBe(expected.model)
  }
  if (expected.provider !== undefined) {
    expect(result.provider).toBe(expected.provider)
  }
  if (expected.dimensions !== undefined) {
    expect(result.dimensions).toBe(expected.dimensions)
  }
  if (expected.tokensUsed !== undefined) {
    expect(result.tokensUsed).toBe(expected.tokensUsed)
  }
}

/**
 * Test that a provider operation fails with the expected error type
 */
export async function expectProviderError<T>(
  errorType: new (...args: any[]) => T,
  operation: Effect.Effect<any, any, any>
): Promise<T> {
  const result = await Effect.runPromise(Effect.either(operation))

  if (Either.isRight(result)) {
    throw new Error("Expected operation to fail but it succeeded")
  }

  const error = result.left
  expect(error).toBeInstanceOf(errorType)
  return error as T
}

/**
 * Assert that fetch was called with expected parameters
 */
export function expectFetchCall(
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body: string
  }
): void {
  const mockFetch = vi.mocked(global.fetch)

  expect(mockFetch).toHaveBeenCalledWith(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  })
}

/**
 * Create standardized test request
 */
export function createTestRequest(
  text: string,
  modelName?: string
): EmbeddingRequest {
  return {
    text,
    ...(modelName && { modelName }),
  }
}

/**
 * Common test data for embedding vectors
 */
export const TEST_EMBEDDINGS = {
  SMALL: [0.1, 0.2, 0.3, 0.4, 0.5],
  MEDIUM: new Array(384).fill(0).map((_, i) => i / 384),
  LARGE: new Array(1024).fill(0).map((_, i) => i / 1024),
  OPENAI_SMALL: new Array(1536).fill(0.1),
  OPENAI_LARGE: new Array(3072).fill(0.1),
  COHERE: new Array(1024).fill(0.1),
  GOOGLE: new Array(768).fill(0.1),
  OLLAMA: [0.1, 0.2, 0.3, 0.4, 0.5],
  AZURE: new Array(1536).fill(0.1),
  AZURE_LARGE: new Array(3072).fill(0.1),
} as const

/**
 * Common test models for different providers
 */
export const TEST_MODELS = {
  OPENAI: {
    SMALL: "text-embedding-3-small",
    LARGE: "text-embedding-3-large",
    ADA: "text-embedding-ada-002",
  },
  GOOGLE: {
    EMBEDDING_001: "embedding-001",
    TEXT_EMBEDDING_004: "text-embedding-004",
  },
  COHERE: {
    ENGLISH: "embed-english-v3.0",
    MULTILINGUAL: "embed-multilingual-v3.0",
  },
  OLLAMA: {
    NOMIC: "nomic-embed-text",
    MXBAI: "mxbai-embed-large",
    ARCTIC: "snowflake-arctic-embed",
  },
  MISTRAL: {
    EMBED: "mistral-embed",
  },
  AZURE: {
    ADA_002: "text-embedding-ada-002",
    SMALL: "text-embedding-3-small",
    LARGE: "text-embedding-3-large",
  },
} as const

/**
 * Setup common error scenarios for testing
 */
export function setupErrorScenarios() {
  return {
    networkError: () => setupMockFetch({
      ok: false,
      status: 0,
      error: "Network error",
    }),

    unauthorized: () => setupMockFetch({
      ok: false,
      status: 401,
      error: "Unauthorized",
    }),

    rateLimited: () => setupMockFetch({
      ok: false,
      status: 429,
      error: "Rate limit exceeded",
    }),

    modelNotFound: () => setupMockFetch({
      ok: false,
      status: 404,
      error: "Model not found",
    }),

    invalidRequest: () => setupMockFetch({
      ok: false,
      status: 400,
      error: "Bad request",
    }),

    serverError: () => setupMockFetch({
      ok: false,
      status: 500,
      error: "Internal server error",
    }),
  }
}

/**
 * Create a standardized test environment setup
 */
export function createTestEnvironment() {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  return {
    mockFetch,
    cleanup: () => {
      vi.restoreAllMocks()
    },
  }
}

/**
 * Helper to assert model list response structure
 */
export function expectModelListStructure(
  models: any[],
  expectedProvider: string
): void {
  expect(Array.isArray(models)).toBe(true)
  expect(models.length).toBeGreaterThan(0)

  for (const model of models) {
    expect(model).toHaveProperty("name")
    expect(model).toHaveProperty("provider")
    expect(model).toHaveProperty("dimensions")
    expect(model.provider).toBe(expectedProvider)
    expect(typeof model.name).toBe("string")
    expect(typeof model.dimensions).toBe("number")
  }
}

/**
 * Helper to create a provider instance for testing
 */
export async function createProviderInstance<T>(
  providerFactory: (...args: any[]) => Effect.Effect<T>,
  ...args: any[]
): Promise<T> {
  return await Effect.runPromise(providerFactory(...args))
}

/**
 * Run a complete provider test with setup, execution, and assertion
 */
export async function runCompleteProviderTest<T extends EmbeddingProvider>(
  providerFactory: (...args: any[]) => Effect.Effect<T>,
  providerArgs: any[],
  request: EmbeddingRequest,
  expected: Partial<EmbeddingResponse>
): Promise<void> {
  const provider = await createProviderInstance(providerFactory, ...providerArgs)
  const result = await runProviderTest(provider, request)
  expectEmbeddingResult(result, expected)
}

/**
 * Run a provider error test with standardized setup
 */
export async function runProviderErrorTest<T extends EmbeddingProvider, E>(
  providerFactory: (...args: any[]) => Effect.Effect<T>,
  providerArgs: any[],
  request: EmbeddingRequest,
  errorType: new (...args: any[]) => E
): Promise<E> {
  const provider = await createProviderInstance(providerFactory, ...providerArgs)
  return await expectProviderError(errorType, provider.generateEmbedding(request))
}

/**
 * Setup a standard success test scenario
 */
export function setupSuccessTest(
  embeddings: number[] | number[][],
  model: string,
  options?: {
    provider?: string
    usage?: { tokens: number }
    total_duration?: number
    load_duration?: number
  }
): void {
  const mockResponse = createMockEmbeddingResponse(embeddings, model, options)
  setupMockFetch({
    ok: true,
    status: 200,
    data: mockResponse,
  })
}

/**
 * Create a standard test scenario with provider, request, and expected result
 */
export interface TestScenario<T> {
  name: string
  mockSetup: () => void
  request: EmbeddingRequest
  expected: Partial<EmbeddingResponse>
  providerFactory: (...args: any[]) => Effect.Effect<T>
  providerArgs: any[]
}

/**
 * Run a collection of test scenarios
 */
export async function runTestScenarios<T extends EmbeddingProvider>(
  scenarios: TestScenario<T>[]
): Promise<void> {
  for (const scenario of scenarios) {
    scenario.mockSetup()
    await runCompleteProviderTest(
      scenario.providerFactory,
      scenario.providerArgs,
      scenario.request,
      scenario.expected
    )
  }
}

/**
 * Standard error test scenarios generator
 */
export function createErrorTestScenarios<T extends EmbeddingProvider>(
  providerFactory: (...args: any[]) => Effect.Effect<T>,
  providerArgs: any[],
  providerName: string
): Array<{
  name: string
  setup: () => void
  errorType: any
  expectedMessage?: string
}> {
  const scenarios = setupErrorScenarios()

  return [
    {
      name: "should handle authentication errors",
      setup: scenarios.unauthorized,
      errorType: Error, // Will need to be specialized per provider
      expectedMessage: "authentication",
    },
    {
      name: "should handle rate limit errors",
      setup: scenarios.rateLimited,
      errorType: Error,
      expectedMessage: "rate limit",
    },
    {
      name: "should handle model not found errors",
      setup: scenarios.modelNotFound,
      errorType: Error,
      expectedMessage: "not found",
    },
    {
      name: "should handle server errors",
      setup: scenarios.serverError,
      errorType: Error,
      expectedMessage: "server error",
    },
  ]
}

/**
 * Simplified provider test helper that combines common patterns
 */
export async function testProviderEmbedding<T extends EmbeddingProvider>(
  options: {
    providerFactory: (...args: any[]) => Effect.Effect<T>
    providerArgs: any[]
    text: string
    modelName?: string
    embedding: number[]
    expectedModel: string
    expectedProvider: string
    mockOptions?: {
      usage?: { tokens: number }
      total_duration?: number
      load_duration?: number
    }
  }
): Promise<void> {
  // Setup mock response
  setupSuccessTest(options.embedding, options.expectedModel, {
    provider: options.expectedProvider,
    ...options.mockOptions,
  })

  // Create provider and request
  const provider = await createProviderInstance(options.providerFactory, ...options.providerArgs)
  const request = createTestRequest(options.text, options.modelName)

  // Execute and assert
  const result = await runProviderTest(provider, request)
  expectEmbeddingResult(result, {
    embedding: options.embedding,
    model: options.expectedModel,
    provider: options.expectedProvider,
    dimensions: options.embedding.length,
  })
}