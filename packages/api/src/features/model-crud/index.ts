/**
 * Model CRUD API Implementation
 * Handles database CRUD operations for model configurations
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  createPinoLogger,
  createLoggerConfig,
  ModelRepository,
} from "@ees/core"
import {
  listModelsRoute,
  listProviderModelsRoute,
  getModelRoute,
  createModelRoute,
  updateModelRoute,
  deleteModelRoute,
  activateModelRoute,
  type CreateModelRequest,
  type UpdateModelRequest,
} from "./api/route"

/**
 * Logger instance for model CRUD
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Model CRUD feature app with handlers
 */
export const modelCrudApp = new OpenAPIHono()

/**
 * Handler for listing all models or filtering by provider
 */
modelCrudApp.openapi(listModelsRoute, async (c) => {
  try {
    const { providerId } = c.req.valid("query")
    const { AppLayer } = await import("@/app/providers/main")

    const listModelsProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository

      const models = providerId
        ? yield* modelRepository.findByProviderId(providerId)
        : yield* modelRepository.findAll()

      return {
        models: models.map(m => ({
          ...m,
          metadata: m.metadata ? (JSON.parse(m.metadata) as Record<string, unknown>) : null,
        })),
        total: models.length,
      }
    })

    const result = await Effect.runPromise(
      listModelsProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing models")
    return c.json(
      { error: "Failed to list models" },
      500
    )
  }
})

/**
 * Handler for listing models for a specific provider
 */
modelCrudApp.openapi(listProviderModelsRoute, async (c) => {
  try {
    const { providerId } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const listModelsProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository
      const models = yield* modelRepository.findByProviderId(providerId)

      return {
        models: models.map(m => ({
          ...m,
          metadata: m.metadata ? (JSON.parse(m.metadata) as Record<string, unknown>) : null,
        })),
        total: models.length,
      }
    })

    const result = await Effect.runPromise(
      listModelsProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error listing provider models")
    return c.json(
      { error: "Failed to list provider models" },
      500
    )
  }
})

/**
 * Handler for getting model by ID
 */
modelCrudApp.openapi(getModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const getModelProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository
      const model = yield* modelRepository.findById(id)

      if (!model) {
        return null
      }

      return {
        ...model,
        metadata: model.metadata ? (JSON.parse(model.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      getModelProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json(
        { error: "Model not found" },
        404
      )
    }

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error getting model")
    return c.json(
      { error: "Failed to get model" },
      500
    )
  }
})

/**
 * Handler for creating a model
 */
modelCrudApp.openapi(createModelRoute, async (c) => {
  try {
    const body = c.req.valid("json") as CreateModelRequest
    const { AppLayer } = await import("@/app/providers/main")

    const createModelProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository
      const model = yield* modelRepository.create({
        providerId: body.providerId,
        name: body.name,
        displayName: body.displayName || null,
        isActive: body.isActive || false,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      })

      return {
        ...model,
        metadata: model.metadata ? (JSON.parse(model.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      createModelProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 201)
  } catch (error) {
    logger.error({ error: String(error) }, "Error creating model")
    return c.json(
      { error: "Failed to create model" },
      500
    )
  }
})

/**
 * Handler for updating a model
 */
modelCrudApp.openapi(updateModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const body = c.req.valid("json") as UpdateModelRequest
    const { AppLayer } = await import("@/app/providers/main")

    const updateModelProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository

      const updateData: Record<string, unknown> = {}
      if (body.name) updateData["name"] = body.name
      if (body.displayName !== undefined) updateData["displayName"] = body.displayName || null
      if (body.metadata) updateData["metadata"] = JSON.stringify(body.metadata)

      const success = yield* modelRepository.update(id, updateData)

      if (!success) {
        return null
      }

      const model = yield* modelRepository.findById(id)

      if (!model) {
        return null
      }

      return {
        ...model,
        metadata: model.metadata ? (JSON.parse(model.metadata) as Record<string, unknown>) : null,
      }
    })

    const result = await Effect.runPromise(
      updateModelProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json(
        { error: "Model not found" },
        404
      )
    }

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error updating model")

    if (String(error).includes("not found")) {
      return c.json(
        { error: "Model not found" },
        404
      )
    }

    return c.json(
      { error: "Failed to update model" },
      500
    )
  }
})

/**
 * Handler for deleting a model
 */
modelCrudApp.openapi(deleteModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const deleteModelProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository
      return yield* modelRepository.delete(id)
    })

    const success = await Effect.runPromise(
      deleteModelProgram.pipe(Effect.provide(AppLayer))
    )

    if (!success) {
      return c.json(
        { error: "Model not found" },
        404
      )
    }

    return c.body(null, 204)
  } catch (error) {
    logger.error({ error: String(error) }, "Error deleting model")
    return c.json(
      { error: "Failed to delete model" },
      500
    )
  }
})

/**
 * Handler for activating a model
 */
modelCrudApp.openapi(activateModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const activateModelProgram = Effect.gen(function* () {
      const modelRepository = yield* ModelRepository
      return yield* modelRepository.setActive(id)
    })

    const success = await Effect.runPromise(
      activateModelProgram.pipe(Effect.provide(AppLayer))
    )

    if (!success) {
      return c.json(
        { error: "Model not found" },
        404
      )
    }

    return c.body(null, 204)
  } catch (error) {
    logger.error({ error: String(error) }, "Error activating model")
    return c.json(
      { error: "Failed to activate model" },
      500
    )
  }
})
