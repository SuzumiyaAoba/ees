/**
 * Model Management API Implementation
 * Handles model CRUD operations
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  createPinoLogger,
  createLoggerConfig,
  ModelService,
} from "@ees/core"
import {
  listModelsRoute,
  getModelRoute,
  createModelRoute,
  updateModelRoute,
  deleteModelRoute,
  activateModelRoute,
  type CreateModel,
  type UpdateModel,
} from "./api/route"

/**
 * Logger instance for model management
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * Model management feature app with handlers
 */
export const modelApp = new OpenAPIHono()

/**
 * Handler for listing all models
 */
modelApp.openapi(listModelsRoute, async (c) => {
  try {
    const { providerId } = c.req.valid("query")
    const { AppLayer } = await import("@/app/providers/main")

    const listModelsProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      return yield* modelService.listModels(providerId)
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
 * Handler for getting model by ID
 */
modelApp.openapi(getModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const getModelProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      return yield* modelService.getModel(id)
    })

    const result = await Effect.runPromise(
      getModelProgram.pipe(Effect.provide(AppLayer))
    )

    if (!result) {
      return c.json({ error: "Model not found" }, 404)
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
 * Handler for creating new model
 */
modelApp.openapi(createModelRoute, async (c) => {
  try {
    const request = c.req.valid("json") as CreateModel
    const { AppLayer } = await import("@/app/providers/main")

    const createModelProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      return yield* modelService.createModel(request)
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
 * Handler for updating model
 */
modelApp.openapi(updateModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const request = c.req.valid("json") as UpdateModel
    const { AppLayer } = await import("@/app/providers/main")

    const updateModelProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      return yield* modelService.updateModel(id, request)
    })

    const result = await Effect.runPromise(
      updateModelProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error updating model")
    if (String(error).includes("not found")) {
      return c.json({ error: "Model not found" }, 404)
    }
    return c.json(
      { error: "Failed to update model" },
      500
    )
  }
})

/**
 * Handler for deleting model
 */
modelApp.openapi(deleteModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const deleteModelProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      yield* modelService.deleteModel(id)
    })

    await Effect.runPromise(
      deleteModelProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json({ message: "Model deleted successfully" }, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error deleting model")
    if (String(error).includes("not found")) {
      return c.json({ error: "Model not found" }, 404)
    }
    if (String(error).includes("Cannot delete active model")) {
      return c.json({ error: "Cannot delete active model" }, 400)
    }
    return c.json(
      { error: "Failed to delete model" },
      500
    )
  }
})

/**
 * Handler for activating model
 */
modelApp.openapi(activateModelRoute, async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { AppLayer } = await import("@/app/providers/main")

    const activateModelProgram = Effect.gen(function* () {
      const modelService = yield* ModelService
      yield* modelService.activateModel(id)
    })

    await Effect.runPromise(
      activateModelProgram.pipe(Effect.provide(AppLayer))
    )

    return c.json({ message: "Model activated successfully" }, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Error activating model")
    if (String(error).includes("not found")) {
      return c.json({ error: "Model not found" }, 404)
    }
    return c.json(
      { error: "Failed to activate model" },
      500
    )
  }
})
