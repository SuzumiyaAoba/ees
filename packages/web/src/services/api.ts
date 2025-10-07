import type {
  Embedding,
  CreateEmbeddingRequest,
  CreateEmbeddingResponse,
  UpdateEmbeddingRequest,
  UpdateEmbeddingResponse,
  BatchCreateEmbeddingRequest,
  BatchCreateEmbeddingResponse,
  SearchEmbeddingRequest,
  SearchEmbeddingResponse,
  EmbeddingsListResponse,
  ErrorResponse,
  MigrationRequest,
  MigrationResponse,
  CompatibilityCheckRequest,
  CompatibilityResponse,
  ListModelsResponse,
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
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const error: ErrorResponse = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))
        throw new Error(error.error)
      } else {
        // Non-JSON response (likely HTML error page)
        await response.text() // Consume response body
        throw new Error(`HTTP ${response.status}: Server returned non-JSON response. Check if API server is running on http://localhost:3000`)
      }
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new Error('Server returned non-JSON response. Check if API server is running on http://localhost:3000')
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

  async getDistinctEmbeddingModels(): Promise<{ models: string[] }> {
    return this.request<{ models: string[] }>(`/embeddings/models`)
  }

  async deleteEmbedding(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/embeddings/${id}`, {
      method: 'DELETE',
    })
  }

  async updateEmbedding(id: number, data: UpdateEmbeddingRequest): Promise<UpdateEmbeddingResponse> {
    return this.request<UpdateEmbeddingResponse>(`/embeddings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
  async getProviders(): Promise<Array<{
    name: string
    displayName?: string
    description?: string
    status: 'online' | 'offline' | 'unknown'
    version?: string
    modelCount?: number
  }>> {
    return this.request('/providers')
  }

  async getProviderModels(provider?: string): Promise<Array<{
    name: string
    displayName?: string
    provider: string
    dimensions?: number
    maxTokens?: number
    pricePerToken?: number
    size?: number
    modified_at?: string
    digest?: string
  }>> {
    const url = provider ? `/providers/models?provider=${provider}` : '/providers/models'
    return this.request(url)
  }

  async getCurrentProvider(): Promise<{
    provider: string
    configuration?: Record<string, unknown>
  }> {
    return this.request('/providers/current')
  }

  async getOllamaStatus(): Promise<{
    status: 'online' | 'offline'
    version?: string
    models?: string[]
  }> {
    return this.request('/providers/ollama/status')
  }

  // File upload helper
  async uploadFile(file: File, modelName?: string): Promise<BatchCreateEmbeddingResponse> {
    const formData = new FormData()

    // Use webkitRelativePath if available (for directory uploads), otherwise use file name
    const fileName = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

    console.log('[API] Uploading file:', fileName, 'Original name:', file.name, 'Model:', modelName)

    // Create a new File with the correct name if webkitRelativePath exists
    const fileToUpload = fileName !== file.name
      ? new File([file], fileName, { type: file.type })
      : file

    formData.append('file', fileToUpload)
    if (modelName) {
      formData.append('model_name', modelName)
    }

    console.log('[API] FormData prepared, sending request to:', `${API_BASE_URL}/embeddings/upload`)

    const response = await fetch(`${API_BASE_URL}/embeddings/upload`, {
      method: 'POST',
      body: formData,
    })

    console.log('[API] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      console.error('[API] Upload error:', error)
      throw new Error(error.error)
    }

    const result = await response.json()
    console.log('[API] Upload result:', result)
    return result
  }

  // Migration operations
  async migrateEmbeddings(data: MigrationRequest): Promise<MigrationResponse> {
    return this.request<MigrationResponse>('/models/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async checkModelCompatibility(data: CompatibilityCheckRequest): Promise<CompatibilityResponse> {
    return this.request<CompatibilityResponse>('/models/compatibility', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getModels(): Promise<ListModelsResponse> {
    return this.request<ListModelsResponse>('/models')
  }
}

export const apiClient = new ApiClient()