import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type {
  Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionTestRequest,
  ConnectionTestResponse,
  ConnectionsListResponse,
} from '@/types/api'

/**
 * Hook for fetching all connections
 */
export function useConnections() {
  return useQuery<ConnectionsListResponse, Error>({
    queryKey: ['connections'],
    queryFn: () => apiClient.getConnections(),
  })
}

/**
 * Hook for fetching a single connection by ID
 */
export function useConnection(id: number | null) {
  return useQuery<Connection, Error>({
    queryKey: ['connections', id],
    queryFn: () => apiClient.getConnection(id!),
    enabled: id !== null,
  })
}

/**
 * Hook for fetching the active connection
 */
export function useActiveConnection() {
  return useQuery<Connection | null, Error>({
    queryKey: ['connections', 'active'],
    queryFn: () => apiClient.getActiveConnection(),
  })
}

/**
 * Hook for creating a new connection
 */
export function useCreateConnection() {
  const queryClient = useQueryClient()

  return useMutation<Connection, Error, CreateConnectionRequest>({
    mutationFn: (data) => apiClient.createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

/**
 * Hook for updating a connection
 */
export function useUpdateConnection() {
  const queryClient = useQueryClient()

  return useMutation<Connection, Error, { id: number; data: UpdateConnectionRequest }>({
    mutationFn: ({ id, data }) => apiClient.updateConnection(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['connections', 'active'] })
    },
  })
}

/**
 * Hook for deleting a connection
 */
export function useDeleteConnection() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: (id) => apiClient.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', 'active'] })
    },
  })
}

/**
 * Hook for activating a connection
 */
export function useActivateConnection() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: (id) => apiClient.activateConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', 'active'] })
    },
  })
}

/**
 * Hook for testing a connection
 */
export function useTestConnection() {
  return useMutation<ConnectionTestResponse, Error, ConnectionTestRequest>({
    mutationFn: (data) => apiClient.testConnection(data),
  })
}
