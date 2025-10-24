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
  CreateUploadDirectoryRequest,
  CreateUploadDirectoryResponse,
  UpdateUploadDirectoryRequest,
  UploadDirectory,
  UploadDirectoryListResponse,
  SyncUploadDirectoryResponse,
  ListDirectoryResponse,
  VisualizeEmbeddingRequest,
  VisualizeEmbeddingResponse,
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

  async getEmbedding(uri: string, modelName: string): Promise<Embedding> {
    return this.request<Embedding>(`/embeddings/${encodeURIComponent(uri)}/${encodeURIComponent(modelName)}`)
  }

  async getDistinctEmbeddingModels(): Promise<{ models: string[] }> {
    return this.request<{ models: string[] }>(`/embeddings/models`)
  }

  async deleteEmbedding(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/embeddings/${id}`, {
      method: 'DELETE',
    })
  }

  async deleteAllEmbeddings(): Promise<{ message: string; deleted_count: number }> {
    return this.request<{ message: string; deleted_count: number }>('/embeddings', {
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

  async getTaskTypes(modelName: string): Promise<import('@/types/api').ListTaskTypesResponse> {
    return this.request<import('@/types/api').ListTaskTypesResponse>(`/models/task-types?model=${encodeURIComponent(modelName)}`)
  }

  // Upload Directory operations
  async createUploadDirectory(data: CreateUploadDirectoryRequest): Promise<CreateUploadDirectoryResponse> {
    return this.request<CreateUploadDirectoryResponse>('/upload-directories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getUploadDirectories(): Promise<UploadDirectoryListResponse> {
    return this.request<UploadDirectoryListResponse>('/upload-directories')
  }

  async getUploadDirectory(id: number): Promise<UploadDirectory> {
    return this.request<UploadDirectory>(`/upload-directories/${id}`)
  }

  async updateUploadDirectory(id: number, data: UpdateUploadDirectoryRequest): Promise<UploadDirectory> {
    return this.request<UploadDirectory>(`/upload-directories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteUploadDirectory(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/upload-directories/${id}`, {
      method: 'DELETE',
    })
  }

  async syncUploadDirectory(id: number): Promise<SyncUploadDirectoryResponse> {
    return this.request<SyncUploadDirectoryResponse>(`/upload-directories/${id}/sync`, {
      method: 'POST',
    })
  }

  // File System operations
  async listDirectory(path: string): Promise<ListDirectoryResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('path', path)

    return this.request<ListDirectoryResponse>(`/file-system/list?${searchParams.toString()}`)
  }

  // Visualization operations
  async visualizeEmbeddings(data: VisualizeEmbeddingRequest): Promise<VisualizeEmbeddingResponse> {
    return this.request<VisualizeEmbeddingResponse>('/embeddings/visualize', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Mock apiClient for Storybook
const createMockApiClient = () => ({
  // Embedding operations
  createEmbedding: async (data: CreateEmbeddingRequest): Promise<CreateEmbeddingResponse> => ({
    id: Math.floor(Math.random() * 10000),
    uri: data.uri,
    model_name: 'nomic-embed-text',
    message: 'created',
  }),
  createBatchEmbeddings: async (data: BatchCreateEmbeddingRequest): Promise<BatchCreateEmbeddingResponse> => ({
    results: data.texts.map((_, i) => ({
      id: Math.floor(Math.random() * 10000),
      uri: `doc-${i}`,
      model_name: 'nomic-embed-text',
      message: 'created',
    })),
    successful: data.texts.length,
    failed: 0,
    model_name: 'nomic-embed-text',
    message: 'Batch creation completed',
  }),
  getEmbeddings: async (params: { page?: number; limit?: number; uri?: string; model_name?: string }): Promise<EmbeddingsListResponse> => ({
    embeddings: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      uri: `doc-${i}`,
      text: `Sample content for doc-${i}`,
      model_name: 'nomic-embed-text',
      embedding: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      original_content: undefined,
      converted_format: undefined,
    })),
    count: 10,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    page: params.page || 1,
    limit: params.limit || 10,
    total: 10,
  }),
  getEmbedding: async (uri: string, modelName: string): Promise<Embedding> => ({
    id: 1,
    uri,
    text: `Sample content for ${uri}`,
    model_name: modelName,
    embedding: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    original_content: undefined,
    converted_format: undefined,
  }),
  getDistinctEmbeddingModels: async (): Promise<{ models: string[] }> => ({
    models: ['nomic-embed-text', 'text-embedding-3-small'],
  }),
  deleteEmbedding: async (_id: number): Promise<{ message: string }> => ({
    message: 'Embedding deleted successfully',
  }),
  deleteAllEmbeddings: async (): Promise<{ message: string; deleted_count: number }> => ({
    message: 'All embeddings deleted successfully',
    deleted_count: 10,
  }),
  updateEmbedding: async (_id: number, _data: UpdateEmbeddingRequest): Promise<UpdateEmbeddingResponse> => ({
    success: true,
    message: 'updated',
  }),
  searchEmbeddings: async (data: SearchEmbeddingRequest): Promise<SearchEmbeddingResponse> => ({
    results: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      uri: `doc-${i}`,
      text: `Sample content for doc-${i}`,
      model_name: 'nomic-embed-text',
      embedding: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      original_content: undefined,
      converted_format: undefined,
      similarity: Math.random(),
    })),
    query: data.query,
    model_name: data.model_name || 'nomic-embed-text',
    limit: data.limit || 10,
    metric: data.metric || 'cosine',
    threshold: data.threshold,
    total_results: 5,
  }),
  
  // Provider operations
  getProviders: async (): Promise<Array<{ name: string; display_name: string; status: string }>> => [
    { name: 'ollama', display_name: 'Ollama', status: 'active' },
    { name: 'openai', display_name: 'OpenAI', status: 'inactive' },
  ],
  getProviderModels: async (_provider?: string): Promise<Array<{ name: string; display_name: string; dimensions: number }>> => [
    { name: 'nomic-embed-text', display_name: 'Nomic Embed Text', dimensions: 768 },
    { name: 'text-embedding-3-small', display_name: 'Text Embedding 3 Small', dimensions: 1536 },
  ],
  getCurrentProvider: async (): Promise<{ provider: string; configuration?: Record<string, unknown> }> => ({
    provider: 'ollama',
    configuration: { baseUrl: 'http://localhost:11434' },
  }),
  getOllamaStatus: async (): Promise<{ status: string; models: string[]; version?: string }> => ({
    status: 'running',
    models: ['nomic-embed-text'],
    version: '0.1.0',
  }),
  
  // File operations
  uploadFile: async (file: File, modelName?: string): Promise<BatchCreateEmbeddingResponse> => ({
    results: Array.from({ length: 3 }, (_, i) => ({
      id: Math.floor(Math.random() * 10000),
      uri: `${file.name}-${i}`,
      model_name: modelName || 'nomic-embed-text',
      message: 'created',
    })),
    successful: 3,
    failed: 0,
    model_name: modelName || 'nomic-embed-text',
    message: 'File upload completed',
  }),
  
  // Migration operations
  migrateEmbeddings: async (_data: MigrationRequest): Promise<MigrationResponse> => ({
    totalProcessed: 10,
    successful: 10,
    failed: 0,
    duration: 1000,
    details: [],
  }),
  checkModelCompatibility: async (_data: CompatibilityCheckRequest): Promise<CompatibilityResponse> => ({
    compatible: true,
  }),
  getModels: async (): Promise<ListModelsResponse> => ({
    models: [
      { name: 'nomic-embed-text', provider: 'ollama', dimensions: 768, maxTokens: 8192, available: true },
      { name: 'text-embedding-3-small', provider: 'openai', dimensions: 1536, maxTokens: 8192, available: true },
    ],
    count: 2,
    providers: ['ollama', 'openai'],
  }),
  getTaskTypes: async (_modelName: string): Promise<import('@/types/api').ListTaskTypesResponse> => ({
    model_name: _modelName,
    task_types: [
      { value: 'semantic_similarity', label: 'Semantic Similarity', description: 'Search task' },
      { value: 'clustering', label: 'Clustering', description: 'Clustering task' },
      { value: 'classification', label: 'Classification', description: 'Classification task' },
    ],
    count: 3,
  }),
  
  // Upload directory operations
  createUploadDirectory: async (_data: CreateUploadDirectoryRequest): Promise<CreateUploadDirectoryResponse> => {
    void _data
    return {
      id: Math.floor(Math.random() * 10000),
      message: 'Upload directory created successfully',
    }
  },
  getUploadDirectories: async (): Promise<UploadDirectoryListResponse> => ({
    directories: Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      name: `Directory ${i + 1}`,
      path: `/path/to/dir${i + 1}`,
      model_name: 'nomic-embed-text',
      task_types: null,
      description: `Description for directory ${i + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })),
    count: 3,
  }),
  getUploadDirectory: async (id: number): Promise<UploadDirectory> => ({
    id,
    name: `Directory ${id}`,
    path: `/path/to/dir${id}`,
    model_name: 'nomic-embed-text',
    task_types: null,
    description: `Description for directory ${id}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  }),
  updateUploadDirectory: async (id: number, data: UpdateUploadDirectoryRequest): Promise<UploadDirectory> => ({
    id,
    name: data.name || `Directory ${id}`,
    path: `/path/to/dir${id}`,
    model_name: data.model_name || 'nomic-embed-text',
    task_types: null,
    description: data.description || `Description for directory ${id}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  }),
  deleteUploadDirectory: async (_id: number): Promise<{ message: string }> => ({
    message: 'Upload directory deleted successfully',
  }),
  syncUploadDirectory: async (_id: number): Promise<SyncUploadDirectoryResponse> => ({
    directory_id: _id,
    files_processed: 5,
    files_created: 5,
    files_updated: 0,
    files_failed: 0,
    files: ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', 'file5.txt'],
    message: 'Directory synced successfully',
  }),
  
  // File system operations
  listDirectory: async (path: string): Promise<ListDirectoryResponse> => ({
    path,
    entries: Array.from({ length: 7 }, (_, i) => ({
      name: i < 5 ? `file${i}.txt` : `dir${i - 5}`,
      path: i < 5 ? `${path}/file${i}.txt` : `${path}/dir${i - 5}`,
      isDirectory: i >= 5,
    })),
  }),
  
  // Visualization operations
  visualizeEmbeddings: async (data: VisualizeEmbeddingRequest): Promise<VisualizeEmbeddingResponse> => {
    const total = 100
    const points = Array.from({ length: total }, (_, i) => ({
      id: i + 1,
      uri: `doc-${i}`,
      model_name: 'nomic-embed-text',
      coordinates: data.dimensions === 3 ? [Math.random(), Math.random(), Math.random()] : [Math.random(), Math.random()],
    }))
    return {
      method: data.method || 'pca',
      dimensions: data.dimensions,
      parameters: {},
      points,
      total_points: points.length,
      debug_info: {
        include_uris_requested: data.include_uris || [],
        include_uris_found: points.length,
        include_uris_failed: [],
      },
    }
  },
})

// Use mock in Storybook environment or when STORYBOOK_MOCK is set
const isStorybook = typeof window !== 'undefined' &&
  (window.location?.pathname?.includes('storybook') ||
   window.location?.hostname?.includes('localhost:6006') ||
   window.location?.hostname?.includes('localhost:6007') ||
   import.meta.env.VITE_STORYBOOK_MOCK === 'true')

export const apiClient = isStorybook ? createMockApiClient() : new ApiClient()

// Debug log for Storybook
if (isStorybook) {
  console.log('[API] Using mock apiClient for Storybook environment')
}