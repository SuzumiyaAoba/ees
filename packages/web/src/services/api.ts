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
  CreateUploadDirectoryRequest,
  CreateUploadDirectoryResponse,
  UpdateUploadDirectoryRequest,
  UploadDirectory,
  UploadDirectoryListResponse,
  SyncUploadDirectoryResponse,
  SyncJobStatus,
  ListDirectoryResponse,
  VisualizeEmbeddingRequest,
  VisualizeEmbeddingResponse,
  ProviderResponse,
  CurrentProviderResponse,
  ProviderModelResponse,
  Provider,
  CreateProviderRequest,
  UpdateProviderRequest,
  ProvidersListResponse,
  ProviderTestRequest,
  ProviderTestResponse,
  Model,
  CreateModelRequest,
  UpdateModelRequest,
  ModelsListResponse,
  Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionTestRequest,
  ConnectionTestResponse,
  ConnectionsListResponse,
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
  async getProviders(): Promise<ProviderResponse[]> {
    return this.request('/providers')
  }

  async getProviderModels(provider?: string): Promise<ProviderModelResponse[]> {
    const url = provider ? `/providers/models?provider=${provider}` : '/providers/models'
    return this.request(url)
  }

  async getCurrentProvider(): Promise<CurrentProviderResponse> {
    return this.request('/providers/current')
  }

  // File upload helper
  async uploadFile(file: File, modelName?: string): Promise<BatchCreateEmbeddingResponse> {
    const formData = new FormData()

    // Use webkitRelativePath if available (for directory uploads), otherwise use file name
    const fileName = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

    // Create a new File with the correct name if webkitRelativePath exists
    const fileToUpload = fileName !== file.name
      ? new File([file], fileName, { type: file.type })
      : file

    formData.append('file', fileToUpload)
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

    const result = await response.json()
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

  async getSyncJobStatus(directoryId: number, jobId: number): Promise<SyncJobStatus> {
    return this.request<SyncJobStatus>(`/upload-directories/${directoryId}/sync/jobs/${jobId}`, {
      method: 'GET',
    })
  }

  async getLatestSyncJob(directoryId: number): Promise<SyncJobStatus | null> {
    try {
      return await this.request<SyncJobStatus>(`/upload-directories/${directoryId}/sync/jobs/latest`, {
        method: 'GET',
      })
    } catch (error) {
      // If no job exists, return null instead of throwing
      // This is expected when checking for running jobs on page load
      return null
    }
  }

  async cancelIncompleteSyncJobs(directoryId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/upload-directories/${directoryId}/sync/jobs`, {
      method: 'DELETE',
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

  // Connection Management operations
  async getConnections(): Promise<ConnectionsListResponse> {
    return this.request<ConnectionsListResponse>('/connections')
  }

  async getConnection(id: number): Promise<Connection> {
    return this.request<Connection>(`/connections/${id}`)
  }

  async getActiveConnection(): Promise<Connection | null> {
    return this.request<Connection | null>('/connections/active')
  }

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    return this.request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateConnection(id: number, data: UpdateConnectionRequest): Promise<Connection> {
    return this.request<Connection>(`/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteConnection(id: number): Promise<void> {
    return this.request<void>(`/connections/${id}`, {
      method: 'DELETE',
    })
  }

  async activateConnection(id: number): Promise<void> {
    return this.request<void>(`/connections/${id}/activate`, {
      method: 'POST',
    })
  }

  async testConnection(data: ConnectionTestRequest): Promise<ConnectionTestResponse> {
    return this.request<ConnectionTestResponse>('/connections/test', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Provider Management operations
  async getProvidersList(): Promise<ProvidersListResponse> {
    return this.request<ProvidersListResponse>('/providers')
  }

  async getProvider(id: number): Promise<Provider> {
    return this.request<Provider>(`/providers/${id}`)
  }

  async createProvider(data: CreateProviderRequest): Promise<Provider> {
    return this.request<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProvider(id: number, data: UpdateProviderRequest): Promise<Provider> {
    return this.request<Provider>(`/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProvider(id: number): Promise<void> {
    return this.request<void>(`/providers/${id}`, {
      method: 'DELETE',
    })
  }

  async testProvider(data: ProviderTestRequest): Promise<ProviderTestResponse> {
    return this.request<ProviderTestResponse>('/providers/test', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Model Management operations
  async getModelsList(providerId?: number): Promise<ModelsListResponse> {
    const url = providerId ? `/models?providerId=${providerId}` : '/models'
    return this.request<ModelsListResponse>(url)
  }

  async getModel(id: number): Promise<Model> {
    return this.request<Model>(`/models/${id}`)
  }

  async createModel(data: CreateModelRequest): Promise<Model> {
    return this.request<Model>('/models', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateModel(id: number, data: UpdateModelRequest): Promise<Model> {
    return this.request<Model>(`/models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteModel(id: number): Promise<void> {
    return this.request<void>(`/models/${id}`, {
      method: 'DELETE',
    })
  }

  async activateModel(id: number): Promise<void> {
    return this.request<void>(`/models/${id}/activate`, {
      method: 'POST',
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
  getProviders: async (): Promise<ProviderResponse[]> => [
    { name: 'ollama', displayName: 'Ollama', status: 'online', description: 'Local Ollama provider' },
    { name: 'openai', displayName: 'OpenAI', status: 'offline', description: 'OpenAI provider' },
  ],
  getProviderModels: async (_provider?: string): Promise<ProviderModelResponse[]> => [
    { name: 'nomic-embed-text', displayName: 'Nomic Embed Text', provider: 'ollama', dimensions: 768 },
    { name: 'text-embedding-3-small', displayName: 'Text Embedding 3 Small', provider: 'openai', dimensions: 1536 },
  ],
  getCurrentProvider: async (): Promise<CurrentProviderResponse> => ({
    provider: 'ollama',
    configuration: { baseUrl: 'http://localhost:11434' },
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
    job_id: 1,
    directory_id: _id,
    message: 'Sync job started in background. Use job_id to check progress.',
  }),
  getSyncJobStatus: async (_directoryId: number, _jobId: number): Promise<SyncJobStatus> => ({
    id: _jobId,
    directory_id: _directoryId,
    status: 'completed',
    total_files: 5,
    processed_files: 5,
    created_files: 5,
    updated_files: 0,
    failed_files: 0,
    failed_file_paths: null,
    current_file: null,
    error_message: null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  getLatestSyncJob: async (_directoryId: number): Promise<SyncJobStatus | null> => ({
    id: 1,
    directory_id: _directoryId,
    status: 'completed',
    total_files: 5,
    processed_files: 5,
    created_files: 5,
    updated_files: 0,
    failed_files: 0,
    failed_file_paths: null,
    current_file: null,
    error_message: null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  cancelIncompleteSyncJobs: async (_directoryId: number): Promise<{ message: string }> => ({
    message: 'All incomplete sync jobs have been cancelled successfully',
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

  // Connection Management operations
  getConnections: async (): Promise<ConnectionsListResponse> => ({
    connections: Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      name: `Connection ${i + 1}`,
      type: i === 0 ? 'ollama' as const : 'openai-compatible' as const,
      baseUrl: i === 0 ? 'http://localhost:11434' : 'http://localhost:1234',
      defaultModel: i === 0 ? 'nomic-embed-text' : 'text-embedding-3-small',
      metadata: null,
      isActive: i === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    total: 2,
  }),

  getConnection: async (id: number): Promise<Connection> => ({
    id,
    name: `Connection ${id}`,
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'nomic-embed-text',
    metadata: null,
    isActive: id === 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  getActiveConnection: async (): Promise<Connection | null> => ({
    id: 1,
    name: 'Default Ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'nomic-embed-text',
    metadata: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  createConnection: async (data: CreateConnectionRequest): Promise<Connection> => ({
    id: Math.floor(Math.random() * 10000),
    name: data.name,
    type: data.type,
    baseUrl: data.baseUrl,
    defaultModel: data.defaultModel,
    metadata: data.metadata || null,
    isActive: data.isActive || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  updateConnection: async (id: number, data: UpdateConnectionRequest): Promise<Connection> => ({
    id,
    name: data.name || `Connection ${id}`,
    type: 'ollama',
    baseUrl: data.baseUrl || 'http://localhost:11434',
    defaultModel: data.defaultModel || 'nomic-embed-text',
    metadata: data.metadata || null,
    isActive: data.isActive || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  deleteConnection: async (_id: number): Promise<void> => {
    // Mock delete - no return value
  },

  activateConnection: async (_id: number): Promise<void> => {
    // Mock activate - no return value
  },

  testConnection: async (_data: ConnectionTestRequest): Promise<ConnectionTestResponse> => ({
    success: true,
    message: 'Connection test successful',
    models: ['nomic-embed-text', 'text-embedding-3-small'],
  }),

  // Provider Management operations
  getProvidersList: async (): Promise<ProvidersListResponse> => ({
    providers: Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? 'Local Ollama' : 'LM Studio',
      type: i === 0 ? 'ollama' as const : 'openai-compatible' as const,
      baseUrl: i === 0 ? 'http://localhost:11434' : 'http://localhost:1234',
      apiKey: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    total: 2,
  }),

  getProvider: async (id: number): Promise<Provider> => ({
    id,
    name: `Provider ${id}`,
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKey: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  createProvider: async (data: CreateProviderRequest): Promise<Provider> => ({
    id: Math.floor(Math.random() * 10000),
    name: data.name,
    type: data.type,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey || null,
    metadata: data.metadata || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  updateProvider: async (id: number, data: UpdateProviderRequest): Promise<Provider> => ({
    id,
    name: data.name || `Provider ${id}`,
    type: 'ollama',
    baseUrl: data.baseUrl || 'http://localhost:11434',
    apiKey: data.apiKey || null,
    metadata: data.metadata || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  deleteProvider: async (_id: number): Promise<void> => {
    // Mock delete - no return value
  },

  testProvider: async (_data: ProviderTestRequest): Promise<ProviderTestResponse> => ({
    success: true,
    message: 'Provider test successful',
    models: ['nomic-embed-text', 'text-embedding-3-small'],
  }),

  // Model Management operations
  getModelsList: async (providerId?: number): Promise<ModelsListResponse> => ({
    models: Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      providerId: providerId || 1,
      name: i === 0 ? 'nomic-embed-text' : i === 1 ? 'text-embedding-3-small' : 'text-embedding-3-large',
      displayName: i === 0 ? 'Nomic Embed Text' : i === 1 ? 'Text Embedding 3 Small' : 'Text Embedding 3 Large',
      modelType: 'embedding' as const,
      isActive: i === 0,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    total: 3,
  }),

  getModel: async (id: number): Promise<Model> => ({
    id,
    providerId: 1,
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    modelType: 'embedding' as const,
    isActive: id === 1,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  createModel: async (data: CreateModelRequest): Promise<Model> => ({
    id: Math.floor(Math.random() * 10000),
    providerId: data.providerId,
    name: data.name,
    displayName: data.displayName || null,
    modelType: data.modelType || 'embedding',
    isActive: data.isActive || false,
    metadata: data.metadata || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  updateModel: async (id: number, data: UpdateModelRequest): Promise<Model> => ({
    id,
    providerId: 1,
    name: data.name || 'nomic-embed-text',
    displayName: data.displayName || 'Nomic Embed Text',
    modelType: 'embedding' as const,
    isActive: false,
    metadata: data.metadata || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  deleteModel: async (_id: number): Promise<void> => {
    // Mock delete - no return value
  },

  activateModel: async (_id: number): Promise<void> => {
    // Mock activate - no return value
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