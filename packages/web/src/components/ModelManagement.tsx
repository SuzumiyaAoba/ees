import { useState } from 'react'
import { useProviders } from '@/hooks/useProviders'
import { useModels } from '@/hooks/useModels'
import { ModelFormModal } from './ModelFormModal'
import { Button } from '@/components/ui/Button'
import type { Model, CreateModelRequest } from '@/types/api'

export function ModelManagement() {
  const { providers } = useProviders()
  const [selectedProviderId, setSelectedProviderId] = useState<number | undefined>()
  const {
    models,
    loading,
    error,
    createModel,
    updateModel,
    deleteModel,
    activateModel,
  } = useModels(selectedProviderId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  const handleSubmit = async (data: CreateModelRequest) => {
    if (editingModel) {
      await updateModel(editingModel.id, {
        name: data.name,
        displayName: data.displayName,
      })
    } else {
      await createModel(data)
    }
    setIsModalOpen(false)
    setEditingModel(null)
  }

  const handleEdit = (model: Model) => {
    setEditingModel(model)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingModel(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingModel(null)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteModel(id)
      } catch (err) {
        console.error('Failed to delete model:', err)
      }
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await activateModel(id)
    } catch (err) {
      console.error('Failed to activate model:', err)
    }
  }

  const selectedProvider = providers.find(p => p.id === selectedProviderId)

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Models</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage models for each provider
          </p>
        </div>
        {selectedProvider && (
          <Button onClick={handleAdd}>
            Add Model
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Provider
        </label>
        <select
          value={selectedProviderId || ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : undefined
            setSelectedProviderId(id)
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Providers</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.type})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {loading && models.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            {selectedProvider
              ? `No models found for ${selectedProvider.name}. Add a model to get started.`
              : 'Select a provider to view and manage its models.'
            }
          </div>
        ) : (
          models.map((model) => {
            const provider = providers.find(p => p.id === model.providerId)
            return (
              <div
                key={model.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border ${model.isActive ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {model.displayName || model.name}
                      </h3>
                      {model.isActive && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {model.displayName && model.displayName !== model.name && (
                        <p><span className="font-medium">Model ID:</span> {model.name}</p>
                      )}
                      {provider && (
                        <p><span className="font-medium">Provider:</span> {provider.name}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created: {new Date(model.createdAt || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!model.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(model.id)}
                        className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(model)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(model.id)}
                      disabled={model.isActive}
                      title={model.isActive ? 'Cannot delete active model' : 'Delete model'}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <ModelFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        model={editingModel}
        providers={providers}
        loading={loading}
      />
    </div>
  )
}
