import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import type { Provider, CreateProviderRequest, ProviderTestResponse } from '@/types/api'

interface ProviderFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateProviderRequest) => Promise<void>
  onTest: (data: CreateProviderRequest & { id?: number }) => Promise<ProviderTestResponse>
  provider?: Provider | null
  loading?: boolean
}

export function ProviderFormModal({
  open,
  onClose,
  onSubmit,
  onTest,
  provider,
  loading = false,
}: ProviderFormModalProps) {
  const [formData, setFormData] = useState<CreateProviderRequest>({
    name: '',
    type: 'ollama',
    baseUrl: '',
    apiKey: '',
  })
  const [testResult, setTestResult] = useState<ProviderTestResponse | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey || '',
      })
    } else {
      setFormData({
        name: '',
        type: 'ollama',
        baseUrl: '',
        apiKey: '',
      })
    }
    setTestResult(null)
  }, [provider, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await onTest({
        id: provider?.id,
        ...formData,
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="w-full max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{provider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provider Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Local Ollama"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provider Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ollama' | 'openai-compatible' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="ollama">Ollama</option>
              <option value="openai-compatible">OpenAI Compatible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base URL
            </label>
            <input
              type="url"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="http://localhost:11434"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key (optional)
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Leave empty for local services"
            />
          </div>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <p>{testResult.message}</p>
                {testResult.models && testResult.models.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Available models:</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {testResult.models.map((model) => (
                        <li key={model}>{model}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <div className="flex-1" />
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
              {provider ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
