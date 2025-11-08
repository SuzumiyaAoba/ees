import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/api'
import type {
  Model,
  CreateModelRequest,
  UpdateModelRequest,
} from '@/types/api'

export function useModels(providerId?: number) {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getModelsList(providerId)
      setModels(response.models)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models')
      console.error('Failed to fetch models:', err)
    } finally {
      setLoading(false)
    }
  }, [providerId])

  const createModel = useCallback(async (data: CreateModelRequest) => {
    try {
      setLoading(true)
      setError(null)
      const newModel = await apiClient.createModel(data)
      setModels(prev => [...prev, newModel])
      return newModel
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create model'
      setError(message)
      console.error('Failed to create model:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateModel = useCallback(async (id: number, data: UpdateModelRequest) => {
    try {
      setLoading(true)
      setError(null)
      const updatedModel = await apiClient.updateModel(id, data)
      setModels(prev => prev.map(m => m.id === id ? updatedModel : m))
      return updatedModel
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update model'
      setError(message)
      console.error('Failed to update model:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteModel = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.deleteModel(id)
      setModels(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete model'
      setError(message)
      console.error('Failed to delete model:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const activateModel = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      await apiClient.activateModel(id)
      // Update local state: deactivate all, activate selected
      setModels(prev => prev.map(m => ({ ...m, isActive: m.id === id })))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate model'
      setError(message)
      console.error('Failed to activate model:', err)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchModels()
  }, [fetchModels])

  return {
    models,
    loading,
    error,
    fetchModels,
    createModel,
    updateModel,
    deleteModel,
    activateModel,
  }
}
