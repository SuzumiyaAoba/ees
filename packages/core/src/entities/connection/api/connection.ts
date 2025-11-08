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
import type { Provider, Model } from "@/shared/database/schema"

/**
 * Connection request/response types
 */
export interface CreateConnectionRequest {
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  apiKey?: string
  defaultModel: string
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface UpdateConnectionRequest {
  name?: string
  baseUrl?: string
  apiKey?: string
  defaultModel?: string
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
  defaultModel: string
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
   * Helper to convert provider + model to connection response
   */
  const toConnectionResponse = (provider: Provider, model: Model): ConnectionResponse => ({
    id: model.id, // Use model ID as connection ID for backward compatibility
    name: provider.name,
    type: provider.type as "ollama" | "openai-compatible",
    baseUrl: provider.baseUrl,
    defaultModel: model.name,
    metadata: provider.metadata ? (JSON.parse(provider.metadata) as Record<string, unknown>) : null,
    isActive: model.isActive,
    createdAt: model.createdAt || null,
    updatedAt: model.updatedAt || null,
  })

  /**
   * Create a new connection (provider + model)
   */
  const createConnection = (request: CreateConnectionRequest) =>
    Effect.gen(function* () {
      // Create provider
      const provider = yield* providerRepository.create({
        name: request.name,
        type: request.type,
        baseUrl: request.baseUrl,
        apiKey: request.apiKey,
        metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
      })

      // Create model for this provider
      const model = yield* modelRepository.create({
        providerId: provider.id,
        name: request.defaultModel,
        isActive: request.isActive || false,
      })

      // If this should be active, set it as active
      if (request.isActive) {
        yield* modelRepository.setActive(model.id)
      }

      return toConnectionResponse(provider, model)
    })

  /**
   * Get connection by ID (model ID)
   */
  const getConnection = (id: number) =>
    Effect.gen(function* () {
      const model = yield* modelRepository.findById(id)
      if (!model) return null

      const provider = yield* providerRepository.findById(model.providerId)
      if (!provider) return null

      return toConnectionResponse(provider, model)
    })

  /**
   * List all connections
   */
  const listConnections = () =>
    Effect.gen(function* () {
      const allModels = yield* modelRepository.findAll()
      const allProviders = yield* providerRepository.findAll()

      // Create map of providers for quick lookup
      const providerMap = new Map(allProviders.map((p) => [p.id, p]))

      // Build connection list
      const connections: ConnectionResponse[] = []
      for (const model of allModels) {
        const provider = providerMap.get(model.providerId)
        if (provider) {
          connections.push(toConnectionResponse(provider, model))
        }
      }

      return {
        connections,
        total: connections.length,
      }
    })

  /**
   * Get active connection
   */
  const getActiveConnection = () =>
    Effect.gen(function* () {
      const activeModel = yield* modelRepository.findActive()
      if (!activeModel) return null

      const provider = yield* providerRepository.findById(activeModel.providerId)
      if (!provider) return null

      return toConnectionResponse(provider, activeModel)
    })

  /**
   * Get active connection config (for provider initialization)
   */
  const getActiveConnectionConfig = () =>
    Effect.gen(function* () {
      const activeModel = yield* modelRepository.findActive()
      if (!activeModel) return null

      const provider = yield* providerRepository.findById(activeModel.providerId)
      if (!provider) return null

      const config: ProviderConfig = {
        type: provider.type as "ollama" | "openai-compatible",
        baseUrl: provider.baseUrl,
        defaultModel: activeModel.name,
        ...(provider.apiKey && { apiKey: provider.apiKey }),
      }

      return config
    })

  /**
   * Update connection
   */
  const updateConnection = (id: number, request: UpdateConnectionRequest) =>
    Effect.gen(function* () {
      // Find model and provider
      const model = yield* modelRepository.findById(id)
      if (!model) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      const provider = yield* providerRepository.findById(model.providerId)
      if (!provider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Provider for model ${id} not found` })
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

      // Update model if needed
      if (request.defaultModel) {
        yield* modelRepository.update(model.id, {
          name: request.defaultModel,
        })
      }

      // Handle active status
      if (request.isActive !== undefined && request.isActive) {
        yield* modelRepository.setActive(model.id)
      }

      // Fetch updated data
      const updatedModel = yield* modelRepository.findById(id)
      const updatedProvider = yield* providerRepository.findById(model.providerId)

      if (!updatedModel || !updatedProvider) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: "Failed to fetch updated connection" })
        )
      }

      return toConnectionResponse(updatedProvider, updatedModel)
    })

  /**
   * Delete connection (deletes model, provider auto-deletes if no other models)
   */
  const deleteConnection = (id: number) =>
    Effect.gen(function* () {
      const model = yield* modelRepository.findById(id)
      if (!model) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      const providerId = model.providerId

      // Delete model
      yield* modelRepository.delete(id)

      // Check if provider has other models
      const remainingModels = yield* modelRepository.findByProviderId(providerId)

      // If no models left, delete provider
      if (remainingModels.length === 0) {
        yield* providerRepository.delete(providerId)
      }
    })

  /**
   * Set active connection
   */
  const setActiveConnection = (id: number) =>
    Effect.gen(function* () {
      const model = yield* modelRepository.findById(id)
      if (!model) {
        return yield* Effect.fail(
          new DatabaseQueryError({ message: `Connection with id ${id} not found` })
        )
      }

      yield* modelRepository.setActive(id)
    })

  /**
   * Test connection
   */
  const testConnection = (request: ConnectionTestRequest) =>
    Effect.gen(function* () {
      let config: ProviderConfig

      if (request.id) {
        // Test existing connection
        const model = yield* modelRepository.findById(request.id)
        if (!model) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: `Connection with id ${request.id} not found`,
            })
          )
        }

        const provider = yield* providerRepository.findById(model.providerId)
        if (!provider) {
          return yield* Effect.fail(
            new DatabaseQueryError({
              message: `Provider for connection ${request.id} not found`,
            })
          )
        }

        config = {
          type: provider.type as "ollama" | "openai-compatible",
          baseUrl: provider.baseUrl,
          defaultModel: model.name,
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
