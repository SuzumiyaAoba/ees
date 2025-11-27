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
    modelType: 'embedding',
    isActive: false,
  })

  useEffect(() => {
    if (model) {
      setFormData({
        providerId: model.providerId,
        name: model.name,
        displayName: model.displayName || '',
        modelType: model.modelType,
        isActive: model.isActive,
      })
    } else {
      setFormData({
        providerId: providers[0]?.id || 0,
        name: '',
        displayName: '',
        modelType: 'embedding',
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
        <DialogContent className="flex flex-col gap-cards">
          <div>
            <label className="block label-large mb-3">
              Provider
            </label>
            <select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: Number(e.target.value) })}
              className="w-full h-14 px-4 py-3 border border-outline rounded-lg bg-surface body-large focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all disabled:opacity-50"
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
              <p className="body-small text-muted-foreground mt-2">
                Provider cannot be changed after creation
              </p>
            )}
          </div>

          <div>
            <label className="block label-large mb-3">
              Model Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-14 px-4 py-3 border border-outline rounded-lg bg-surface body-large focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
              placeholder="e.g., nomic-embed-text"
              required
            />
          </div>

          <div>
            <label className="block label-large mb-3">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full h-14 px-4 py-3 border border-outline rounded-lg bg-surface body-large focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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
                className="w-5 h-5 rounded border-outline focus:ring-2 focus:ring-primary/20"
              />
              <label htmlFor="isActive" className="ml-3 label-large">
                Set as active model
              </label>
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <div className="flex gap-elements w-full justify-end">
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
