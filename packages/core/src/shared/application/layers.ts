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

/**
 * Core application layer including all business logic services
 * Independent of presentation layer (web, CLI, etc.)
 */
export const CoreApplicationLayer = Layer.mergeAll(
  EmbeddingApplicationServiceLive,
  ModelManagerLive
).pipe(
  Layer.provide(EmbeddingServiceLive)
)

/**
 * Full application layer with all dependencies
 * Ready to use for any interface (web, CLI, test)
 */
export const ApplicationLayer = CoreApplicationLayer
