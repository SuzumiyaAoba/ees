/**
 * Connection service - unified interface for provider and model management
 * Provides backward-compatible API while using new provider/model architecture
 */

import { Context, Effect, Layer } from "effect"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  ProviderConnectionError,
  ProviderAuthenticationError,
} from "@/shared/errors/database"
import { ProviderRepository } from "@/entities/provider/repository/provider-repository"
import { ModelRepository } from "@/entities/model/repository/model-repository"
import { EmbeddingProviderService } from "@/shared/providers"
import { createEmbeddingProviderService } from "@/shared/providers/factory"
import type { ProviderConfig } from "@/shared/providers/types"
import type { Provider } from "@/shared/database/schema"

/**
 * Connection request/response types
 */
export interface CreateConnectionRequest {
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  apiKey?: string
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface UpdateConnectionRequest {
  name?: string
  baseUrl?: string
  apiKey?: string
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface ConnectionTestRequest {
  id?: number
  baseUrl?: string
  apiKey?: string
  type?: "ollama" | "openai-compatible"
}

export interface ConnectionTestResponse {
  success: boolean
  message: string
  models?: string[]
}

export interface ConnectionResponse {
  id: number
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  metadata: Record<string, unknown> | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface ConnectionsListResponse {
  connections: ConnectionResponse[]
  total: number
}

/**
 * Connection service interface
 */
export interface ConnectionService {
  readonly createConnection: (
    request: CreateConnectionRequest
  ) => Effect.Effect<ConnectionResponse, DatabaseQueryError>

  readonly getConnection: (
    id: number
  ) => Effect.Effect<ConnectionResponse | null, DatabaseQueryError>

  readonly listConnections: () => Effect.Effect<ConnectionsListResponse, DatabaseQueryError>

  readonly getActiveConnection: () => Effect.Effect<ConnectionResponse | null, DatabaseQueryError>

  readonly getActiveConnectionConfig: () => Effect.Effect<ProviderConfig | null, DatabaseQueryError>

  readonly updateConnection: (
    id: number,
    request: UpdateConnectionRequest
  ) => Effect.Effect<ConnectionResponse, DatabaseQueryError>

  readonly deleteConnection: (id: number) => Effect.Effect<void, DatabaseQueryError>

  readonly setActiveConnection: (id: number) => Effect.Effect<void, DatabaseQueryError>

  readonly testConnection: (
    request: ConnectionTestRequest
  ) => Effect.Effect<
    ConnectionTestResponse,
    ProviderConnectionError | ProviderAuthenticationError | DatabaseQueryError
  >
}

export const ConnectionService = Context.GenericTag<ConnectionService>("ConnectionService")

const make = Effect.gen(function* () {
  const providerRepository = yield* ProviderRepository
  const modelRepository = yield* ModelRepository

  /**
   * Helper to convert provider to connection response
   * Note: isActive now reflects if any model for this provider is active
   */
  const toConnectionResponse = (provider: Provider, hasActiveModel: boolean): ConnectionResponse => ({
    id: provider.id, // Use provider ID as connection ID
    name: provider.name,
    type: provider.type as "ollama" | "openai-compatible",
    baseUrl: provider.baseUrl,
    metadata: provider.metadata ? (JSON.parse(provider.metadata) as Record<string, unknown>) : null,
    isActive: hasActiveModel,
    createdAt: provider.createdAt || null,
    updatedAt: provider.updatedAt || null,
  })

  /**
   * Create a new connection (provider only)
   * Models must be registered separately via ModelManagement
   */
  const createConnection = (request: CreateConnectionRequest) =>
    Effect.gen(function* () {
      // Debug logging
      console.error("CreateConnection request:", JSON.stringify(request, null, 2))

      const providerData = {
        name: request.name,
        type: request.type,
        baseUrl: request.baseUrl,
        apiKey: request.apiKey,
        metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
      }

      console.error("Provider data to create:", JSON.stringify(providerData, null, 2))

      // Create provider only (no automatic model creation)
      const provider = yield* providerRepository.create(providerData)

      return toConnectionResponse(provider, false)
    })

  /**
   * Get connection by ID (provider ID)
   */
  const getConnection = (id: number) =>
    Effect.gen(function* () {
      const provider = yield* providerRepository.findById(id)
      if (!provider) return null

      // Check if any model for this provider is active
      const models = yield* modelRepository.findByProviderId(provider.id)
      const hasActiveModel = models.some(m => m.isActive)

      return toConnectionResponse(provider, hasActiveModel)
    })

  /**
   * List all connections (providers)
   */
  const listConnections = () =>
    Effect.gen(function* () {
      const allProviders = yield* providerRepository.findAll()
      const allModels = yield* modelRepository.findAll()

      // Create map of active models by provider ID
      const activeModelsByProvider = new Map<number, boolean>()
      for (const model of allModels) {
        if (model.isActive) {
          activeModelsByProvider.set(model.providerId, true)
        }
      }

      // Build connection list from providers
      const connections: ConnectionResponse[] = allProviders.map(provider =>
        toConnectionResponse(provider, activeModelsByProvider.get(provider.id) || false)
      )

      return {
        connections,
        total: connections.length,
      }
    })

  /**
   * Get active connection (provider with active model)
   */
  const getActiveConnection = () =>
    Effect.gen(function* () {
      const activeModel = yield* modelRepository.findActive()
      if (!activeModel) return null

      const provider = yield* providerRepository.findById(activeModel.providerId)
      if (!provider) return null

      return toConnectionResponse(provider, true)
    })

  /**
   * Get active connection config (for provider initialization)
   * Returns config for the provider with an active model
   */
  const getActiveConnectionConfig = () =>
    Effect.gen(function* () {
      const activeModel = yield* modelRepository.findActive()
      if (!activeModel) return null

      const provider = yield* providerRepository.findById(activeModel.providerId)
      if (!provider) return null

      // ProviderConfig no longer includes defaultModel - caller must specify model explicitly
      const config: ProviderConfig = {
        type: provider.type as "ollama" | "openai-compatible",
        baseUrl: provider.baseUrl,
        ...(provider.apiKey && { apiKey: provider.apiKey }),
      }

      return config
    })

  /**
   * Update connection
   */
  const updateConnection = (id: number, request: UpdateConnectionRequest) =>
    Effect.gen(function* () {
      // Find provider (connection ID = provider ID)
      const provider = yield* providerRepository.findById(id)
      if (!provider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      // Update provider if needed
      if (request.name || request.baseUrl || request.apiKey !== undefined || request.metadata) {
        yield* providerRepository.update(provider.id, {
          ...(request.name && { name: request.name }),
          ...(request.baseUrl && { baseUrl: request.baseUrl }),
          ...(request.apiKey !== undefined && { apiKey: request.apiKey }),
          ...(request.metadata && { metadata: JSON.stringify(request.metadata) }),
        })
      }

      // Note: Models are managed separately via ModelManagement API
      // isActive is also managed at model level, not connection level

      // Fetch updated data
      const updatedProvider = yield* providerRepository.findById(provider.id)

      if (!updatedProvider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: "Failed to fetch updated connection" })
        )
      }

      // Check if any model for this provider is active
      const models = yield* modelRepository.findByProviderId(updatedProvider.id)
      const hasActiveModel = models.some(m => m.isActive)

      return toConnectionResponse(updatedProvider, hasActiveModel)
    })

  /**
   * Delete connection (deletes provider and all its models)
   */
  const deleteConnection = (id: number) =>
    Effect.gen(function* () {
      const provider = yield* providerRepository.findById(id)
      if (!provider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      // Delete provider (models will cascade delete due to foreign key constraint)
      yield* providerRepository.delete(id)
    })

  /**
   * Set active connection
   * Note: This operation is deprecated. Use ModelManagement API to activate models instead.
   */
  const setActiveConnection = (id: number) =>
    Effect.gen(function* () {
      const provider = yield* providerRepository.findById(id)
      if (!provider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      // Cannot activate a connection (provider) directly - must activate a specific model
      return yield* Effect.fail(
        new DatabaseQueryError({
          message: "Cannot activate connection directly. Use ModelManagement API to activate a specific model for this provider.",
        })
      )
    })

  /**
   * Test connection
   */
  const testConnection = (request: ConnectionTestRequest) =>
    Effect.gen(function* () {
      let config: ProviderConfig

      if (request.id) {
        // Test existing connection (provider)
        const provider = yield* providerRepository.findById(request.id)
        if (!provider) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: `Connection with id ${request.id} not found`,
            })
          )
        }

        config = {
          type: provider.type as "ollama" | "openai-compatible",
          baseUrl: provider.baseUrl,
          ...(provider.apiKey && { apiKey: provider.apiKey }),
        }
      } else {
        // Test new connection configuration
        if (!request.baseUrl || !request.type) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: "baseUrl and type are required for testing",
            })
          )
        }

        config = {
          type: request.type,
          baseUrl: request.baseUrl,
          ...(request.apiKey && { apiKey: request.apiKey }),
        }
      }

      // Create temporary provider service to test
      const factoryConfig = {
        defaultProvider: config,
        availableProviders: [config],
      }
      const providerLayer = createEmbeddingProviderService(factoryConfig)

      // Test by listing models
      const testResult = yield* Effect.flatMap(
        EmbeddingProviderService,
        (provider) => Effect.map(provider.listModels(), (models) => models.map((m) => m.name))
      ).pipe(Effect.provide(providerLayer))

      return {
        success: true,
        message: "Connection successful",
        models: testResult,
      }
    })

  return {
    createConnection,
    getConnection,
    listConnections,
    getActiveConnection,
    getActiveConnectionConfig,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    testConnection,
  }
})

export const ConnectionServiceLive = Layer.effect(ConnectionService, make)
