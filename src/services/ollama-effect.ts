import { Context, Effect, Layer } from "effect"
import { Ollama } from "ollama"
import { OllamaConnectionError, OllamaModelError } from "../errors/ollama"

export interface OllamaService {
  readonly generateEmbedding: (
    text: string,
    modelName?: string
  ) => Effect.Effect<number[], OllamaModelError>
  readonly isModelAvailable: (
    modelName?: string
  ) => Effect.Effect<boolean, OllamaConnectionError>
  readonly pullModel: (
    modelName?: string
  ) => Effect.Effect<void, OllamaModelError>
}

export const OllamaService = Context.GenericTag<OllamaService>("OllamaService")

const make = Effect.gen(function* () {
  const ollama = new Ollama({
    host: "http://localhost:11434",
  })

  const generateEmbedding = (text: string, modelName = "embeddinggemma:300m") =>
    Effect.tryPromise({
      try: async () => {
        const response = await ollama.embeddings({
          model: modelName,
          prompt: text,
        })
        return response.embedding
      },
      catch: (error) =>
        new OllamaModelError({
          message: `Failed to generate embedding using model ${modelName}`,
          modelName,
          cause: error,
        }),
    })

  const isModelAvailable = (modelName = "embeddinggemma:300m") =>
    Effect.tryPromise({
      try: async () => {
        const models = await ollama.list()
        return models.models.some((model) => model.name.includes(modelName))
      },
      catch: (error) =>
        new OllamaConnectionError({
          message: "Failed to check model availability",
          cause: error,
        }),
    })

  const pullModel = (modelName = "embeddinggemma:300m") =>
    Effect.tryPromise({
      try: async () => {
        console.log(`Pulling model ${modelName}...`)
        await ollama.pull({ model: modelName })
        console.log(`Model ${modelName} pulled successfully`)
      },
      catch: (error) =>
        new OllamaModelError({
          message: `Failed to pull model ${modelName}`,
          modelName,
          cause: error,
        }),
    })

  return {
    generateEmbedding,
    isModelAvailable,
    pullModel,
  } as const
})

export const OllamaServiceLive = Layer.effect(OllamaService, make)
