import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { streamSSE } from "hono/streaming"
import { Effect } from "effect"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  createPinoLogger,
  createLoggerConfig,
  EmbeddingService,
  UploadDirectoryRepository,
} from "@ees/core"
import { createSSRMiddleware, createStaticMiddleware } from "@/middleware/ssr"
import { batchCreateEmbeddingRoute } from "@/features/batch-create-embedding"
import { createEmbeddingRoute } from "@/features/create-embedding"
import { deleteEmbeddingRoute } from "@/features/delete-embedding"
import { deleteAllEmbeddingsRoute } from "@/features/delete-all-embeddings"
import { updateEmbeddingRoute } from "@/features/update-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
  listEmbeddingModelsRoute,
} from "@/features/list-embeddings"
import { registerListTaskTypesRoutes } from "@/features/list-task-types"
import { migrationApp } from "@/features/migrate-embeddings"
import { providerApp } from "@/features/provider-management"
import { connectionApp } from "@/features/connection-management"
import { modelApp } from "@/features/model-management"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { visualizeEmbeddingsRoute } from "@/features/visualize-embeddings"
import { uploadApp } from "@/features/upload-embeddings"
import {
  createUploadDirectoryRoute,
  listUploadDirectoriesRoute,
  getUploadDirectoryRoute,
  updateUploadDirectoryRoute,
  deleteUploadDirectoryRoute,
  syncUploadDirectoryRoute,
  getSyncJobStatusRoute,
  getLatestSyncJobRoute,
  cancelIncompleteSyncJobsRoute,
} from "@/features/upload-directory"
import { listDirectoryRoute } from "@/features/file-system"
import { rootRoute } from "./config/routes"
import { executeEffectHandler, withEmbeddingService, withModelManager, executeEffectHandlerWithConditional, validateNumericId, withUploadDirectoryRepository, withFileSystemService, withVisualizationService } from "@/shared/route-handler"
import { AppLayer } from "@/app/providers/main"
import { createSecurityMiddleware } from "@/middleware/security"
import {
  requestLoggingMiddleware,
  metricsMiddleware,
  rateLimitMetricsMiddleware,
  errorLoggingMiddleware,
  memoryMonitoringMiddleware,
  healthCheckMiddleware,
  metricsEndpointMiddleware,
} from "@/middleware/observability"



/**
 * EES (Embeddings API Service) - Main application
 *
 * A Hono-based REST API for managing text embeddings using multiple providers.
 * Supports creating, searching, listing, and deleting embeddings with OpenAPI documentation.
 */

// Initialize structured logger for application startup
const logger = createPinoLogger(createLoggerConfig())

logger.info({ component: "app", phase: "initialization" }, "Initializing Hono app")
const app = new OpenAPIHono()

logger.info({ component: "app", phase: "middleware-setup" }, "Setting up observability middleware")
// Observability middleware (must be first for proper request tracking)
app.use(requestLoggingMiddleware)
app.use(metricsMiddleware)
app.use(errorLoggingMiddleware)
app.use(memoryMonitoringMiddleware)

// Special endpoint middleware (before security to avoid rate limiting)
app.use(healthCheckMiddleware)
app.use(metricsEndpointMiddleware)

logger.info({ component: "app", phase: "security-setup" }, "Setting up security middleware")
const security = createSecurityMiddleware()

// Apply security middleware
app.use(security.secureHeaders)
app.use(security.cors)
app.use(security.requestSizeLimits)
app.use(security.textLengthValidation)

// Rate limiting metrics (after rate limiting middleware)
app.use(rateLimitMetricsMiddleware)

logger.info({ component: "app", phase: "error-handling-setup" }, "Setting up error handling")

// Global error handling middleware
app.onError((err, c) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  }, "Global error handler triggered")

  // Handle JSON parsing errors (SyntaxError from body parser)
  if (err.name === "SyntaxError" || err.message.includes("JSON") || err.message.includes("parse")) {
    return c.json({ error: "Malformed JSON in request body", details: err.message }, 400)
  }

  // Handle validation errors (usually from Zod/OpenAPI validation)
  if (err.message.includes("validation") || err.message.includes("required") || err.message.includes("invalid")) {
    return c.json({ error: "Validation error", details: err.message }, 400)
  }

  // Handle not found errors
  if (err.message.includes("not found") || err.message.includes("Not Found")) {
    return c.json({ error: "Resource not found", details: err.message }, 404)
  }

  // Default to 500 for unhandled errors
  return c.json({ error: "Internal server error", details: err.message }, 500)
})

logger.info({ component: "app", phase: "routes-setup" }, "Setting up routes")

/**
 * Root endpoint - Health check and service identification
 */
app.openapi(rootRoute, (c) => c.text("EES - Embeddings API Service" as never))

/**
 * Migration routes - Model migration and compatibility
 */
app.route("/", migrationApp)

/**
 * Upload routes - File upload and processing
 */
app.route("/", uploadApp)

/**
 * Connection management routes - Provider connection CRUD operations
 */
app.route("/", connectionApp)

/**
 * List task types endpoint
 * Returns supported task types for a specific model
 * IMPORTANT: Must be registered BEFORE modelApp to avoid /models/{id} catching /models/task-types
 */
registerListTaskTypesRoutes(app)

/**
 * Model management routes - Model CRUD operations
 */
app.route("/", modelApp)

/**
 * Provider management routes - Provider status and model discovery
 */
app.route("/", providerApp)

/**
 * Create embedding endpoint
 * Generates a new embedding for the provided text using the configured provider
 */
app.use("/embeddings", security.rateLimits.embedding)
app.openapi(createEmbeddingRoute, async (c) => {
  const { uri, text, model_name, task_types, title } = c.req.valid("json")

  return executeEffectHandler(c, "createEmbedding",
    withEmbeddingService(embeddingService =>
      embeddingService.createEmbedding(
        uri,
        text,
        model_name,
        task_types,
        title
      )
    )
  ) as never
})

/**
 * Batch create embeddings endpoint
 * Processes multiple texts in a single request for efficient bulk embedding generation
 */
app.use("/embeddings/batch", security.rateLimits.embedding)
app.openapi(batchCreateEmbeddingRoute, async (c) => {
  const request = c.req.valid("json")

  return executeEffectHandler(c, "batchCreateEmbedding",
    withEmbeddingService(appService =>
      appService.createBatchEmbeddings(request)
    )
  ) as never
})

/**
 * Search embeddings endpoint
 * Finds similar embeddings using vector similarity search with configurable metrics
 */
app.use("/embeddings/search", security.rateLimits.search)
app.openapi(searchEmbeddingsRoute, async (c) => {
  const request = c.req.valid("json")

  return executeEffectHandler(c, "searchEmbeddings",
    withEmbeddingService(appService =>
      appService.searchEmbeddings(request)
    )
  ) as never
})

/**
 * Visualize embeddings endpoint
 * Performs dimensionality reduction (PCA, t-SNE, or UMAP) for 2D/3D visualization
 */
app.use("/embeddings/visualize", security.rateLimits.general)
app.openapi(visualizeEmbeddingsRoute, async (c) => {
  const request = c.req.valid("json")

  return executeEffectHandler(c, "visualizeEmbeddings",
    withVisualizationService(visualizationService =>
      visualizationService.visualizeEmbeddings(request)
    )
  ) as never
})

/**
 * Get embedding by URI endpoint
 * Retrieves a specific embedding using its unique URI identifier
 */
app.use("/embeddings/:uri/:model_name", security.rateLimits.read)
app.openapi(getEmbeddingByUriRoute, async (c) => {
  const { uri, model_name } = c.req.valid("param")
  const decodedUri = decodeURIComponent(uri)
  const decodedModelName = decodeURIComponent(model_name)

  return executeEffectHandlerWithConditional(c, "getEmbeddingByUri",
    withEmbeddingService(appService =>
      appService.getEmbeddingByUri(decodedUri, decodedModelName)
    ),
    "Embedding not found"
  ) as never
})

/**
 * List embeddings endpoint
 * Returns paginated list of embeddings with optional filtering by URI and model
 */
app.openapi(listEmbeddingsRoute, async (c) => {
  const { uri, model_name, page, limit } = c.req.valid("query")

  // Build filters object, always include page and limit for pagination
  const filters: {
    uri?: string
    modelName?: string
    page: number
    limit: number
  } = {
    page: page || 1,
    limit: limit || 10,
  }

  // Only add optional filters if they were explicitly provided
  const queryParams = c.req.query()
  if (queryParams["uri"] && uri) {
    filters.uri = uri
  }
  if (queryParams["model_name"] && model_name) {
    filters.modelName = model_name
  }

  return executeEffectHandler(c, "listEmbeddings",
    withEmbeddingService(appService =>
      appService.listEmbeddings(filters)
    )
  ) as never
})

// List distinct model names (from DB) for browse filter
app.openapi(listEmbeddingModelsRoute, async (c) => {
  return executeEffectHandler(c, "listEmbeddingModels",
    withModelManager(modelManager =>
      Effect.gen(function* () {
        const stats = yield* modelManager.getModelUsageStats()
        const models = Object.keys(stats)
        return { models }
      })
    )
  ) as never
})

/**
 * Delete all embeddings endpoint
 * Removes all embeddings from the database
 */
app.use("/embeddings", security.rateLimits.general)
app.openapi(deleteAllEmbeddingsRoute, async (c) => {
  return executeEffectHandler(c, "deleteAllEmbeddings",
    withEmbeddingService(appService =>
      Effect.gen(function* () {
        const deletedCount = yield* appService.deleteAllEmbeddings()
        return {
          message: `Successfully deleted ${deletedCount} embedding(s)`,
          deleted_count: deletedCount
        }
      })
    )
  ) as never
})

/**
 * Delete embedding endpoint
 * Removes an embedding from the database by its ID
 */
app.use("/embeddings/:id", security.rateLimits.general)
app.openapi(deleteEmbeddingRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "deleteEmbedding",
    withEmbeddingService(appService =>
      Effect.gen(function* () {
        const deleted = yield* appService.deleteEmbedding(id)
        if (!deleted) {
          return null
        }
        return { message: "Embedding deleted successfully" }
      })
    ),
    "Embedding not found"
  ) as never
})

/**
 * Update embedding endpoint
 * Updates the text content of an existing embedding and regenerates its vector
 */
app.openapi(updateEmbeddingRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const { text, model_name } = c.req.valid("json")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandler(c, "updateEmbedding",
    withEmbeddingService(appService =>
      Effect.gen(function* () {
        const updated = yield* appService.updateEmbedding(id, text, model_name)
        return {
          success: updated,
          message: updated ? "Embedding updated successfully" : "Failed to update embedding"
        }
      })
    )
  ) as never
})

/**
 * Upload Directory Management Endpoints
 */

/**
 * Create upload directory endpoint
 * Register a new directory path for document management
 */
app.use("/upload-directories", security.rateLimits.general)
app.openapi(createUploadDirectoryRoute, async (c) => {
  const { name, path, model_name, task_types, description } = c.req.valid("json")

  return executeEffectHandler(c, "createUploadDirectory",
    Effect.gen(function* () {
      const repository = yield* UploadDirectoryRepository
      const embeddingService = yield* EmbeddingService

      // Validate model availability from active connection
      if (model_name) {
        const availableModels = yield* embeddingService.getProviderModels()
        const isModelAvailable = availableModels.some((m) => m.name === model_name)

        if (!isModelAvailable) {
          const modelNames = availableModels.map((m) => m.name).join(", ")
          return yield* Effect.fail(
            new Error(
              `Model "${model_name}" is not available in the active connection. Available models: ${modelNames}`
            )
          )
        }
      }

      // Check if path already exists
      const existing = yield* repository.findByPath(path)
      if (existing) {
        return yield* Effect.fail(new Error("Directory path already registered"))
      }

      const result = yield* repository.create({
        name,
        path,
        modelName: model_name,
        taskTypes: task_types,
        description,
      })

      return {
        id: result.id,
        message: "Upload directory created successfully",
      }
    })
  ) as never
})

/**
 * List upload directories endpoint
 * Retrieve all registered upload directories
 */
app.openapi(listUploadDirectoriesRoute, async (c) => {
  return executeEffectHandler(c, "listUploadDirectories",
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        const directories = yield* repository.findAll()

        return {
          directories: directories.map((dir: {
            id: number
            name: string
            path: string
            modelName: string
            taskTypes: string[] | null
            description: string | null
            lastSyncedAt: string | null
            createdAt: string | null
            updatedAt: string | null
          }) => ({
            id: dir.id,
            name: dir.name,
            path: dir.path,
            model_name: dir.modelName,
            task_types: dir.taskTypes,
            description: dir.description,
            last_synced_at: dir.lastSyncedAt,
            created_at: dir.createdAt,
            updated_at: dir.updatedAt,
          })),
          count: directories.length,
        }
      })
    )
  ) as never
})

/**
 * Get upload directory by ID endpoint
 * Retrieve a specific upload directory
 */
app.openapi(getUploadDirectoryRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "getUploadDirectory",
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        const directory = yield* repository.findById(id)

        if (!directory) {
          return null
        }

        return {
          id: directory.id,
          name: directory.name,
          path: directory.path,
          model_name: directory.modelName,
          task_types: directory.taskTypes,
          description: directory.description,
          last_synced_at: directory.lastSyncedAt,
          created_at: directory.createdAt,
          updated_at: directory.updatedAt,
        }
      })
    ),
    "Upload directory not found"
  ) as never
})

/**
 * Update upload directory endpoint
 * Update directory metadata (name, model, description)
 */
app.openapi(updateUploadDirectoryRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const updates = c.req.valid("json")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "updateUploadDirectory",
    Effect.gen(function* () {
      const repository = yield* UploadDirectoryRepository
      const embeddingService = yield* EmbeddingService

      // Validate model availability from active connection if model_name is being updated
      if (updates.model_name) {
        const availableModels = yield* embeddingService.getProviderModels()
        const isModelAvailable = availableModels.some((m) => m.name === updates.model_name)

        if (!isModelAvailable) {
          const modelNames = availableModels.map((m) => m.name).join(", ")
          return yield* Effect.fail(
            new Error(
              `Model "${updates.model_name}" is not available in the active connection. Available models: ${modelNames}`
            )
          )
        }
      }

      const updated = yield* repository.update(id, {
        ...(updates.name && { name: updates.name }),
        ...(updates.model_name && { modelName: updates.model_name }),
        ...(updates.task_types !== undefined && { taskTypes: updates.task_types }),
        ...(updates.description !== undefined && { description: updates.description }),
      })

      if (!updated) {
        return null
      }

      const directory = yield* repository.findById(id)
      if (!directory) {
        return null
      }

      return {
        id: directory.id,
        name: directory.name,
        path: directory.path,
        model_name: directory.modelName,
        task_types: directory.taskTypes,
        description: directory.description,
        last_synced_at: directory.lastSyncedAt,
        created_at: directory.createdAt,
        updated_at: directory.updatedAt,
      }
    }),
    "Upload directory not found"
  ) as never
})

/**
 * Delete upload directory endpoint
 * Remove a directory from the system
 */
app.openapi(deleteUploadDirectoryRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "deleteUploadDirectory",
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        const deleted = yield* repository.deleteById(id)

        if (!deleted) {
          return null
        }

        return {
          message: "Upload directory deleted successfully",
        }
      })
    ),
    "Upload directory not found"
  ) as never
})

/**
 * Sync upload directory endpoint
 * Starts a background sync job and returns job ID immediately
 */
app.openapi(syncUploadDirectoryRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "syncUploadDirectory",
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        const directory = yield* repository.findById(id)

        if (!directory) {
          return null
        }

        // Start background sync job
        const { startBackgroundSync } = yield* Effect.promise(() => import("@/features/sync-job/sync-job-manager"))

        const jobId = yield* Effect.tryPromise({
          try: () => startBackgroundSync(id, directory),
          catch: (error) => new Error(`Failed to start sync job: ${String(error)}`)
        })

        logger.info({
          operation: "syncUploadDirectory",
          directoryId: id,
          jobId
        }, "Started background sync job")

        return {
          job_id: jobId,
          directory_id: id,
          message: `Sync job started in background. Use job_id to check progress.`,
        }
      })
    ),
    "Upload directory not found"
  ) as never
})

/**
 * Get latest sync job endpoint
 * Retrieve the latest sync job for a directory
 * IMPORTANT: This route must be registered BEFORE getSyncJobStatusRoute
 * to prevent "latest" from being matched as a job_id parameter
 */
app.openapi(getLatestSyncJobRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandlerWithConditional(c, "getLatestSyncJob",
    Effect.gen(function* () {
      const { getLatestSyncJob } = yield* Effect.promise(() => import("@/features/sync-job/sync-job-manager"))

      const job = yield* Effect.tryPromise({
        try: () => getLatestSyncJob(id),
        catch: (error) => new Error(`Failed to get latest sync job: ${String(error)}`)
      })

      if (!job) {
        return null
      }

      return {
        id: job.id,
        directory_id: job.directoryId,
        status: job.status,
        total_files: job.totalFiles,
        processed_files: job.processedFiles,
        created_files: job.createdFiles,
        updated_files: job.updatedFiles,
        failed_files: job.failedFiles,
        current_file: job.currentFile,
        error_message: job.errorMessage,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      }
    }),
    "No sync job found for this directory"
  ) as never
})

/**
 * Cancel incomplete sync jobs endpoint
 * Cancel all pending or running sync jobs for a directory
 */
app.openapi(cancelIncompleteSyncJobsRoute, async (c) => {
  const { id: idStr } = c.req.valid("param")
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return executeEffectHandler(c, "cancelIncompleteSyncJobs",
    Effect.gen(function* () {
      const { cancelIncompleteJobs } = yield* Effect.promise(() => import("@/features/sync-job/sync-job-manager"))

      yield* Effect.tryPromise({
        try: () => cancelIncompleteJobs(id),
        catch: (error) => new Error(`Failed to cancel incomplete jobs: ${String(error)}`)
      })

      return {
        message: "All incomplete sync jobs have been cancelled successfully",
      }
    })
  ) as never
})

/**
 * Get sync job status endpoint
 * Retrieve the status of a specific sync job
 * IMPORTANT: This route must be registered AFTER getLatestSyncJobRoute
 * to prevent "latest" from being matched as a job_id parameter
 */
app.openapi(getSyncJobStatusRoute, async (c) => {
  const { id: dirIdStr, job_id: jobIdStr } = c.req.valid("param")

  const dirValidation = validateNumericId(dirIdStr, c)
  if (typeof dirValidation !== "number") {
    return dirValidation as never
  }

  const jobValidation = validateNumericId(jobIdStr, c)
  if (typeof jobValidation !== "number") {
    return jobValidation as never
  }

  const jobId = jobValidation

  return executeEffectHandlerWithConditional(c, "getSyncJobStatus",
    Effect.gen(function* () {
      const { getSyncJobStatus } = yield* Effect.promise(() => import("@/features/sync-job/sync-job-manager"))

      const job = yield* Effect.tryPromise({
        try: () => getSyncJobStatus(jobId),
        catch: (error) => new Error(`Failed to get sync job status: ${String(error)}`)
      })

      if (!job) {
        return null
      }

      return {
        id: job.id,
        directory_id: job.directoryId,
        status: job.status,
        total_files: job.totalFiles,
        processed_files: job.processedFiles,
        created_files: job.createdFiles,
        updated_files: job.updatedFiles,
        failed_files: job.failedFiles,
        current_file: job.currentFile,
        error_message: job.errorMessage,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      }
    }),
    "Sync job not found"
  ) as never
})

/**
 * Sync upload directory with SSE endpoint
 * Provides real-time progress updates via Server-Sent Events
 */
app.get("/upload-directories/:id/sync/stream", async (c) => {
  const { id: idStr } = c.req.param()
  const validationResult = validateNumericId(idStr, c)

  if (typeof validationResult !== "number") {
    return validationResult as never
  }

  const id = validationResult

  return streamSSE(c, async (stream) => {
    try {
      await Effect.runPromise(
        withUploadDirectoryRepository(repository =>
          Effect.gen(function* () {
            const directory = yield* repository.findById(id)

            if (!directory) {
              yield* Effect.promise(() => stream.writeSSE({
                data: JSON.stringify({ type: "error", message: "Upload directory not found" }),
                event: "error"
              }))
              return
            }

            const appService = yield* withEmbeddingService(service => Effect.succeed(service))

            // Import necessary modules
            const { collectFilesFromDirectory, processFile } = yield* Effect.promise(() => import("@ees/core"))
            const { readFile } = yield* Effect.promise(() => import("node:fs/promises"))

            // Send start event
            yield* Effect.promise(() => stream.writeSSE({
              data: JSON.stringify({ type: "start", directory_id: id }),
              event: "progress"
            }))

            // Collect all files from directory
            logger.info({ operation: "syncUploadDirectorySSE", path: directory.path }, "Collecting files from directory")
            const collectedFiles = yield* collectFilesFromDirectory(directory.path)

            const totalFiles = collectedFiles.length

            // Send collected event with total count
            yield* Effect.promise(() => stream.writeSSE({
              data: JSON.stringify({
                type: "collected",
                total_files: totalFiles,
                files: collectedFiles.map(f => f.relativePath)
              }),
              event: "progress"
            }))

            // Track statistics
            let filesCreated = 0
            let filesUpdated = 0
            let filesFailed = 0
            let currentIndex = 0

            // Process each file
            for (const collectedFile of collectedFiles) {
              currentIndex++

              try {
                // Send processing event
                yield* Effect.promise(() => stream.writeSSE({
                  data: JSON.stringify({
                    type: "processing",
                    current: currentIndex,
                    total: totalFiles,
                    file: collectedFile.relativePath,
                    created: filesCreated,
                    updated: filesUpdated,
                    failed: filesFailed
                  }),
                  event: "progress"
                }))

                // Read file content
                const buffer = yield* Effect.tryPromise({
                  try: () => readFile(collectedFile.absolutePath),
                  catch: (error) => new Error(`Failed to read file: ${String(error)}`)
                })

                // Create a File object from buffer
                const file = new File([new Uint8Array(buffer)], collectedFile.relativePath, {
                  type: "application/octet-stream"
                })

                // Process file to extract text
                const fileResult = yield* processFile(file).pipe(
                  Effect.catchAll((error) => {
                    logger.error({
                      operation: "syncUploadDirectorySSE",
                      file: collectedFile.absolutePath,
                      error: error.message
                    }, "Failed to process file")
                    filesFailed++
                    return Effect.fail(error)
                  })
                )

                // Create embedding for file content
                logger.info({
                  operation: "syncUploadDirectorySSE",
                  file: collectedFile.relativePath,
                  taskTypes: directory.taskTypes,
                  taskTypesType: typeof directory.taskTypes
                }, "Creating embedding with task types")

                yield* appService.createEmbedding(
                  collectedFile.relativePath,
                  fileResult.content,
                  directory.modelName,
                  directory.taskTypes as string[] | undefined, // task_types from directory config
                  undefined, // title
                  fileResult.originalContent,
                  fileResult.convertedFormat
                )

                filesCreated++

                // Send file completed event
                yield* Effect.promise(() => stream.writeSSE({
                  data: JSON.stringify({
                    type: "file_completed",
                    current: currentIndex,
                    total: totalFiles,
                    file: collectedFile.relativePath,
                    status: "success",
                    created: filesCreated,
                    updated: filesUpdated,
                    failed: filesFailed
                  }),
                  event: "progress"
                }))
              } catch (error) {
                logger.error({
                  operation: "syncUploadDirectorySSE",
                  file: collectedFile.absolutePath,
                  error: error instanceof Error ? error.message : String(error)
                }, "Failed to create embedding for file")
                filesFailed++

                // Send file failed event
                yield* Effect.promise(() => stream.writeSSE({
                  data: JSON.stringify({
                    type: "file_failed",
                    current: currentIndex,
                    total: totalFiles,
                    file: collectedFile.relativePath,
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                    created: filesCreated,
                    updated: filesUpdated,
                    failed: filesFailed
                  }),
                  event: "progress"
                }))
              }
            }

            // Update last_synced_at timestamp
            yield* repository.updateLastSynced(id)

            // Send completion event
            yield* Effect.promise(() => stream.writeSSE({
              data: JSON.stringify({
                type: "completed",
                directory_id: id,
                files_processed: totalFiles,
                files_created: filesCreated,
                files_updated: filesUpdated,
                files_failed: filesFailed,
                message: `Successfully synced directory: ${filesCreated} embeddings created, ${filesFailed} files failed`
              }),
              event: "progress"
            }))
          })
        ).pipe(Effect.provide(AppLayer))
      )
    } catch (error) {
      logger.error({
        operation: "syncUploadDirectorySSE",
        error: error instanceof Error ? error.message : String(error)
      }, "Failed to sync directory")

      await stream.writeSSE({
        data: JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : String(error)
        }),
        event: "error"
      })
    } finally {
      await stream.close()
    }
  })
})

/**
 * File System Endpoints
 */

/**
 * List directory contents endpoint
 * Returns subdirectories for directory picker
 */
app.openapi(listDirectoryRoute, async (c) => {
  const { path } = c.req.valid("query")

  return executeEffectHandler(c, "listDirectory",
    withFileSystemService(service =>
      Effect.gen(function* () {
        const entries = yield* service.listDirectory(path)

        return {
          path,
          entries,
        }
      })
    )
  ) as never
})

/**
 * OpenAPI specification endpoint
 * Provides machine-readable API documentation in OpenAPI 3.0 format
 */
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "EES - Embeddings API Service",
    description:
      "API for generating, storing, and retrieving text embeddings using Ollama models",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check endpoints",
    },
    {
      name: "Embeddings",
      description: "Embedding generation and management endpoints",
    },
    {
      name: "Models",
      description: "Model information and availability endpoints",
    },
    {
      name: "Providers",
      description: "Provider management and status endpoints",
    },
    {
      name: "Upload Directories",
      description: "Upload directory management and synchronization endpoints",
    },
    {
      name: "File System",
      description: "File system browsing endpoints for directory picker",
    },
  ],
})

/**
 * Swagger UI endpoint
 * Interactive API documentation interface for testing and exploration
 */
app.get("/docs", swaggerUI({ url: "/openapi.json" }))

// SSR and static file serving
// Configure paths based on environment
const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, "..")

// Determine if we're in development or production mode
const mode = process.env["NODE_ENV"] === "production" ? "production" : "development"
const isTest = process.env["NODE_ENV"] === "test"

// Skip SSR/proxy setup in test environment to avoid route conflicts
if (!isTest) {
  // In production, serve static assets and SSR
  if (mode === "production") {
    logger.info({ component: "app", phase: "ssr-setup" }, "Setting up SSR middleware for production")

    const clientDistPath = join(__dirname, "../../web/dist/client")
    const serverDistPath = join(__dirname, "../../web/dist/server")

    // Serve static assets (CSS, JS, images, etc.)
    app.get("/assets/*", createStaticMiddleware(clientDistPath))

    // SSR for all other routes (frontend application)
    app.get("*", createSSRMiddleware({
      mode,
      clientDistPath,
      serverDistPath
    }))
  } else {
    logger.info({ component: "app", phase: "ssr-setup" }, "Development mode - frontend served by Vite dev server")

    // In development, proxy all non-API routes to Vite dev server
    const viteUrl = process.env["VITE_DEV_SERVER_URL"] || "http://localhost:5173"

    app.get("*", async (c) => {
      const path = c.req.path

      // Skip proxying if this is an API route
      if (path.startsWith("/embeddings") ||
          path.startsWith("/upload") ||
          path.startsWith("/migrate") ||
          path.startsWith("/providers") ||
          path.startsWith("/connections") ||
          path.startsWith("/models") ||
          path.startsWith("/upload-directories") ||
          path.startsWith("/filesystem") ||
          path.startsWith("/openapi.json") ||
          path.startsWith("/docs") ||
          path.startsWith("/health") ||
          path.startsWith("/metrics")) {
        // Not found for API routes that don't exist
        return c.json({ error: "Not found" }, 404)
      }

      // Proxy to Vite dev server for frontend routes
      try {
        const response = await fetch(new URL(c.req.url.replace(c.req.url.split("/").slice(0, 3).join("/"), viteUrl)))
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        })
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error),
          path,
          viteUrl
        }, "Failed to proxy to Vite dev server")
        return c.text("Failed to connect to Vite dev server", 502)
      }
    })
  }
} else {
  logger.info({ component: "app", phase: "ssr-setup" }, "Test mode - SSR/proxy disabled")
}

export default app
