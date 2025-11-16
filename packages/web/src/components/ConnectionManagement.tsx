import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  Server,
  RefreshCw,
  Zap,
  AlertCircle,
  FileSearch,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { FormSelect } from '@/components/ui/FormSelect'
import {
  useConnections,
  useActiveConnection,
  useCreateConnection,
  useUpdateConnection,
  useDeleteConnection,
  useActivateConnection,
  useTestConnection,
} from '@/hooks/useConnections'
import { useModels } from '@/hooks/useModels'
import type { Connection, CreateConnectionRequest, UpdateConnectionRequest, CreateModelRequest } from '@/types/api'
import { apiClient } from '@/services/api'

interface ConnectionFormData {
  name: string
  type: 'ollama' | 'openai-compatible'
  baseUrl: string
  apiKey: string
}

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ConnectionFormData) => void
  initialData?: Connection
  title: string
}

function ConnectionModal({ isOpen, onClose, onSave, initialData, title }: ConnectionModalProps) {
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    type: 'ollama',
    baseUrl: '',
    apiKey: '',
  })

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        type: initialData?.type || 'ollama',
        baseUrl: initialData?.baseUrl || '',
        apiKey: '',
      })
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card variant="elevated" className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Configure your embedding provider connection</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-cards">
            <div>
              <label className="text-sm font-medium">Provider Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Local Ollama"
                required
              />
            </div>

            <FormSelect
              label="Provider Type"
              value={formData.type}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as 'ollama' | 'openai-compatible',
                })
              }
              options={[
                { value: 'ollama', label: 'Ollama' },
                { value: 'openai-compatible', label: 'OpenAI-Compatible' },
              ]}
            />

            <div>
              <label className="text-sm font-medium">Base URL</label>
              <Input
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="http://localhost:11434"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">API Key (Optional)</label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Leave blank if not required"
              />
            </div>

            <div className="flex justify-end gap-elements">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface DiscoverModelsModalProps {
  isOpen: boolean
  onClose: () => void
  connection: Connection
  availableModels: string[]
  onRegisterModels: (selectedModels: string[]) => void
  loading?: boolean
}

function DiscoverModelsModal({
  isOpen,
  onClose,
  connection,
  availableModels,
  onRegisterModels,
  loading = false,
}: DiscoverModelsModalProps) {
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())

  const toggleModel = (modelName: string) => {
    const newSelection = new Set(selectedModels)
    if (newSelection.has(modelName)) {
      newSelection.delete(modelName)
    } else {
      newSelection.add(modelName)
    }
    setSelectedModels(newSelection)
  }

  const handleRegister = () => {
    onRegisterModels(Array.from(selectedModels))
    setSelectedModels(new Set())
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="w-full max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Discover Models from {connection.name}</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <div className="flex flex-col gap-cards">
          <p className="text-sm text-muted-foreground">
            Select models to register from this connection. Registered models can be used throughout the application.
          </p>

          {availableModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No models available from this connection
            </div>
          ) : (
            <div className="flex flex-col gap-elements max-h-96 overflow-y-auto">
              {availableModels.map((modelName) => (
                <div
                  key={modelName}
                  className="flex items-center gap-cards border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  style={{ padding: 'var(--spacing-3)' }}
                  onClick={() => toggleModel(modelName)}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(modelName)}
                    onChange={() => toggleModel(modelName)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{modelName}</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.type} model
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleRegister}
          disabled={selectedModels.size === 0 || loading}
        >
          Register {selectedModels.size > 0 ? `${selectedModels.size} Model${selectedModels.size > 1 ? 's' : ''}` : 'Models'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

interface ConnectionCardProps {
  connection: Connection
  isActive: boolean
  onEdit: (connection: Connection) => void
  onDelete: (id: number) => void
  onActivate: (id: number) => void
  onTest: (id: number) => void
  onDiscoverModels: (connection: Connection) => void
}

function ConnectionCard({
  connection,
  isActive,
  onEdit,
  onDelete,
  onActivate,
  onTest,
  onDiscoverModels,
}: ConnectionCardProps) {
  return (
    <Card className={`transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-elements flex-wrap" style={{ marginBottom: 'var(--spacing-2)' }}>
              <h4 className="font-medium truncate">
                {connection.name}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({connection.type})
                </span>
              </h4>
              {isActive && (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-elements text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Base URL:</span> {connection.baseUrl}
              </div>
              {connection.createdAt && (
                <div className="text-xs">
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(connection.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-elements" style={{ marginLeft: 'var(--spacing-4)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDiscoverModels(connection)}
              title="Discover and register models"
            >
              <FileSearch className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onTest(connection.id)}>
              <Zap className="h-4 w-4" />
            </Button>
            {!isActive && (
              <Button variant="ghost" size="sm" onClick={() => onActivate(connection.id)}>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(connection)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(connection.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectionManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    models?: string[]
  } | null>(null)
  const [discoverModelsModal, setDiscoverModelsModal] = useState<{
    isOpen: boolean
    connection: Connection | null
    models: string[]
  }>({
    isOpen: false,
    connection: null,
    models: [],
  })
  const [registeringModels, setRegisteringModels] = useState(false)

  const { data: connectionsData, isLoading, refetch } = useConnections()
  const { data: activeConnection } = useActiveConnection()
  const createMutation = useCreateConnection()
  const updateMutation = useUpdateConnection()
  const deleteMutation = useDeleteConnection()
  const activateMutation = useActivateConnection()
  const testMutation = useTestConnection()
  const { fetchModels: refetchModels } = useModels()

  const handleOpenAddModal = () => {
    setEditingConnection(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (connection: Connection) => {
    setEditingConnection(connection)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingConnection(null)
  }

  const handleSave = async (data: ConnectionFormData) => {
    try {
      if (editingConnection) {
        // Update existing connection
        const updateData: UpdateConnectionRequest = {
          name: data.name,
          baseUrl: data.baseUrl,
        }
        if (data.apiKey) {
          updateData.apiKey = data.apiKey
        }
        await updateMutation.mutateAsync({ id: editingConnection.id, data: updateData })
      } else {
        // Create new connection
        // Note: defaultModel is required by the API but we provide a default value
        // since model management is handled separately
        const createData: CreateConnectionRequest = {
          name: data.name,
          type: data.type,
          baseUrl: data.baseUrl,
          defaultModel: 'default', // Placeholder value - model will be set separately
        }
        if (data.apiKey) {
          createData.apiKey = data.apiKey
        }
        await createMutation.mutateAsync(createData)
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving connection:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting connection:', error)
      }
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error activating connection:', error)
    }
  }

  const handleTest = async (id: number) => {
    try {
      setTestResult(null)
      const result = await testMutation.mutateAsync({ id })
      setTestResult(result)
    } catch (error) {
      console.error('Error testing connection:', error)
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      })
    }
  }

  const handleDiscoverModels = async (connection: Connection) => {
    try {
      const result = await testMutation.mutateAsync({ id: connection.id })

      if (result.success && result.models && result.models.length > 0) {
        setDiscoverModelsModal({
          isOpen: true,
          connection,
          models: result.models,
        })
      } else {
        alert('No models found for this connection')
      }
    } catch (error) {
      console.error('Error discovering models:', error)
      alert(error instanceof Error ? error.message : 'Failed to discover models')
    }
  }

  const handleRegisterModels = async (selectedModels: string[]) => {
    if (!discoverModelsModal.connection) return

    try {
      setRegisteringModels(true)
      const connection = discoverModelsModal.connection

      // Register each selected model
      for (const modelName of selectedModels) {
        const createModelData: CreateModelRequest = {
          providerId: connection.id,
          name: modelName,
          displayName: modelName, // Can be customized later
          isActive: false,
        }
        await apiClient.createModel(createModelData)
      }

      // Refresh models list
      void refetchModels()

      // Close modal
      setDiscoverModelsModal({
        isOpen: false,
        connection: null,
        models: [],
      })

      alert(`Successfully registered ${selectedModels.length} model(s)`)
    } catch (error) {
      console.error('Error registering models:', error)
      alert(error instanceof Error ? error.message : 'Failed to register models')
    } finally {
      setRegisteringModels(false)
    }
  }

  const handleCloseDiscoverModal = () => {
    setDiscoverModelsModal({
      isOpen: false,
      connection: null,
      models: [],
    })
  }

  const connections = connectionsData?.connections || []

  return (
    <div className="section-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connection Management</h1>
          <p className="text-muted-foreground">
            Manage embedding provider connections
          </p>
        </div>
        <div className="flex gap-elements">
          <Button onClick={() => refetch()} variant="outline" className="gap-elements">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleOpenAddModal} className="gap-elements">
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Active Connection Alert */}
      {activeConnection && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">
              Active: {activeConnection.name}
              <span className="font-normal text-muted-foreground ml-2">
                ({activeConnection.type})
              </span>
            </div>
            <div className="flex flex-col text-sm" style={{ gap: 'var(--spacing-1)', marginTop: 'var(--spacing-2)' }}>
              <div>
                <span className="text-muted-foreground">Base URL:</span>{' '}
                <span className="font-mono">{activeConnection.baseUrl}</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Result Alert */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <span className="font-medium">{testResult.message}</span>
            {testResult.success && testResult.models && testResult.models.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Available models: {testResult.models.length}
                </p>
                <div className="flex flex-wrap gap-elements" style={{ marginTop: 'var(--spacing-2)' }}>
                  {testResult.models.slice(0, 5).map((model) => (
                    <Badge key={model} variant="secondary">
                      {model}
                    </Badge>
                  ))}
                  {testResult.models.length > 5 && (
                    <Badge variant="secondary">+{testResult.models.length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-elements">
            <Server className="h-5 w-5" />
            Connections
          </CardTitle>
          <CardDescription>
            {connections.length === 0
              ? 'No connections configured'
              : `${connections.length} connection${connections.length === 1 ? '' : 's'} configured`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading connections...</span>
            </div>
          ) : connections.length > 0 ? (
            <div className="flex flex-col gap-cards">
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  isActive={activeConnection?.id === connection.id}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  onTest={handleTest}
                  onDiscoverModels={handleDiscoverModels}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No connections configured</p>
              <Button onClick={handleOpenAddModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Connection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={editingConnection || undefined}
        title={editingConnection ? 'Edit Connection' : 'Add New Connection'}
      />

      {/* Discover Models Modal */}
      {discoverModelsModal.connection && (
        <DiscoverModelsModal
          isOpen={discoverModelsModal.isOpen}
          onClose={handleCloseDiscoverModal}
          connection={discoverModelsModal.connection}
          availableModels={discoverModelsModal.models}
          onRegisterModels={handleRegisterModels}
          loading={registeringModels}
        />
      )}
    </div>
  )
}
