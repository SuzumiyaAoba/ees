import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type {
  CreateEmbeddingRequest,
  BatchCreateEmbeddingRequest,
  SearchEmbeddingRequest,
} from '@/types/api'

// Query keys for React Query
export const QUERY_KEYS = {
  embeddings: (params?: {
    page?: number
    limit?: number
    uri?: string
    model_name?: string
  }) => [
    'embeddings',
    params?.page,
    params?.limit,
    params?.uri,
    params?.model_name,
  ] as const,
  embedding: (uri: string) => ['embedding', uri],
  providers: () => ['providers'],
  providerModels: (provider?: string) => ['providerModels', provider],
  currentProvider: () => ['currentProvider'],
  search: (query: SearchEmbeddingRequest) => [
    'search',
    query.query,
    query.model_name,
    query.query_task_type,
    query.query_title,
    query.limit,
    query.threshold,
    query.metric,
  ] as const,
  distinctModels: () => ['embeddings', 'distinct-models'],
} as const

// Embedding list hook
export function useEmbeddings(params: {
  page?: number
  limit?: number
  uri?: string
  model_name?: string
} = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.embeddings(params),
    queryFn: () => apiClient.getEmbeddings(params),
  })
}

// Single embedding hook
export function useEmbedding(uri: string, modelName: string) {
  return useQuery({
    queryKey: QUERY_KEYS.embedding(uri),
    queryFn: () => apiClient.getEmbedding(uri, modelName),
    enabled: !!uri && !!modelName,
  })
}

// Create embedding hook
export function useCreateEmbedding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEmbeddingRequest) => apiClient.createEmbedding(data),
    onSuccess: () => {
      // Invalidate embeddings list to refresh
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// Batch create embeddings hook
export function useBatchCreateEmbeddings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BatchCreateEmbeddingRequest) => apiClient.createBatchEmbeddings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// File upload hook
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, modelName }: { file: File; modelName?: string }) =>
      apiClient.uploadFile(file, modelName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// Delete embedding hook
export function useDeleteEmbedding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteEmbedding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// Delete all embeddings hook
export function useDeleteAllEmbeddings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.deleteAllEmbeddings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// Update embedding hook
export function useUpdateEmbedding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { text: string; model_name?: string } }) =>
      apiClient.updateEmbedding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings'] })
    },
  })
}

// Search embeddings hook
export function useSearchEmbeddings(searchParams: SearchEmbeddingRequest) {
  return useQuery({
    queryKey: QUERY_KEYS.search(searchParams),
    queryFn: () => apiClient.searchEmbeddings(searchParams),
    enabled: !!searchParams.query.trim(),
  })
}

// Providers hook
export function useProviders() {
  return useQuery({
    queryKey: QUERY_KEYS.providers(),
    queryFn: async () => {
      const result = await apiClient.getProviders()
      return result.map((provider: any) => ({
        name: provider.name,
        displayName: provider.display_name,
        status: provider.status === 'active' ? 'online' : 'offline',
      }))
    },
  })
}

// Provider models hook
export function useProviderModels(provider?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.providerModels(provider),
    queryFn: async () => {
      const result = await apiClient.getProviderModels(provider)
      return result.map((model: any) => ({
        name: model.name,
        displayName: model.display_name,
        provider: provider || 'unknown',
        dimensions: model.dimensions,
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Ollama status hook
export function useOllamaStatus() {
  return useQuery({
    queryKey: ['ollama', 'status'],
    queryFn: async () => {
      const result = await apiClient.getOllamaStatus()
      return {
        status: result.status === 'running' ? 'online' : 'offline',
        version: result.version,
        models: result.models,
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Current provider hook
export function useCurrentProvider() {
  return useQuery({
    queryKey: QUERY_KEYS.currentProvider(),
    queryFn: async () => {
      const result = await apiClient.getCurrentProvider()
      return {
        provider: result.provider,
        configuration: result.configuration,
      }
    },
  })
}

// Models hook
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Distinct model names (from DB) for browse filter
export function useDistinctEmbeddingModels() {
  return useQuery({
    queryKey: QUERY_KEYS.distinctModels(),
    queryFn: () => apiClient.getDistinctEmbeddingModels(),
    staleTime: 60 * 1000,
  })
}