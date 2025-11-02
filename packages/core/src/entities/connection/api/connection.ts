/**
 * Connection configuration service
 * Manages provider connection configurations
 */

import { Context, Effect, Layer } from "effect"
import { DatabaseQueryError } from "@/shared/errors/database"
import {
  ProviderConnectionError,
  ProviderAuthenticationError,
} from "@/shared/errors/database"
import {
  ConnectionRepository,
  ConnectionRepositoryLive,
} from "@/entities/connection/repository/connection-repository"
import { EmbeddingProviderService } from "@/shared/providers"
import { createProviderLayer } from "@/shared/providers/factory"
import type { ProviderConfig } from "@/shared/providers/types"
import type {
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionTestRequest,
  ConnectionTestResponse,
  ConnectionResponse,
  ConnectionsListResponse,
} from "@/entities/connection/model/connection"

/**
 * Connection service interface
 * Provides operations for managing provider connections
 */
export interface ConnectionService {
  /**
   * Create a new connection configuration
   */
  readonly createConnection: (
    request: CreateConnectionRequest
  ) => Effect.Effect<ConnectionResponse, DatabaseQueryError>

  /**
   * Get a specific connection by ID
   */
  readonly getConnection: (
    id: number
  ) => Effect.Effect<ConnectionResponse | null, DatabaseQueryError>

  /**
   * List all connection configurations
   */
  readonly listConnections: () => Effect.Effect<
    ConnectionsListResponse,
    DatabaseQueryError
  >

  /**
   * Get the currently active connection
   */
  readonly getActiveConnection: () => Effect.Effect<
    ConnectionResponse | null,
    DatabaseQueryError
  >

  /**
   * Update a connection configuration
   */
  readonly updateConnection: (
    id: number,
    request: UpdateConnectionRequest
  ) => Effect.Effect<ConnectionResponse, DatabaseQueryError>

  /**
   * Delete a connection configuration
   */
  readonly deleteConnection: (
    id: number
  ) => Effect.Effect<void, DatabaseQueryError>

  /**
   * Set a connection as the active one
   */
  readonly setActiveConnection: (
    id: number
  ) => Effect.Effect<void, DatabaseQueryError>

  /**
   * Test a connection to verify it works
   */
  readonly testConnection: (
    request: ConnectionTestRequest
  ) => Effect.Effect<
    ConnectionTestResponse,
    ProviderConnectionError | ProviderAuthenticationError | DatabaseQueryError
  >
}

export const ConnectionService = Context.GenericTag<ConnectionService>(
  "ConnectionService"
)

/**
 * Convert database result to API ConnectionResponse
 * Excludes API key for security
 */
const toConnectionResponse = (config: {
  id: number
  name: string
  type: string
  baseUrl: string
  apiKey: string | null
  defaultModel: string | null
  metadata: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}): ConnectionResponse => {
  const metadata = config.metadata
    ? (JSON.parse(config.metadata) as Record<string, unknown>)
    : null

  return {
    id: config.id,
    name: config.name,
    type: config.type as "ollama" | "openai-compatible",
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? null,
    metadata,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

/**
 * Create the connection service implementation
 */
const make = Effect.gen(function* () {
  const repository = yield* ConnectionRepository

  const createConnection = (request: CreateConnectionRequest) =>
    Effect.gen(function* () {
      const newConnection = {
        name: request.name,
        type: request.type,
        baseUrl: request.baseUrl,
        apiKey: request.apiKey ?? null,
        defaultModel: request.defaultModel ?? null,
        metadata: request.metadata ? JSON.stringify(request.metadata) : null,
        isActive: request.isActive ?? false,
      }

      const created = yield* repository.create(newConnection)
      return toConnectionResponse(created)
    })

  const getConnection = (id: number) =>
    Effect.gen(function* () {
      const connection = yield* repository.findById(id)
      return connection ? toConnectionResponse(connection) : null
    })

  const listConnections = () =>
    Effect.gen(function* () {
      const connections = yield* repository.findAll()
      const responses = connections.map(toConnectionResponse)

      return {
        connections: responses,
        total: responses.length,
      }
    })

  const getActiveConnection = () =>
    Effect.gen(function* () {
      const connection = yield* repository.findActive()
      return connection ? toConnectionResponse(connection) : null
    })

  const updateConnection = (id: number, request: UpdateConnectionRequest) =>
    Effect.gen(function* () {
      const updateData: Partial<{
        name: string
        baseUrl: string
        apiKey: string | null
        defaultModel: string | null
        metadata: string | null
        isActive: boolean
      }> = {}

      if (request.name !== undefined) updateData["name"] = request.name
      if (request.baseUrl !== undefined) updateData["baseUrl"] = request.baseUrl
      if (request.apiKey !== undefined) updateData["apiKey"] = request.apiKey
      if (request.defaultModel !== undefined)
        updateData["defaultModel"] = request.defaultModel
      if (request.metadata !== undefined)
        updateData["metadata"] = JSON.stringify(request.metadata)
      if (request.isActive !== undefined) updateData["isActive"] = request.isActive

      const updated = yield* repository.update(id, updateData)
      return toConnectionResponse(updated)
    })

  const deleteConnection = (id: number) =>
    Effect.gen(function* () {
      yield* repository.delete(id)
    })

  const setActiveConnection = (id: number) =>
    Effect.gen(function* () {
      yield* repository.setActive(id)
    })

  const testConnection = (request: ConnectionTestRequest) =>
    Effect.gen(function* () {
      try {
        // If testing an existing connection, fetch it
        let config: ProviderConfig
        if (request.id) {
          const connection = yield* repository.findById(request.id)
          if (!connection) {
            return yield* Effect.fail(
              new DatabaseQueryError({
                message: `Connection with id ${request.id} not found`,
              })
            )
          }

          config = {
            type: connection.type,
            baseUrl: connection.baseUrl,
            ...(connection.apiKey && { apiKey: connection.apiKey }),
            ...(connection.defaultModel && { defaultModel: connection.defaultModel }),
          }
        } else {
          // Testing a new connection configuration
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

        // Create a temporary provider to test the connection
        const providerLayer = createProviderLayer(config)
        const testResult = yield* Effect.gen(function* () {
          const provider = yield* EmbeddingProviderService
          const models = yield* provider.listModels()
          return models.map((m) => m.name)
        }).pipe(Effect.provide(providerLayer))

        return {
          success: true,
          message: "Connection successful",
          models: testResult,
        }
      } catch (error) {
        if (
          error instanceof ProviderConnectionError ||
          error instanceof ProviderAuthenticationError
        ) {
          return yield* Effect.fail(error)
        }

        return yield* Effect.fail(
          new ProviderConnectionError({
            provider: "unknown",
            message: `Connection test failed: ${error}`,
          })
        )
      }
    })

  return {
    createConnection,
    getConnection,
    listConnections,
    getActiveConnection,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    testConnection,
  } as const
})

/**
 * Connection service layer
 */
export const ConnectionServiceLive = Layer.effect(
  ConnectionService,
  make
).pipe(Layer.provide(ConnectionRepositoryLive))
