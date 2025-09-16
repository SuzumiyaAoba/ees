import { Layer } from "effect"
import { EmbeddingServiceLive } from "../../entities/embedding/api/embedding"
import { OllamaServiceLive } from "../../entities/embedding/api/ollama"
import { DatabaseServiceLive } from "../../shared/database/connection"

export const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  OllamaServiceLive,
  EmbeddingServiceLive
)
