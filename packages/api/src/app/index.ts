import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import { batchCreateEmbeddingRoute } from "@/features/batch-create-embedding"
import { createEmbeddingRoute } from "@/features/create-embedding"
import { deleteEmbeddingRoute } from "@/features/delete-embedding"
import {
  getEmbeddingByUriRoute,
  listEmbeddingsRoute,
} from "@/features/list-embeddings"
import { listModelsRoute } from "@/features/list-models"
import { migrationApp } from "@/features/migrate-embeddings"
import { providerApp } from "@/features/provider-management"
import { searchEmbeddingsRoute } from "@/features/search-embeddings"
import { uploadApp } from "@/features/upload-embeddings"
import { rootRoute } from "./config/routes"
import { executeEffectHandler, withEmbeddingService, withModelManager, executeEffectHandlerWithConditional, validateNumericId } from "@/shared/route-handler"
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

console.log("Initializing Hono app...")
const app = new OpenAPIHono()

console.log("Setting up observability middleware...")
// Observability middleware (must be first for proper request tracking)
app.use(requestLoggingMiddleware)
app.use(metricsMiddleware)
app.use(errorLoggingMiddleware)
app.use(memoryMonitoringMiddleware)

// Special endpoint middleware (before security to avoid rate limiting)
app.use(healthCheckMiddleware)
app.use(metricsEndpointMiddleware)

console.log("Setting up security middleware...")
const security = createSecurityMiddleware()

// Apply security middleware
app.use(security.secureHeaders)
app.use(security.cors)
app.use(security.requestSizeLimits)
app.use(security.textLengthValidation)

// Rate limiting metrics (after rate limiting middleware)
app.use(rateLimitMetricsMiddleware)

console.log("Setting up error handling...")

// Global error handling middleware
app.onError((err, c) => {
  console.error("Global error handler:", err)

  // Handle validation errors (usually from Zod/OpenAPI validation)
  if (err.message.includes("validation") || err.message.includes("required") || err.message.includes("invalid")) {
    return c.json({ error: "Validation error", details: err.message }, 400)
  }

  // Handle JSON parsing errors
  if (err.message.includes("JSON") || err.message.includes("parse") || err.name === "SyntaxError") {
    return c.json({ error: "Malformed JSON in request body", details: err.message }, 400)
  }

  // Handle not found errors
  if (err.message.includes("not found") || err.message.includes("Not Found")) {
    return c.json({ error: "Resource not found", details: err.message }, 404)
  }

  // Default to 500 for unhandled errors
  return c.json({ error: "Internal server error", details: err.message }, 500)
})

console.log("Setting up routes...")

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
  ) as any
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
  ) as any
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
  ) as any
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
  ) as any
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
  ) as any
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
    return validationResult // Return early error response
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
  ) as any
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
  ) as any
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
  ],
})

/**
 * Swagger UI endpoint
 * Interactive API documentation interface for testing and exploration
 */
app.get("/docs", swaggerUI({ url: "/openapi.json" }))


export default app
