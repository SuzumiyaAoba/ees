/**
 * Application Layer Dependencies
 *
 * Provides composed layers for different runtime environments
 * (web server, CLI, testing, etc.)
 */

import { Layer } from "effect"
import { EmbeddingServiceLive } from "@/entities/embedding/api/embedding"
import { EmbeddingApplicationServiceLive } from "./embedding-application"

/**
 * Core application layer including all business logic services
 * Independent of presentation layer (web, CLI, etc.)
 */
export const CoreApplicationLayer = Layer.mergeAll(
  EmbeddingServiceLive,
  EmbeddingApplicationServiceLive
)

/**
 * Full application layer with all dependencies
 * Ready to use for any interface (web, CLI, test)
 */
export const ApplicationLayer = CoreApplicationLayer
