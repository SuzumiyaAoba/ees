/**
 * Connection Management API Implementation
 * Handles provider connection CRUD operations
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  createPinoLogger,
  createLoggerConfig,
  ConnectionService,
  EmbeddingService,
} from "@ees/core"
import {
  listConnectionsRoute,
  getConnectionRoute,
  getActiveConnectionRoute,
  createConnectionRoute,
  updateConnectionRoute,
  deleteConnectionRoute,
  setActiveConnectionRoute,
  testConnectionRoute,
  listAvailableModelsRoute,
  type CreateConnection,
  type UpdateConnection,
  type TestConnection,
} from "./api/route"

/**
 * Logger instance for connection management
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Connection management feature app with handlers
 */
export const connectionApp = new OpenAPIHono()

/**
 * Handler for listing all connections
 */
connectionApp.openapi(listConnectionsRoute, async (c) => {
  try {
    const { AppLayer } = await import("@/app/providers/main")

    const listConnectionsProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.listConnections()
    })

    const result = await Effect.runPromise(
      listConnectionsProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing connections")
    return c.json(
      { error: "Failed to list connections" },
      500
    )
  }
})

/**
 * Handler for getting connection by ID
 */
connectionApp.openapi(getConnectionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const getConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.getConnection(id)
    })

    const result = await Effect.runPromise(
      getConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json(
        { error: "Connection not found" },
        404
      )
    }

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error getting connection")
    return c.json(
      { error: "Failed to get connection" },
      500
    )
  }
})

/**
 * Handler for getting active connection
 */
connectionApp.openapi(getActiveConnectionRoute, async (c) => {
  try {
    const { AppLayer } = await import("@/app/providers/main")

    const getActiveConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.getActiveConnection()
    })

    const result = await Effect.runPromise(
      getActiveConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error getting active connection")
    return c.json(
      { error: "Failed to get active connection" },
      500
    )
  }
})

/**
 * Handler for creating a connection
 */
connectionApp.openapi(createConnectionRoute, async (c) => {
  try {
    const body = c.req.valid("json") as CreateConnection
    const { AppLayer } = await import("@/app/providers/main")

    const createConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.createConnection(body)
    })

    const result = await Effect.runPromise(
      createConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 201)
  } catch (error) {
    logger.error({ error: String(error) }, "Error creating connection")
    return c.json(
      { error: "Failed to create connection" },
      500
    )
  }
})

/**
 * Handler for updating a connection
 */
connectionApp.openapi(updateConnectionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const body = c.req.valid("json") as UpdateConnection
    const { AppLayer } = await import("@/app/providers/main")

    const updateConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.updateConnection(id, body)
    })

    const result = await Effect.runPromise(
      updateConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error updating connection")

    if (String(error).includes("not found")) {
      return c.json(
        { error: "Connection not found" },
        404
      )
    }

    return c.json(
      { error: "Failed to update connection" },
      500
    )
  }
})

/**
 * Handler for deleting a connection
 */
connectionApp.openapi(deleteConnectionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const deleteConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      yield* connectionService.deleteConnection(id)
    })

    await Effect.runPromise(
      deleteConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.body(null, 204)
  } catch (error) {
    logger.error({ error: String(error) }, "Error deleting connection")
    return c.json(
      { error: "Failed to delete connection" },
      500
    )
  }
})

/**
 * Handler for setting active connection
 */
connectionApp.openapi(setActiveConnectionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const setActiveConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      yield* connectionService.setActiveConnection(id)
    })

    await Effect.runPromise(
      setActiveConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.body(null, 204)
  } catch (error) {
    logger.error({ error: String(error) }, "Error setting active connection")

    if (String(error).includes("not found")) {
      return c.json(
        { error: "Connection not found" },
        404
      )
    }

    return c.json(
      { error: "Failed to set active connection" },
      500
    )
  }
})

/**
 * Handler for testing a connection
 */
connectionApp.openapi(testConnectionRoute, async (c) => {
  try {
    const body = c.req.valid("json") as TestConnection
    const { AppLayer } = await import("@/app/providers/main")

    const testConnectionProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      return yield* connectionService.testConnection(body)
    })

    const result = await Effect.runPromise(
      testConnectionProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Connection test failed")

    return c.json(
      {
        error: String(error),
        success: false,
      },
      400
    )
  }
})

/**
 * Handler for listing available models from active connection
 */
connectionApp.openapi(listAvailableModelsRoute, async (c) => {
  try {
    const { AppLayer } = await import("@/app/providers/main")

    const listAvailableModelsProgram = Effect.gen(function* () {
      const connectionService = yield* ConnectionService
      const activeConnection = yield* connectionService.getActiveConnection()

      // If no active connection, return empty list
      if (!activeConnection) {
        return { models: [] }
      }

      const embeddingService = yield* EmbeddingService
      const models = yield* embeddingService.getProviderModels()

      return {
        models: models.map((model) => ({
          name: model.name,
          provider: model.provider,
          dimensions: model.dimensions,
        })),
      }
    })

    const result = await Effect.runPromise(
      listAvailableModelsProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing available models")

    if (String(error).includes("No active connection")) {
      return c.json(
        { error: "No active connection configured" },
        404
      )
    }

    return c.json(
      { error: "Failed to list available models" },
      500
    )
  }
})
