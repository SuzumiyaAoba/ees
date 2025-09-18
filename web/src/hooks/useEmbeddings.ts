import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type {
  CreateEmbeddingRequest,
  BatchCreateEmbeddingRequest,
  SearchEmbeddingRequest,
} from '@/types/api'

// Query keys for React Query
export const QUERY_KEYS = {
  embeddings: (params?: Record<string, unknown>) => ['embeddings', params],
  embedding: (uri: string) => ['embedding', uri],
  providers: () => ['providers'],
  providerModels: (provider?: string) => ['providerModels', provider],
  currentProvider: () => ['currentProvider'],
  search: (query: SearchEmbeddingRequest) => ['search', query],
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
export function useEmbedding(uri: string) {
  return useQuery({
    queryKey: QUERY_KEYS.embedding(uri),
    queryFn: () => apiClient.getEmbedding(uri),
    enabled: !!uri,
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
    queryFn: () => apiClient.getProviders(),
  })
}

// Provider models hook
export function useProviderModels(provider?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.providerModels(provider),
    queryFn: () => apiClient.getProviderModels(provider),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Ollama status hook
export function useOllamaStatus() {
  return useQuery({
    queryKey: ['ollama', 'status'],
    queryFn: () => apiClient.getOllamaStatus(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Current provider hook
export function useCurrentProvider() {
  return useQuery({
    queryKey: QUERY_KEYS.currentProvider(),
    queryFn: () => apiClient.getCurrentProvider(),
  })
}