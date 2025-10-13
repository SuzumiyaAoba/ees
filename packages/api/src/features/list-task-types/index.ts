/**
 * List Task Types Feature
 * Handles retrieval of supported task types for embedding models
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { getSupportedTaskTypes } from "@ees/core"
import { listTaskTypesRoute, type ListTaskTypesResponse } from "./api/route"

export function registerListTaskTypesRoutes(app: OpenAPIHono) {
  /**
   * GET /models/task-types
   * List supported task types for a specific model
   */
  app.openapi(listTaskTypesRoute, (c) => {
    const { model } = c.req.valid("query")

    // Get supported task types from core package
    const taskTypes = getSupportedTaskTypes(model)

    const response: ListTaskTypesResponse = {
      model_name: model,
      task_types: taskTypes,
      count: taskTypes.length
    }

    return c.json(response, 200)
  })
}
