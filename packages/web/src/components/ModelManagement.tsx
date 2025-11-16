import { useState } from 'react'
import { useConnections } from '@/hooks/useConnections'
import { useModels } from '@/hooks/useModels'
import { ModelFormModal } from './ModelFormModal'
import { Button } from '@/components/ui/Button'
import { FormSelect } from '@/components/ui/FormSelect'
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

  // Filter out 'default' model from display
  const filteredModels = models.filter(m => m.name !== 'default')

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container rounded-xl p-6">
        <p className="body-medium">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="section-content">
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
        <FormSelect
          label="Filter by Connection"
          value={selectedProviderId?.toString() || ''}
          onChange={(value) => {
            const id = value ? Number(value) : undefined
            setSelectedProviderId(id)
          }}
          options={[
            { value: '', label: 'All Connections' },
            ...connections.map((connection) => ({
              value: connection.id.toString(),
              label: `${connection.name} (${connection.type})`,
            }))
          ]}
        />
      </div>

      <div className="flex flex-col gap-cards">
        {loading && filteredModels.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">Loading models...</div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">
            {selectedConnection
              ? `No models found for ${selectedConnection.name}. Add a model to get started.`
              : 'Select a connection to view and manage its models.'
            }
          </div>
        ) : (
          filteredModels.map((model) => {
            const connection = connections.find(c => c.id === model.providerId)
            return (
              <div
                key={model.id}
                className={`rounded-xl p-6 ${model.isActive ? 'bg-primary-container' : 'bg-surface-variant'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-cards">
                      <h3 className="title-large">
                        {model.displayName || model.name}
                      </h3>
                      {model.isActive && (
                        <span className="px-3 py-1 bg-primary-container text-on-primary-container label-small rounded-lg">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-elements body-medium text-muted-foreground" style={{ marginTop: 'var(--spacing-3)' }}>
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
                  <div className="flex gap-cards">
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
