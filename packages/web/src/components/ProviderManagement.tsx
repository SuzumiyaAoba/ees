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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Providers</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage embedding provider configurations
          </p>
        </div>
        <Button onClick={handleAdd}>
          Add Provider
        </Button>
      </div>

      <div className="space-y-4">
        {loading && providers.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No providers found. Add a provider to get started.
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {provider.name}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-medium">Type:</span> {provider.type}</p>
                    <p><span className="font-medium">Base URL:</span> {provider.baseUrl}</p>
                    {provider.apiKey && (
                      <p><span className="font-medium">API Key:</span> ********</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Created: {new Date(provider.createdAt || '').toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
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
