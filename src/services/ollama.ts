import { Ollama } from "ollama"

const ollama = new Ollama({
  host: "http://localhost:11434",
})

export interface EmbeddingResponse {
  embedding: number[]
}

export class OllamaService {
  private static instance: OllamaService
  private model = "gemma:300m"

  private constructor() {}

  static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService()
    }
    return OllamaService.instance
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ollama.embeddings({
        model: this.model,
        prompt: text,
      })

      return response.embedding
    } catch (error) {
      console.error("Failed to generate embedding:", error)
      throw new Error("Failed to generate embedding from Ollama")
    }
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const models = await ollama.list()
      return models.models.some((model) => model.name.includes(this.model))
    } catch (error) {
      console.error("Failed to check model availability:", error)
      return false
    }
  }

  async pullModel(): Promise<void> {
    try {
      console.log(`Pulling model ${this.model}...`)
      await ollama.pull({ model: this.model })
      console.log(`Model ${this.model} pulled successfully`)
    } catch (error) {
      console.error(`Failed to pull model ${this.model}:`, error)
      throw new Error(`Failed to pull model ${this.model}`)
    }
  }
}
