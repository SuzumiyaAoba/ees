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
import { ModelServiceLive } from "@/entities/model/api/model"
import { ProviderRepositoryLive } from "@/entities/provider/repository/provider-repository"
import { ModelRepositoryLive } from "@/entities/model/repository/model-repository"

/**
 * Core application layer including all business logic services
 * Independent of presentation layer (web, CLI, etc.)
 *
 * Layer composition strategy:
 * Build layers bottom-up, providing dependencies as we go:
 * 1. Base layer: self-contained services and repositories
 * 2. ConnectionService layer (needs repositories)
 * 3. EmbeddingProvider layer (needs ConnectionService)
 * 4. EmbeddingService layer (needs EmbeddingProviderService)
 * 5. ModelManager layer (needs EmbeddingProviderService and DatabaseService)
 * 6. EmbeddingApplicationService layer (needs EmbeddingService)
 *
 * Using Layer.provide instead of Layer.provideMerge for explicit dependency injection
 */

// Base layer with self-contained services and repositories
// Note: DatabaseServiceLive is included here to ensure it's available externally,
// even though repositories provide their own internally (Effect shares the same instance)
const BaseLayer = Layer.mergeAll(
  DatabaseServiceLive,
  MetricsLayer,
  CacheServiceLiveDefault,
  FileSystemServiceLive,
  VisualizationServiceLive,
  ProviderRepositoryLive,
  ModelRepositoryLive,
  UploadDirectoryRepositoryLive
)

// ConnectionService and ModelService need repositories
const ConnectionLayer = Layer.provide(ConnectionServiceLive, BaseLayer)
const ModelServiceLayer = Layer.provide(ModelServiceLive, BaseLayer)

// EmbeddingProvider needs ConnectionService
const BaseWithConnectionAndModelLayer = Layer.mergeAll(BaseLayer, ConnectionLayer, ModelServiceLayer)
const EmbeddingProviderLayer = Layer.provide(EmbeddingProviderServiceFromConnection, BaseWithConnectionAndModelLayer)

// EmbeddingService needs EmbeddingProviderService
const BaseWithConnectionAndProviderLayer = Layer.merge(BaseWithConnectionAndModelLayer, EmbeddingProviderLayer)
const EmbeddingServiceLayer = Layer.provide(EmbeddingServiceLive, BaseWithConnectionAndProviderLayer)

// ModelManager needs EmbeddingProviderService and DatabaseService (provided by repositories)
const BaseWithAllEmbeddingServicesLayer = Layer.merge(BaseWithConnectionAndProviderLayer, EmbeddingServiceLayer)
const ModelManagerLayer = Layer.provide(ModelManagerLive, BaseWithAllEmbeddingServicesLayer)

// EmbeddingApplicationService needs EmbeddingService
const BaseWithModelManagerLayer = Layer.merge(BaseWithAllEmbeddingServicesLayer, ModelManagerLayer)
const EmbeddingApplicationLayer = Layer.provide(EmbeddingApplicationServiceLive, BaseWithModelManagerLayer)

// Final layer merges everything including RerankingService
// RerankingService is an Effect.Service that automatically provides its layer when DatabaseService is available
export const CoreApplicationLayer = Layer.merge(BaseWithModelManagerLayer, EmbeddingApplicationLayer)

/**
 * Full application layer with all dependencies
 * Ready to use for any interface (web, CLI, test)
 *
 * Note: All services are now included in CoreApplicationLayer, which builds
 * the complete dependency graph from foundational services up to application services.
 * This alias is maintained for backward compatibility.
 */
export const ApplicationLayer = CoreApplicationLayer
