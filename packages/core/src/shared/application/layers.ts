/**
 * Application Layer Dependencies
 *
 * Provides composed layers for different runtime environments
 * (web server, CLI, testing, etc.)
 */

import { Layer } from "effect"
import { EmbeddingServiceLive, EmbeddingProviderServiceFromConnection } from "@/entities/embedding/api/embedding.js"
import { EmbeddingApplicationServiceLive } from "./embedding-application"
import { ModelManagerLive } from "@/shared/models"
import { DatabaseServiceLive } from "@/shared/database/connection"
import { MetricsLayer } from "@/shared/observability/metrics"
import { CacheServiceLiveDefault } from "@/shared/cache"
import { UploadDirectoryRepositoryLive } from "@/entities/upload-directory/repository/upload-directory-repository"
import { FileSystemServiceLive } from "@/entities/file-system/api/file-system"
import { VisualizationServiceLive } from "@/entities/visualization/api/visualization-service"
import { ConnectionServiceLive } from "@/entities/connection/api/connection"

/**
 * Core application layer including all business logic services
 * Independent of presentation layer (web, CLI, etc.)
 *
 * Layer composition:
 * 1. ConnectionServiceLive provides ConnectionService
 * 2. EmbeddingProviderServiceFromConnection uses ConnectionService to provide EmbeddingProviderService
 * 3. EmbeddingServiceLive uses EmbeddingProviderService to provide EmbeddingService
 * 4. EmbeddingApplicationServiceLive uses EmbeddingService to provide EmbeddingApplicationService
 */
export const CoreApplicationLayer = Layer.mergeAll(
  ModelManagerLive,
  EmbeddingApplicationServiceLive,
  UploadDirectoryRepositoryLive,
  FileSystemServiceLive,
  VisualizationServiceLive,
  ConnectionServiceLive
).pipe(
  // Provide EmbeddingServiceLive (which needs EmbeddingProviderService)
  Layer.provide(EmbeddingServiceLive),
  // Provide EmbeddingProviderServiceFromConnection (which needs ConnectionService, provided by ConnectionServiceLive above)
  Layer.provide(EmbeddingProviderServiceFromConnection.pipe(Layer.provide(ConnectionServiceLive)))
)

/**
 * Full application layer with all dependencies
 * Ready to use for any interface (web, CLI, test)
 * Includes database service, metrics, and cache as the foundational layers
 */
export const ApplicationLayer = CoreApplicationLayer.pipe(
  Layer.provideMerge(Layer.mergeAll(
    DatabaseServiceLive,
    MetricsLayer,
    CacheServiceLiveDefault
  ))
)
