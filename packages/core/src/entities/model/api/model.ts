/**
 * Model service - interface for model management
 */

import { Context, Effect, Layer } from "effect"
import { DatabaseQueryError } from "@/shared/errors/database"
import { ModelRepository } from "@/entities/model/repository/model-repository"
import type { Model } from "@/shared/database/schema"

/**
 * Model request/response types
 */
export interface CreateModelRequest {
  providerId: number
  name: string
  displayName?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateModelRequest {
  name?: string
  displayName?: string
  metadata?: Record<string, unknown>
}

export interface ModelResponse {
  id: number
  providerId: number
  name: string
  displayName: string | null
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ModelsListResponse {
  models: ModelResponse[]
  total: number
}

/**
 * Model service interface
 */
export interface ModelService {
  readonly createModel: (
    request: CreateModelRequest
  ) => Effect.Effect<ModelResponse, DatabaseQueryError>

  readonly getModel: (
    id: number
  ) => Effect.Effect<ModelResponse | null, DatabaseQueryError>

  readonly listModels: (
    providerId?: number
  ) => Effect.Effect<ModelsListResponse, DatabaseQueryError>

  readonly updateModel: (
    id: number,
    request: UpdateModelRequest
  ) => Effect.Effect<ModelResponse, DatabaseQueryError>

  readonly deleteModel: (id: number) => Effect.Effect<void, DatabaseQueryError>

  readonly activateModel: (id: number) => Effect.Effect<void, DatabaseQueryError>
}

export const ModelService = Context.GenericTag<ModelService>("ModelService")

const make = Effect.gen(function* () {
  const modelRepository = yield* ModelRepository

  /**
   * Helper to convert model to response
   */
  const toModelResponse = (model: Model): ModelResponse => ({
    id: model.id,
    providerId: model.providerId,
    name: model.name,
    displayName: model.displayName || null,
    isActive: model.isActive,
    metadata: model.metadata ? (JSON.parse(model.metadata) as Record<string, unknown>) : null,
    createdAt: model.createdAt || null,
    updatedAt: model.updatedAt || null,
  })

  /**
   * Create a new model
   */
  const createModel = (request: CreateModelRequest) =>
    Effect.gen(function* () {
      const modelData = {
        providerId: request.providerId,
        name: request.name,
        displayName: request.displayName,
        isActive: request.isActive || false,
        metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
      }

      // If this should be active, deactivate all other models first
      if (request.isActive) {
        const allModels = yield* modelRepository.findAll()
        for (const existingModel of allModels) {
          if (existingModel.isActive) {
            yield* modelRepository.update(existingModel.id, { isActive: false })
          }
        }
      }

      const model = yield* modelRepository.create(modelData)
      return toModelResponse(model)
    })

  /**
   * Get model by ID
   */
  const getModel = (id: number) =>
    Effect.gen(function* () {
      const model = yield* modelRepository.findById(id)
      if (!model) return null
      return toModelResponse(model)
    })

  /**
   * List all models, optionally filtered by provider
   */
  const listModels = (providerId?: number) =>
    Effect.gen(function* () {
      const allModels = providerId
        ? yield* modelRepository.findByProviderId(providerId)
        : yield* modelRepository.findAll()

      const models = allModels.map(toModelResponse)

      return {
        models,
        total: models.length,
      }
    })

  /**
   * Update model
   */
  const updateModel = (id: number, request: UpdateModelRequest) =>
    Effect.gen(function* () {
      const updateData: Partial<Omit<Model, "id" | "createdAt">> = {}

      if (request.name !== undefined) updateData.name = request.name
      if (request.displayName !== undefined) updateData.displayName = request.displayName
      if (request.metadata !== undefined) {
        updateData.metadata = JSON.stringify(request.metadata)
      }

      const success = yield* modelRepository.update(id, updateData)
      if (!success) {
        yield* Effect.fail(new DatabaseQueryError({ message: "Model not found" }))
      }

      const updatedModel = yield* modelRepository.findById(id)
      if (!updatedModel) {
        return yield* Effect.fail(new DatabaseQueryError({ message: "Model not found after update" }))
      }

      return toModelResponse(updatedModel)
    })

  /**
   * Delete model
   */
  const deleteModel = (id: number) =>
    Effect.gen(function* () {
      // Check if model is active
      const model = yield* modelRepository.findById(id)
      if (!model) {
        return yield* Effect.fail(new DatabaseQueryError({ message: "Model not found" }))
      }

      // Allow deletion of 'default' model even if active (legacy cleanup)
      if (model.isActive && model.name !== 'default') {
        return yield* Effect.fail(new DatabaseQueryError({ message: "Cannot delete active model" }))
      }

      const success = yield* modelRepository.delete(id)
      if (!success) {
        yield* Effect.fail(new DatabaseQueryError({ message: "Failed to delete model" }))
      }
    })

  /**
   * Activate model (deactivates all others)
   */
  const activateModel = (id: number) =>
    Effect.gen(function* () {
      const success = yield* modelRepository.setActive(id)
      if (!success) {
        yield* Effect.fail(new DatabaseQueryError({ message: "Model not found" }))
      }
    })

  return {
    createModel,
    getModel,
    listModels,
    updateModel,
    deleteModel,
    activateModel,
  }
})

export const ModelServiceLive = Layer.effect(ModelService, make)
