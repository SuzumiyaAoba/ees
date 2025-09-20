import type {
  Embedding,
  CreateEmbeddingRequest,
  CreateEmbeddingResponse,
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
  EmbeddingsListResponse,
  ProviderInfo,
  ErrorResponse,
} from '@/types/api'

const API_BASE_URL = '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(error.error)
    }

    return response.json()
  }

  // Embedding CRUD operations
  async createEmbedding(data: CreateEmbeddingRequest): Promise<CreateEmbeddingResponse> {
    return this.request<CreateEmbeddingResponse>('/embeddings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createBatchEmbeddings(data: BatchCreateEmbeddingRequest): Promise<BatchCreateEmbeddingResponse> {
    return this.request<BatchCreateEmbeddingResponse>('/embeddings/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEmbeddings(params: {
    page?: number
    limit?: number
    uri?: string
    model_name?: string
  } = {}): Promise<EmbeddingsListResponse> {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.uri) searchParams.set('uri', params.uri)
    if (params.model_name) searchParams.set('model_name', params.model_name)

    const query = searchParams.toString()
    return this.request<EmbeddingsListResponse>(`/embeddings${query ? `?${query}` : ''}`)
  }

  async getEmbedding(uri: string): Promise<Embedding> {
    return this.request<Embedding>(`/embeddings/${encodeURIComponent(uri)}`)
  }

  async deleteEmbedding(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/embeddings/${id}`, {
      method: 'DELETE',
    })
  }

  // Search operations
  async searchEmbeddings(data: SearchEmbeddingRequest): Promise<SearchEmbeddingResponse> {
    return this.request<SearchEmbeddingResponse>('/embeddings/search', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Provider operations
  async getProviders(): Promise<string[]> {
    return this.request<string[]>('/providers')
  }

  async getProviderModels(provider?: string): Promise<ProviderInfo[]> {
    const url = provider ? `/providers/models?provider=${provider}` : '/providers/models'
    return this.request<ProviderInfo[]>(url)
  }

  async getCurrentProvider(): Promise<{ provider: string }> {
    return this.request<{ provider: string }>('/providers/current')
  }

  async getOllamaStatus(): Promise<{ version?: string; status: 'online' | 'offline' }> {
    return this.request<{ version?: string; status: 'online' | 'offline' }>('/ollama/status')
  }

  // File upload helper
  async uploadFile(file: File, modelName?: string): Promise<BatchCreateEmbeddingResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (modelName) {
      formData.append('model_name', modelName)
    }

    const response = await fetch(`${API_BASE_URL}/embeddings/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(error.error)
    }

    return response.json()
  }
}

export const apiClient = new ApiClient()