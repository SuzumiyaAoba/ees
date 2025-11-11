import { useState } from 'react'
import { useConnections } from '@/hooks/useConnections'
import { useModels } from '@/hooks/useModels'
import { ModelFormModal } from './ModelFormModal'
import { Button } from '@/components/ui/Button'
import type { Model, CreateModelRequest } from '@/types/api'

export function ModelManagement() {
  const { data: connectionsData } = useConnections()
  const connections = connectionsData?.connections || []
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

  const selectedConnection = connections.find(c => c.id === selectedProviderId)

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container rounded-xl p-6">
        <p className="body-medium">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="headline-medium">Models</h2>
          <p className="mt-2 body-medium text-muted-foreground">
            Manage models for each connection
          </p>
        </div>
        {selectedConnection && (
          <Button onClick={handleAdd}>
            Add Model
          </Button>
        )}
      </div>

      <div className="bg-surface-variant rounded-xl p-6">
        <label className="block label-large mb-3">
          Filter by Connection
        </label>
        <select
          value={selectedProviderId || ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : undefined
            setSelectedProviderId(id)
          }}
          className="w-full h-14 px-4 py-3 border border-outline rounded-lg bg-surface body-large focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
        >
          <option value="">All Connections</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name} ({connection.type})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {loading && models.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">
            {selectedConnection
              ? `No models found for ${selectedConnection.name}. Add a model to get started.`
              : 'Select a connection to view and manage its models.'
            }
          </div>
        ) : (
          models.map((model) => {
            const connection = connections.find(c => c.id === model.providerId)
            return (
              <div
                key={model.id}
                className={`rounded-xl p-6 ${model.isActive ? 'bg-primary-container' : 'bg-surface-variant'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="title-large">
                        {model.displayName || model.name}
                      </h3>
                      {model.isActive && (
                        <span className="px-3 py-1 bg-primary-container text-on-primary-container label-small rounded-lg">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-2 body-medium text-muted-foreground">
                      {model.displayName && model.displayName !== model.name && (
                        <p><span className="label-medium">Model ID:</span> {model.name}</p>
                      )}
                      {connection && (
                        <p><span className="label-medium">Connection:</span> {connection.name}</p>
                      )}
                      <p className="body-small">
                        Created: {new Date(model.createdAt || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!model.isActive && (
                      <Button
                        variant="filled-tonal"
                        size="sm"
                        onClick={() => handleActivate(model.id)}
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
        providers={connections}
        loading={loading}
      />
    </div>
  )
}
