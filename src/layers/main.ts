import { Layer } from "effect"
import { DatabaseServiceLive } from "../database/connection"
import { EmbeddingServiceLive } from "../services/embedding"
import { OllamaServiceLive } from "../services/ollama"

export const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  OllamaServiceLive,
  EmbeddingServiceLive
)
