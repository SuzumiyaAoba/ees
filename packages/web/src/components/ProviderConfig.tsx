import { useState } from 'react'
import { Settings, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormSelect } from '@/components/ui/FormSelect'
import { EmptyState } from '@/components/ui/EmptyState'
import { useProviderModels, useOllamaStatus } from '@/hooks/useEmbeddings'

export function ProviderConfig() {
  const [newModelName, setNewModelName] = useState('')
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useProviderModels()
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useOllamaStatus()

  const handleRefreshModels = () => {
    refetchModels()
    refetchStatus()
  }

  const handlePullModel = async () => {
    if (!newModelName.trim()) return

    try {
      // This would trigger a model pull operation
      console.log(`Pulling model: ${newModelName}`)
      setNewModelName('')
      // Refresh models after pull
      setTimeout(() => {
        refetchModels()
      }, 1000)
    } catch (error) {
      console.error('Error pulling model:', error)
    }
  }

  const formatModelSize = (size?: number) => {
    if (!size) return 'Unknown'
    const gb = size / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  const formatLastModified = (date?: string) => {
    if (!date) return 'Unknown'
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Ollama Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ollama Service Status
          </CardTitle>
          <CardDescription>
            Current status of the Ollama embedding service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              {statusLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Checking status...</span>
                </div>
              ) : status && status.status === 'online' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span className="font-medium">Service Online</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Version: {status.version || 'Unknown'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  <span className="font-medium">Service Offline</span>
                </div>
              )}
            </div>
            <Button onClick={() => refetchStatus()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Model Management */}
      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>
            Manage embedding models available in your Ollama instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Model */}
          <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10">
            <label className="text-sm font-semibold mb-2 block">Add New Model</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter model name (e.g., embeddinggemma:300m)"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePullModel()}
                className="flex-1"
              />
              <Button onClick={handlePullModel} disabled={!newModelName.trim()} variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Pull Model
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter the name of an embedding model to download from Ollama
            </p>
          </div>

          {/* Models List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Installed Models</h4>
              <Button onClick={() => handleRefreshModels()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading models...</span>
              </div>
            ) : models && (models as any).length > 0 ? (
              <div className="space-y-2">
                {(models as any).map((model: any) => (
                  <div
                    key={model.name}
                    className="border border-border rounded-lg p-4 flex items-center justify-between bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <h5 className="font-medium">{model.name}</h5>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Size: {formatModelSize(model.size)}</span>
                        <span>Modified: {formatLastModified(model.modified_at)}</span>
                        {model.digest && (
                          <span className="font-mono text-xs">
                            {model.digest.substring(0, 12)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Settings className="h-12 w-12" />}
                title="No models found"
                description="Pull a model using the form above"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>
            Configure default parameters for embedding operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Default Model"
              value=""
              onChange={() => {}}
              options={[
                { value: '', label: 'Select default model' },
                ...((models as any)?.map((model: any) => ({
                  value: model.name,
                  label: model.name,
                })) || []),
              ]}
            />
            <FormSelect
              label="Search Metric"
              value="cosine"
              onChange={() => {}}
              options={[
                { value: 'cosine', label: 'Cosine Similarity' },
                { value: 'euclidean', label: 'Euclidean Distance' },
                { value: 'dot_product', label: 'Dot Product' },
              ]}
            />
            <div>
              <label className="text-sm font-medium">Default Search Limit</label>
              <Input type="number" min="1" max="100" defaultValue="10" />
            </div>
            <div>
              <label className="text-sm font-medium">Default Threshold</label>
              <Input type="number" min="0" max="1" step="0.1" defaultValue="0.7" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}