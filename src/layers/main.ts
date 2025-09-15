import { Layer } from "effect"
import { DatabaseServiceLive } from "../services/database"
import { EmbeddingServiceLive } from "../services/embedding-effect"
import { OllamaServiceLive } from "../services/ollama-effect"

export const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  OllamaServiceLive,
  EmbeddingServiceLive
)
