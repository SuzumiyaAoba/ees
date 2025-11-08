import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/api'
import type {
  Provider,
  CreateProviderRequest,
  UpdateProviderRequest,
  ProviderTestRequest,
  ProviderTestResponse,
} from '@/types/api'

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getProvidersList()
      setProviders(response.providers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
      console.error('Failed to fetch providers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProvider = useCallback(async (data: CreateProviderRequest) => {
    try {
      setLoading(true)
      setError(null)
      const newProvider = await apiClient.createProvider(data)
      setProviders(prev => [...prev, newProvider])
      return newProvider
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create provider'
      setError(message)
      console.error('Failed to create provider:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProvider = useCallback(async (id: number, data: UpdateProviderRequest) => {
    try {
      setLoading(true)
      setError(null)
      const updatedProvider = await apiClient.updateProvider(id, data)
      setProviders(prev => prev.map(p => p.id === id ? updatedProvider : p))
      return updatedProvider
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update provider'
      setError(message)
      console.error('Failed to update provider:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteProvider = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteProvider(id)
      setProviders(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete provider'
      setError(message)
      console.error('Failed to delete provider:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const testProvider = useCallback(async (data: ProviderTestRequest): Promise<ProviderTestResponse> => {
    try {
      setLoading(true)
      setError(null)
      return await apiClient.testProvider(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test provider'
      setError(message)
      console.error('Failed to test provider:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProviders()
  }, [fetchProviders])

  return {
    providers,
    loading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
  }
}
