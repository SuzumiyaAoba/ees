import { useState } from 'react'
import { useProviders } from '@/hooks/useProviders'
import { ProviderFormModal } from './ProviderFormModal'
import { Button } from '@/components/ui/Button'
import type { Provider, CreateProviderRequest } from '@/types/api'

export function ProviderManagement() {
  const {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
  } = useProviders()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  const handleSubmit = async (data: CreateProviderRequest) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data)
    } else {
      await createProvider(data)
    }
    setIsModalOpen(false)
    setEditingProvider(null)
  }

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingProvider(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProvider(null)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      try {
        await deleteProvider(id)
      } catch (err) {
        console.error('Failed to delete provider:', err)
      }
    }
  }

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
          <h2 className="headline-medium">Providers</h2>
          <p className="mt-2 body-medium text-muted-foreground">
            Manage embedding provider configurations
          </p>
        </div>
        <Button onClick={handleAdd}>
          Add Provider
        </Button>
      </div>

      <div className="space-y-4">
        {loading && providers.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 body-large text-muted-foreground">
            No providers found. Add a provider to get started.
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-surface-variant rounded-xl p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="title-large">
                    {provider.name}
                  </h3>
                  <div className="mt-3 space-y-2 body-medium text-muted-foreground">
                    <p><span className="label-medium">Type:</span> {provider.type}</p>
                    <p><span className="label-medium">Base URL:</span> {provider.baseUrl}</p>
                    {provider.apiKey && (
                      <p><span className="label-medium">API Key:</span> ********</p>
                    )}
                    <p className="body-small">
                      Created: {new Date(provider.createdAt || '').toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(provider.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ProviderFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onTest={testProvider}
        provider={editingProvider}
        loading={loading}
      />
    </div>
  )
}
