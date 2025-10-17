import React, { useState } from 'react'
import { FolderOpen, FolderPlus, RefreshCw, Trash2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { DirectoryPickerModal } from '@/components/DirectoryPickerModal'
import {
  useUploadDirectories,
  useCreateUploadDirectory,
  useDeleteUploadDirectory,
  useSyncUploadDirectory,
} from '@/hooks/useUploadDirectories'
import { useProviderModels } from '@/hooks/useEmbeddings'
import type { UploadDirectory } from '@/types/api'

export function UploadDirectoryManagement() {
  const { data: directories, isLoading, error } = useUploadDirectories()
  const { data: models } = useProviderModels()
  const createMutation = useCreateUploadDirectory()
  const deleteMutation = useDeleteUploadDirectory()
  const syncMutation = useSyncUploadDirectory()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    model_name: '',
    description: '',
  })
  const [syncingDirectories, setSyncingDirectories] = useState<Set<number>>(new Set())
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)
  const [syncProgress, setSyncProgress] = useState<Record<number, {
    current: number
    total: number
    file: string
    created: number
    updated: number
    failed: number
  }>>({})
  const [lastSyncResult, setLastSyncResult] = useState<{
    directory_id: number
    files_processed: number
    files_created: number
    files_updated: number
    files_failed: number
    files: string[]
    message: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        path: formData.path,
        model_name: formData.model_name || undefined,
        description: formData.description || undefined,
      })

      // Reset form and hide
      setFormData({ name: '', path: '', model_name: '', description: '' })
      setShowCreateForm(false)
    } catch (error) {
      // Error is handled by mutation
      console.error('Failed to create directory:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this directory registration?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete directory:', error)
      }
    }
  }

  const handleSync = async (id: number) => {
    setSyncingDirectories(prev => new Set(prev).add(id))
    setLastSyncResult(null)

    // Initialize progress
    setSyncProgress(prev => ({
      ...prev,
      [id]: {
        current: 0,
        total: 0,
        file: '',
        created: 0,
        updated: 0,
        failed: 0
      }
    }))

    return new Promise<void>((resolve, reject) => {
      try {
        // Use Server-Sent Events for real-time progress
        const eventSource = new EventSource(`http://localhost:3000/upload-directories/${id}/sync/stream`)

        eventSource.addEventListener('progress', (event) => {
          const data = JSON.parse(event.data)

          if (data.type === 'collected') {
            setSyncProgress(prev => ({
              ...prev,
              [id]: {
                ...prev[id],
                total: data.total_files
              }
            }))
          } else if (data.type === 'processing' || data.type === 'file_completed' || data.type === 'file_failed') {
            setSyncProgress(prev => ({
              ...prev,
              [id]: {
                current: data.current,
                total: data.total,
                file: data.file,
                created: data.created,
                updated: data.updated,
                failed: data.failed
              }
            }))
          } else if (data.type === 'completed') {
            setLastSyncResult({
              directory_id: data.directory_id,
              files_processed: data.files_processed,
              files_created: data.files_created,
              files_updated: data.files_updated,
              files_failed: data.files_failed,
              files: [],
              message: data.message
            })
            eventSource.close()

            // Clean up
            setSyncingDirectories(prev => {
              const newSet = new Set(prev)
              newSet.delete(id)
              return newSet
            })
            setSyncProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[id]
              return newProgress
            })

            resolve()
          }
        })

        eventSource.addEventListener('error', (event) => {
          console.error('SSE error:', event)
          eventSource.close()

          setSyncingDirectories(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
          setSyncProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[id]
            return newProgress
          })

          reject(new Error('SSE connection failed'))
        })

        eventSource.onerror = () => {
          eventSource.close()

          setSyncingDirectories(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
          setSyncProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[id]
            return newProgress
          })

          reject(new Error('SSE connection error'))
        }
      } catch (error) {
        console.error('Failed to sync directory:', error)
        setSyncingDirectories(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        setSyncProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[id]
          return newProgress
        })
        reject(error)
      }
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load upload directories: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Upload Directory Management
              </CardTitle>
              <CardDescription>
                Register directories for one-click document synchronization. Supports .eesignore for filtering files.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Register Directory
            </Button>
          </div>
        </CardHeader>

        {/* Create Form */}
        {showCreateForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <div>
                <label className="text-sm font-medium">Directory Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Documents"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A user-friendly name for this directory
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Directory Path</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/Users/username/Documents"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDirectoryPicker(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Absolute path to the directory. Place a .eesignore file in the directory root to filter files (like .gitignore).
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Embedding Model</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                >
                  <option value="">Use default model (nomic-embed-text)</option>
                  {models?.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project documentation and guides"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ name: '', path: '', model_name: '', description: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Directory'}
                </Button>
              </div>

              {createMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <p>{createMutation.error.message}</p>
                </div>
              )}
            </form>
          </CardContent>
        )}
      </Card>

      {/* Directory List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Directories</CardTitle>
          <CardDescription>
            {directories?.count === 0
              ? 'No directories registered yet'
              : `${directories?.count} director${directories?.count === 1 ? 'y' : 'ies'} registered`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {directories?.directories && directories.directories.length > 0 ? (
            <div className="space-y-4">
              {directories.directories.map((directory: UploadDirectory) => (
                <div
                  key={directory.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">{directory.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {directory.path}
                      </p>
                      {directory.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {directory.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSync(directory.id)}
                        disabled={syncingDirectories.has(directory.id) || syncMutation.isPending}
                      >
                        {syncingDirectories.has(directory.id) ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(directory.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress indicator during sync */}
                  {syncingDirectories.has(directory.id) && syncProgress[directory.id] && (
                    <div className="border-t pt-3 space-y-2 bg-blue-50 -mx-4 -mb-3 px-4 pb-3 rounded-b-lg">
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-blue-700 font-medium flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                          Processing files...
                        </span>
                        <span className="text-blue-700 font-semibold">
                          {syncProgress[directory.id].current} / {syncProgress[directory.id].total}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-blue-600">
                          <span className="font-medium truncate" title={syncProgress[directory.id].file}>
                            {syncProgress[directory.id].file || 'Collecting files...'}
                          </span>
                          <span className="font-medium ml-2">
                            {syncProgress[directory.id].total > 0
                              ? `${Math.round((syncProgress[directory.id].current / syncProgress[directory.id].total) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300 ease-out"
                            style={{
                              width: syncProgress[directory.id].total > 0
                                ? `${(syncProgress[directory.id].current / syncProgress[directory.id].total) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-blue-600">
                        <span>Created: <span className="font-semibold">{syncProgress[directory.id].created}</span></span>
                        <span>Updated: <span className="font-semibold">{syncProgress[directory.id].updated}</span></span>
                        <span>Failed: <span className="font-semibold text-red-600">{syncProgress[directory.id].failed}</span></span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
                    <div>
                      <span className="font-medium">Model:</span> {directory.model_name}
                    </div>
                    <div>
                      <span className="font-medium">Last Synced:</span> {formatDate(directory.last_synced_at)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(directory.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No directories registered yet.</p>
              <p className="text-sm">Click "Register Directory" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Success Message */}
      {lastSyncResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <CheckCircle className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-medium">Directory synced successfully!</p>
                <p className="text-sm">
                  {lastSyncResult.message || 'Files have been processed and embeddings updated.'}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-3 mb-4">
              {/* Summary card */}
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Files</span>
                  <span className="text-2xl font-bold text-green-700">{lastSyncResult.files_processed}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-green-100">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{
                      width: `${lastSyncResult.files_processed > 0
                        ? ((lastSyncResult.files_created + lastSyncResult.files_updated) / lastSyncResult.files_processed) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {lastSyncResult.files_created + lastSyncResult.files_updated} completed
                  </span>
                  <span>
                    {lastSyncResult.files_failed} failed
                  </span>
                </div>
              </div>

              {/* Detailed statistics */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="text-xl font-semibold text-green-700">{lastSyncResult.files_created}</p>
                </div>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-muted-foreground text-xs">Updated</p>
                  <p className="text-xl font-semibold text-green-700">{lastSyncResult.files_updated}</p>
                </div>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-muted-foreground text-xs">Failed</p>
                  <p className="text-xl font-semibold text-red-600">{lastSyncResult.files_failed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Directory Picker Modal */}
      <DirectoryPickerModal
        open={showDirectoryPicker}
        onClose={() => setShowDirectoryPicker(false)}
        onSelect={(path) => {
          setFormData({ ...formData, path })
          setShowDirectoryPicker(false)
        }}
        initialPath={formData.path || '/Users'}
      />
    </div>
  )
}
