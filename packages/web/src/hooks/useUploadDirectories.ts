import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type {
  CreateUploadDirectoryRequest,
  UpdateUploadDirectoryRequest,
} from '@/types/api'

export const QUERY_KEYS = {
  uploadDirectories: ['upload-directories'] as const,
  uploadDirectory: (id: number) => ['upload-directories', id] as const,
}

/**
 * Fetch all upload directories
 */
export function useUploadDirectories() {
  return useQuery({
    queryKey: QUERY_KEYS.uploadDirectories,
    queryFn: () => apiClient.getUploadDirectories(),
  })
}

/**
 * Fetch a single upload directory by ID
 */
export function useUploadDirectory(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.uploadDirectory(id),
    queryFn: () => apiClient.getUploadDirectory(id),
    enabled: id > 0,
  })
}

/**
 * Create a new upload directory
 */
export function useCreateUploadDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUploadDirectoryRequest) =>
      apiClient.createUploadDirectory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectories })
    },
  })
}

/**
 * Update an upload directory
 */
export function useUpdateUploadDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUploadDirectoryRequest }) =>
      apiClient.updateUploadDirectory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectories })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectory(variables.id) })
    },
  })
}

/**
 * Delete an upload directory
 */
export function useDeleteUploadDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteUploadDirectory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectories })
    },
  })
}

/**
 * Sync an upload directory
 */
export function useSyncUploadDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.syncUploadDirectory(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectories })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.uploadDirectory(id) })
    },
  })
}
