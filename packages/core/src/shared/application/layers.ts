/**
 * Application Layer Dependencies
 *
 * Provides composed layers for different runtime environments
 * (web server, CLI, testing, etc.)
 */

import { Layer } from "effect"
import { EmbeddingServiceLive } from "@/entities/embedding/api/embedding.js"
import { EmbeddingApplicationServiceLive } from "./embedding-application"
import { ModelManagerLive } from "@/shared/models"
import { DatabaseServiceLive } from "@/shared/database/connection"
import { MetricsLayer } from "@/shared/observability/metrics"
import { CacheServiceLiveDefault } from "@/shared/cache"

/**
 * Core application layer including all business logic services
 * Independent of presentation layer (web, CLI, etc.)
 */
export const CoreApplicationLayer = Layer.mergeAll(
  ModelManagerLive,
  EmbeddingApplicationServiceLive
).pipe(
  Layer.provide(EmbeddingServiceLive)  // EmbeddingService provides dependencies for Application Service
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
