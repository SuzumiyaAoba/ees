import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { Model, CreateModelRequest, Provider } from '@/types/api'

interface ModelFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateModelRequest) => Promise<void>
  model?: Model | null
  providers: Provider[]
  loading?: boolean
}

export function ModelFormModal({
  open,
  onClose,
  onSubmit,
  model,
  providers,
  loading = false,
}: ModelFormModalProps) {
  const [formData, setFormData] = useState<CreateModelRequest>({
    providerId: providers[0]?.id || 0,
    name: '',
    displayName: '',
    isActive: false,
  })

  useEffect(() => {
    if (model) {
      setFormData({
        providerId: model.providerId,
        name: model.name,
        displayName: model.displayName || '',
        isActive: model.isActive,
      })
    } else {
      setFormData({
        providerId: providers[0]?.id || 0,
        name: '',
        displayName: '',
        isActive: false,
      })
    }
  }, [model, providers, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="w-full max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{model ? 'Edit Model' : 'Add Model'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provider
            </label>
            <select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={!!model}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </option>
              ))}
            </select>
            {model && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provider cannot be changed after creation
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., nomic-embed-text"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Nomic Embed Text"
            />
          </div>

          {!model && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as active model
              </label>
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {model ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
