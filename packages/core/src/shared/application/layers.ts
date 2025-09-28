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
 * Includes database service as the foundational layer
 */
export const ApplicationLayer = CoreApplicationLayer.pipe(
  Layer.provide(DatabaseServiceLive)
)
