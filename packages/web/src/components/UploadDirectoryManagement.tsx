import React, { useState } from 'react'
import { FolderOpen, FolderPlus, RefreshCw, Trash2, Edit, CheckCircle, AlertCircle, Search } from 'lucide-react'
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
    try {
      await syncMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to sync directory:', error)
    } finally {
      setSyncingDirectories(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
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
                Register directories for one-click document synchronization
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
                  Absolute path to the directory on your system
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
      {syncMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Directory synced successfully!</p>
                <p className="text-sm">
                  {syncMutation.data?.message || 'Files have been processed and embeddings updated.'}
                </p>
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
