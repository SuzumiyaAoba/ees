import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import { createPinoLogger, createLoggerConfig } from "@ees/core"
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
import { listModelsRoute } from "@/features/list-models"
import { registerListTaskTypesRoutes } from "@/features/list-task-types"
import { migrationApp } from "@/features/migrate-embeddings"
import { providerApp } from "@/features/provider-management"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { uploadApp } from "@/features/upload-embeddings"
import {
  createUploadDirectoryRoute,
  listUploadDirectoriesRoute,
  getUploadDirectoryRoute,
  updateUploadDirectoryRoute,
  deleteUploadDirectoryRoute,
  syncUploadDirectoryRoute,
} from "@/features/upload-directory"
import { listDirectoryRoute } from "@/features/file-system"
import { rootRoute } from "./config/routes"
import { executeEffectHandler, withEmbeddingService, withModelManager, executeEffectHandlerWithConditional, validateNumericId, withUploadDirectoryRepository, withFileSystemService } from "@/shared/route-handler"
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
 * Provider management routes - Provider status and model discovery
 */
app.route("/", providerApp)

/**
 * Create embedding endpoint
 * Generates a new embedding for the provided text using the configured provider
 */
app.use("/embeddings", security.rateLimits.embedding)
app.openapi(createEmbeddingRoute, async (c) => {
  const { uri, text, model_name } = c.req.valid("json")

  return executeEffectHandler(c, "createEmbedding",
    withEmbeddingService(appService =>
      appService.createEmbedding({
        uri,
        text,
        modelName: model_name,
      })
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
 * List available models endpoint
 * Returns all models available through configured providers including environment variables and Ollama response
 */
app.use("/models", security.rateLimits.read)
app.openapi(listModelsRoute, async (c) => {
  return executeEffectHandler(c, "listModels",
    withModelManager(modelManager =>
      Effect.gen(function* () {
        const models = yield* modelManager.listAvailableModels()

        // Extract unique providers from models
        const providers = Array.from(new Set(models.map((model: { provider: string }) => model.provider)))

        return {
          models,
          count: models.length,
          providers
        }
      })
    )
  ) as never
})

/**
 * List task types endpoint
 * Returns supported task types for a specific model
 */
registerListTaskTypesRoutes(app)

/**
 * Upload Directory Management Endpoints
 */

/**
 * Create upload directory endpoint
 * Register a new directory path for document management
 */
app.use("/upload-directories", security.rateLimits.general)
app.openapi(createUploadDirectoryRoute, async (c) => {
  const { name, path, model_name, description } = c.req.valid("json")

  return executeEffectHandler(c, "createUploadDirectory",
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        // Check if path already exists
        const existing = yield* repository.findByPath(path)
        if (existing) {
          return yield* Effect.fail(new Error("Directory path already registered"))
        }

        const result = yield* repository.create({
          name,
          path,
          modelName: model_name,
          description,
        })

        return {
          id: result.id,
          message: "Upload directory created successfully",
        }
      })
    )
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
            description: string | null
            lastSyncedAt: string | null
            createdAt: string | null
            updatedAt: string | null
          }) => ({
            id: dir.id,
            name: dir.name,
            path: dir.path,
            model_name: dir.modelName,
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
    withUploadDirectoryRepository(repository =>
      Effect.gen(function* () {
        const updated = yield* repository.update(id, {
          ...(updates.name && { name: updates.name }),
          ...(updates.model_name && { modelName: updates.model_name }),
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
 * Scan directory and process all files
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

        const appService = yield* withEmbeddingService(service => Effect.succeed(service))

        // Import necessary modules
        const { collectFilesFromDirectory, processFile } = yield* Effect.promise(() => import("@ees/core"))
        const { readFile } = yield* Effect.promise(() => import("node:fs/promises"))

        // Collect all files from directory
        logger.info({ operation: "syncUploadDirectory", path: directory.path }, "Collecting files from directory")
        const collectedFiles = yield* collectFilesFromDirectory(directory.path)
        logger.info({
          operation: "syncUploadDirectory",
          path: directory.path,
          filesCount: collectedFiles.length,
          files: collectedFiles.map(f => f.relativePath)
        }, "Collected files from directory")

        // Track statistics
        let filesCreated = 0
        let filesUpdated = 0
        let filesFailed = 0

        // Process each file
        for (const collectedFile of collectedFiles) {
          try {
            // Read file content
            const buffer = yield* Effect.tryPromise({
              try: () => readFile(collectedFile.absolutePath),
              catch: (error) => new Error(`Failed to read file: ${String(error)}`)
            })

            // Create a File object from buffer (convert Buffer to Uint8Array)
            const file = new File([new Uint8Array(buffer)], collectedFile.relativePath, {
              type: "application/octet-stream"
            })

            // Process file to extract text
            const fileResult = yield* processFile(file).pipe(
              Effect.catchAll((error) => {
                logger.error({
                  operation: "syncUploadDirectory",
                  file: collectedFile.absolutePath,
                  error: error.message
                }, "Failed to process file")
                filesFailed++
                return Effect.fail(error)
              })
            )

            // Create embedding for file content
            yield* appService.createEmbedding({
              uri: collectedFile.relativePath,
              text: fileResult.content,
              modelName: directory.modelName,
              originalContent: fileResult.originalContent,
              convertedFormat: fileResult.convertedFormat,
            })

            filesCreated++
          } catch (error) {
            logger.error({
              operation: "syncUploadDirectory",
              file: collectedFile.absolutePath,
              error: error instanceof Error ? error.message : String(error)
            }, "Failed to create embedding for file")
            filesFailed++
          }
        }

        // Update last_synced_at timestamp
        yield* repository.updateLastSynced(id)

        return {
          directory_id: id,
          files_processed: collectedFiles.length,
          files_created: filesCreated,
          files_updated: filesUpdated,
          files_failed: filesFailed,
          message: `Successfully synced directory: ${filesCreated} embeddings created, ${filesFailed} files failed`,
        }
      })
    ),
    "Upload directory not found"
  ) as never
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


export default app
