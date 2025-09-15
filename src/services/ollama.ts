import { Ollama } from "ollama"

const ollama = new Ollama({
  host: "http://localhost:11434",
})

export interface EmbeddingResponse {
  embedding: number[]
}

export class OllamaService {
  private static instance: OllamaService

  private constructor() {}

  static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService()
    }
    return OllamaService.instance
  }

  async generateEmbedding(
    text: string,
    modelName = "gemma:300m"
  ): Promise<number[]> {
    try {
      const response = await ollama.embeddings({
        model: modelName,
        prompt: text,
      })

      return response.embedding
    } catch (error) {
      console.error("Failed to generate embedding:", error)
      throw new Error(
        `Failed to generate embedding from Ollama using model ${modelName}`
      )
    }
  }

  async isModelAvailable(modelName = "gemma:300m"): Promise<boolean> {
    try {
      const models = await ollama.list()
      return models.models.some((model) => model.name.includes(modelName))
    } catch (error) {
      console.error("Failed to check model availability:", error)
      return false
    }
  }

  async pullModel(modelName = "gemma:300m"): Promise<void> {
    try {
      console.log(`Pulling model ${modelName}...`)
      await ollama.pull({ model: modelName })
      console.log(`Model ${modelName} pulled successfully`)
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error)
      throw new Error(`Failed to pull model ${modelName}`)
    }
  }
}
