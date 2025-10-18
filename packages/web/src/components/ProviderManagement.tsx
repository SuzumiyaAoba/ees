import { useState } from 'react'
import {
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Monitor,
  Database,
  Zap,
  Clock,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
  useProviders,
  useProviderModels,
  useOllamaStatus,
  useCurrentProvider,
} from '@/hooks/useEmbeddings'

interface ProviderStatusBadgeProps {
  status: 'online' | 'offline' | 'unknown'
  className?: string
}

function ProviderStatusBadge({ status, className = '' }: ProviderStatusBadgeProps) {
  const statusConfig = {
    online: {
      icon: CheckCircle,
      variant: 'success' as const,
      text: 'Online',
    },
    offline: {
      icon: XCircle,
      variant: 'destructive' as const,
      text: 'Offline',
    },
    unknown: {
      icon: AlertCircle,
      variant: 'warning' as const,
      text: 'Unknown',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  )
}

interface ModelCardProps {
  model: {
    name: string
    displayName?: string
    provider: string
    dimensions?: number
    maxTokens?: number
    size?: number
    modified_at?: string
    digest?: string
    pricePerToken?: number
  }
  onDelete?: () => void
}

function ModelCard({ model, onDelete }: ModelCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const formatSize = (size?: number) => {
    if (!size) return 'Unknown'
    const gb = size / (1024 * 1024 * 1024)
    return gb > 1 ? `${gb.toFixed(1)} GB` : `${(size / (1024 * 1024)).toFixed(0)} MB`
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Free'
    return `$${(price * 1000).toFixed(4)}/1K tokens`
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium truncate">{model.displayName || model.name}</h4>
              <Badge variant="secondary">
                {model.provider}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Dimensions:</span> {model.dimensions || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Max Tokens:</span> {model.maxTokens || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Size:</span> {formatSize(model.size)}
              </div>
              <div>
                <span className="font-medium">Price:</span> {formatPrice(model.pricePerToken)}
              </div>
            </div>

            {showDetails && (
              <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                <div>
                  <span className="font-medium">Full Name:</span> {model.name}
                </div>
                {model.modified_at && (
                  <div>
                    <span className="font-medium">Modified:</span>{' '}
                    {new Date(model.modified_at).toLocaleString()}
                  </div>
                )}
                {model.digest && (
                  <div>
                    <span className="font-medium">Digest:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {model.digest.substring(0, 16)}...
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProviderManagement() {
  const [selectedProvider, setSelectedProvider] = useState<string>('ollama')
  const [newModelName, setNewModelName] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useProviders()
  const { data: currentProvider, refetch: refetchCurrentProvider } = useCurrentProvider()
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useProviderModels(selectedProvider)
  const { data: ollamaStatus, isLoading: ollamaLoading, refetch: refetchOllamaStatus } = useOllamaStatus()

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchProviders(),
        refetchCurrentProvider(),
        refetchModels(),
        refetchOllamaStatus(),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  const handlePullModel = async () => {
    if (!newModelName.trim()) return

    try {
      console.log(`Pulling model: ${newModelName}`)
      setNewModelName('')
      setTimeout(() => {
        refetchModels()
        refetchOllamaStatus()
      }, 1000)
    } catch (error) {
      console.error('Error pulling model:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with global refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Management</h1>
          <p className="text-muted-foreground">
            Manage embedding providers, models, and configurations
          </p>
        </div>
        <Button
          onClick={handleRefreshAll}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Providers Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Provider Overview
          </CardTitle>
          <CardDescription>Ollama provider status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {providersLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading providers...</span>
            </div>
          ) : providers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <Card
                  key={provider.name}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProvider === provider.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedProvider(provider.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{provider.displayName || provider.name}</h3>
                      <ProviderStatusBadge status={provider.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {provider.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{provider.version || 'Unknown version'}</span>
                      {provider.modelCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {provider.modelCount} models
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No providers available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Provider Configuration */}
      {currentProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Provider Configuration
            </CardTitle>
            <CardDescription>
              Active provider settings and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Active Provider: {currentProvider.provider}</span>
                {currentProvider.configuration && (
                  <div className="space-y-2 text-sm mt-2">
                    {Object.entries(currentProvider.configuration).map(([key, value]) => (
                      <div key={key}>
                        <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                        <div className="font-mono text-foreground mt-0.5 break-all">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Ollama Service Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Ollama Service Monitoring
          </CardTitle>
          <CardDescription>
            Real-time status and metrics for Ollama service
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ollamaLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Checking Ollama status...</span>
            </div>
          ) : ollamaStatus?.status === 'online' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Service Online</span>
                </div>
                <Button onClick={() => refetchOllamaStatus()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  Check Status
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Version</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{ollamaStatus.version || 'Unknown'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Available Models</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{ollamaStatus.models?.length || 0}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Last Check</span>
                    </div>
                    <p className="text-lg font-bold mt-1">Just now</p>
                  </CardContent>
                </Card>
              </div>

              {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Available Models</h4>
                  <div className="flex flex-wrap gap-2">
                    {ollamaStatus.models.map((modelName) => (
                      <Badge key={modelName} variant="secondary">
                        {modelName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-600">Service Offline</span>
              </div>
              <Button onClick={() => refetchOllamaStatus()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Model Management
          </CardTitle>
          <CardDescription>View and manage Ollama models</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Pull Interface */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-medium mb-3">Add New Model</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter model name (e.g., nomic-embed-text)"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePullModel()}
                className="flex-1"
              />
              <Button onClick={handlePullModel} disabled={!newModelName.trim()}>
                <Plus className="h-4 w-4" />
                Pull Model
              </Button>
            </div>
          </div>

          {/* Provider Filter */}
          {providers && providers.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter by provider:</label>
              <select
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Models Grid */}
          {modelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading models...</span>
            </div>
          ) : models && models.length > 0 ? (
            <div className="space-y-3">
              {models.map((model) => (
                <ModelCard
                  key={`${model.provider}-${model.name}`}
                  model={model}
                  onDelete={() => console.log('Delete model:', model.name)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No models available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}