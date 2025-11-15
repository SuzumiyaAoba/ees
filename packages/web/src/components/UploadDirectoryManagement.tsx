import React, { useState, useEffect, useCallback } from 'react'
import { FolderOpen, FolderPlus, RefreshCw, Trash2, CheckCircle, AlertCircle, Search, XCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { FormSelect } from '@/components/ui/FormSelect'
import { DirectoryPickerModal } from '@/components/DirectoryPickerModal'
import {
  useUploadDirectories,
  useCreateUploadDirectory,
  useDeleteUploadDirectory,
  useSyncUploadDirectory,
} from '@/hooks/useUploadDirectories'
import { useModels } from '@/hooks/useModels'
import { useFileSystemAccess } from '@/hooks/useFileSystemAccess'
import { apiClient } from '@/services/api'
import type { UploadDirectory, TaskType, TaskTypeMetadata, FailedFile } from '@/types/api'

export function UploadDirectoryManagement() {
  const { data: directories, isLoading, error } = useUploadDirectories()
  const { models } = useModels()
  const createMutation = useCreateUploadDirectory()
  const deleteMutation = useDeleteUploadDirectory()
  const syncMutation = useSyncUploadDirectory()
  const {
    pickDirectory,
    pickDirectoryForRegistration,
    saveDirectoryHandle,
    getDirectoryHandle,
    collectFilesFromHandle,
    verifyHandlePermission,
    isSupported: isFileSystemAccessSupported,
    isCollecting
  } = useFileSystemAccess()

  // Filter out 'default' models and transform to match expected format
  const availableModels = models
    .filter(m => m.name !== 'default')
    .map(m => ({
      name: m.name,
      displayName: m.displayName || m.name
    }))

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    model_name: '',
    description: '',
  })
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([])
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeMetadata[]>([])
  const [isLoadingTaskTypes, setIsLoadingTaskTypes] = useState(false)
  const [syncingDirectories, setSyncingDirectories] = useState<Set<number>>(new Set())
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)
  const [syncProgress, setSyncProgress] = useState<Record<number, {
    current: number
    total: number
    file: string
    created: number
    updated: number
    failed: number
    failedFiles: FailedFile[]
    status: 'pending' | 'running' | 'completed' | 'failed'
  }>>({})
  const [lastSyncResult, setLastSyncResult] = useState<{
    directory_id: number
    files_processed: number
    files_created: number
    files_updated: number
    files_failed: number
    message: string
  } | null>(null)
  const [pollIntervals, setPollIntervals] = useState<Record<number, NodeJS.Timeout>>({})
  const [browserUploadProgress, setBrowserUploadProgress] = useState<{
    current: number
    total: number
    currentFile: string
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [directoryHandleId, setDirectoryHandleId] = useState<string | null>(null)

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals).forEach(interval => clearInterval(interval))
    }
  }, [pollIntervals])

  // Load task types when model changes
  useEffect(() => {
    const loadTaskTypes = async () => {
      if (!formData.model_name) {
        setTaskTypeOptions([])
        setSelectedTaskTypes([])
        return
      }

      setIsLoadingTaskTypes(true)
      try {
        const response = await apiClient.getTaskTypes(formData.model_name)
        setTaskTypeOptions(response.task_types)

        // Clear selected task types if they're not supported by new model
        if (response.task_types.length === 0) {
          setSelectedTaskTypes([])
        } else {
          setSelectedTaskTypes(prev =>
            prev.filter(t => response.task_types.some(opt => opt.value === t))
          )
        }
      } catch (error) {
        console.error('Failed to load task types:', error)
        setTaskTypeOptions([])
        setSelectedTaskTypes([])
      } finally {
        setIsLoadingTaskTypes(false)
      }
    }

    loadTaskTypes()
  }, [formData.model_name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Add handle ID to description if using browser picker
      const description = formData.description || ''
      const finalDescription = directoryHandleId
        ? `${description}${description ? ' ' : ''}[HANDLE_ID:${directoryHandleId}]`
        : description || undefined

      await createMutation.mutateAsync({
        name: formData.name,
        path: formData.path,
        model_name: formData.model_name,
        task_types: selectedTaskTypes.length > 0 ? selectedTaskTypes : undefined,
        description: finalDescription,
      })

      // Reset form and hide
      setFormData({ name: '', path: '', model_name: '', description: '' })
      setSelectedTaskTypes([])
      setDirectoryHandleId(null)
      setShowCreateForm(false)
    } catch (error) {
      // Error is handled by mutation
      console.error('Failed to create directory:', error)
    }
  }

  const handleTaskTypeToggle = (taskType: TaskType) => {
    setSelectedTaskTypes(prev =>
      prev.includes(taskType)
        ? prev.filter(t => t !== taskType)
        : [...prev, taskType]
    )
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

  const handleResetJobs = async (id: number) => {
    if (window.confirm('Are you sure you want to cancel all incomplete sync jobs for this directory?')) {
      try {
        await apiClient.cancelIncompleteSyncJobs(id)

        // Stop any polling for this directory
        if (pollIntervals[id]) {
          clearInterval(pollIntervals[id])
          setPollIntervals(prev => {
            const newIntervals = { ...prev }
            delete newIntervals[id]
            return newIntervals
          })
        }

        // Clear syncing state
        setSyncingDirectories(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })

        // Clear progress
        setSyncProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[id]
          return newProgress
        })

        // Show success message
        setLastSyncResult({
          directory_id: id,
          files_processed: 0,
          files_created: 0,
          files_updated: 0,
          files_failed: 0,
          message: 'All incomplete sync jobs have been cancelled successfully'
        })
      } catch (error) {
        console.error('Failed to reset sync jobs:', error)
      }
    }
  }

  // Start polling for a specific job
  const startPollingForJob = useCallback((directoryId: number, jobId: number) => {
    const interval = setInterval(async () => {
      try {
        const job = await apiClient.getSyncJobStatus(directoryId, jobId)

        // Update progress
        const failedFiles: FailedFile[] = job.failed_file_paths
          ? JSON.parse(job.failed_file_paths) as FailedFile[]
          : []

        setSyncProgress(prev => ({
          ...prev,
          [directoryId]: {
            current: job.processed_files,
            total: job.total_files,
            file: job.current_file || '',
            created: job.created_files,
            updated: job.updated_files,
            failed: job.failed_files,
            failedFiles: failedFiles,
            status: job.status
          }
        }))

        // Check if job is complete
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval)
          setPollIntervals(prev => {
            const newIntervals = { ...prev }
            delete newIntervals[directoryId]
            return newIntervals
          })

          if (job.status === 'completed') {
            setLastSyncResult({
              directory_id: directoryId,
              files_processed: job.processed_files,
              files_created: job.created_files,
              files_updated: job.updated_files,
              files_failed: job.failed_files,
              message: 'Directory synced successfully'
            })
          } else {
            console.error('Sync job failed:', job.error_message)
          }

          // Clean up
          setSyncingDirectories(prev => {
            const newSet = new Set(prev)
            newSet.delete(directoryId)
            return newSet
          })
          setSyncProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[directoryId]
            return newProgress
          })
        }
      } catch (error) {
        console.error('Failed to get job status:', error)
        clearInterval(interval)
        setPollIntervals(prev => {
          const newIntervals = { ...prev }
          delete newIntervals[directoryId]
          return newIntervals
        })

        // Clean up on error
        setSyncingDirectories(prev => {
          const newSet = new Set(prev)
          newSet.delete(directoryId)
          return newSet
        })
        setSyncProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[directoryId]
          return newProgress
        })
      }
    }, 1000) // Poll every second

    // Store interval for cleanup
    setPollIntervals(prev => ({ ...prev, [directoryId]: interval }))
  }, [])

  // Check for running jobs on mount and resume polling
  useEffect(() => {
    if (!directories?.directories) {
      return
    }

    const checkRunningJobs = async () => {
      for (const directory of directories.directories) {
        const latestJob = await apiClient.getLatestSyncJob(directory.id)

        // If job is running or pending, start polling
        if (latestJob && (latestJob.status === 'running' || latestJob.status === 'pending')) {
          // Mark as syncing
          setSyncingDirectories(prev => new Set(prev).add(directory.id))

          // Initialize progress
          const initialFailedFiles: FailedFile[] = latestJob.failed_file_paths
            ? JSON.parse(latestJob.failed_file_paths) as FailedFile[]
            : []

          setSyncProgress(prev => ({
            ...prev,
            [directory.id]: {
              current: latestJob.processed_files,
              total: latestJob.total_files,
              file: latestJob.current_file || '',
              created: latestJob.created_files,
              updated: latestJob.updated_files,
              failed: latestJob.failed_files,
              failedFiles: initialFailedFiles,
              status: latestJob.status
            }
          }))

          // Start polling for this job
          startPollingForJob(directory.id, latestJob.id)
        }
      }
    }

    checkRunningJobs()
  }, [directories?.directories, startPollingForJob])

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
        failed: 0,
        failedFiles: [],
        status: 'pending'
      }
    }))

    try {
      // Find the directory to check if it's browser-picked
      const directory = directories?.directories.find(d => d.id === id)

      if (!directory) {
        throw new Error('Directory not found')
      }

      // Check if this directory was selected via browser picker
      const handleIdMatch = directory.description?.match(/\[HANDLE_ID:([^\]]+)\]/)
      const isBrowserPicked = directory.path.startsWith('[Browser:')

      if (isBrowserPicked && handleIdMatch && isFileSystemAccessSupported()) {
        // Browser-picked directory - use stored handle
        await handleBrowserSync(id, handleIdMatch[1], directory.model_name)
      } else {
        // Server filesystem directory - use traditional sync
        const response = await apiClient.syncUploadDirectory(id)
        const jobId = response.job_id

        // Start polling using shared function
        startPollingForJob(id, jobId)
      }
    } catch (error) {
      console.error('Failed to start sync job:', error)
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
      alert(`Sync failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleBrowserSync = async (directoryId: number, handleId: string, modelName: string) => {
    try {
      // Get the stored directory handle
      const handle = await getDirectoryHandle(handleId)

      if (!handle) {
        throw new Error('Directory handle not found. Please re-register the directory.')
      }

      // Verify permission
      const hasPermission = await verifyHandlePermission(handle)

      if (!hasPermission) {
        throw new Error('Permission denied. Please re-register the directory to grant access.')
      }

      // Collect files from the handle
      const result = await collectFilesFromHandle(handle, {
        onProgress: (progress) => {
          setSyncProgress(prev => ({
            ...prev,
            [directoryId]: {
              ...prev[directoryId],
              current: progress.current,
              total: progress.total,
              file: progress.currentPath,
              status: 'running'
            }
          }))
        },
      })

      if (result.files.length === 0) {
        throw new Error('No files found in the directory.')
      }

      // Update progress for upload phase
      setSyncProgress(prev => ({
        ...prev,
        [directoryId]: {
          current: 0,
          total: result.files.length,
          file: 'Uploading files to server...',
          created: 0,
          updated: 0,
          failed: 0,
          failedFiles: [],
          status: 'running'
        }
      }))

      let uploadedCount = 0
      let failedCount = 0

      // Upload files to server
      for (const { file } of result.files) {
        try {
          await apiClient.uploadFile(file, modelName)
          uploadedCount++

          setSyncProgress(prev => ({
            ...prev,
            [directoryId]: {
              ...prev[directoryId],
              current: uploadedCount + failedCount,
              file: file.name,
              created: uploadedCount,
              failed: failedCount
            }
          }))
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          failedCount++

          setSyncProgress(prev => ({
            ...prev,
            [directoryId]: {
              ...prev[directoryId],
              current: uploadedCount + failedCount,
              file: file.name,
              failed: failedCount
            }
          }))
        }
      }

      // Show success message
      setLastSyncResult({
        directory_id: directoryId,
        files_processed: result.files.length,
        files_created: uploadedCount,
        files_updated: 0,
        files_failed: failedCount,
        message: `Browser sync completed: ${uploadedCount} files uploaded from "${result.directoryName}"`,
      })

      // Clean up
      setSyncingDirectories(prev => {
        const newSet = new Set(prev)
        newSet.delete(directoryId)
        return newSet
      })
      setSyncProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[directoryId]
        return newProgress
      })
    } catch (error) {
      console.error('Browser sync failed:', error)

      // Clean up on error
      setSyncingDirectories(prev => {
        const newSet = new Set(prev)
        newSet.delete(directoryId)
        return newSet
      })
      setSyncProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[directoryId]
        return newProgress
      })

      throw error
    }
  }

  const handleBrowserDirectoryPicker = async () => {
    if (!isFileSystemAccessSupported()) {
      alert('File System Access API is not supported in your browser. Please use Chrome, Edge, or Safari 15.2+.')
      return
    }

    try {
      // Pick directory using browser's native picker
      const result = await pickDirectoryForRegistration()

      if (!result) {
        // User cancelled
        return
      }

      const { directoryName, directoryHandle } = result

      // Generate a unique ID for this handle
      const handleId = `dir_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Save the handle to IndexedDB
      await saveDirectoryHandle(handleId, directoryHandle)

      // Update form with directory name and a placeholder path
      setFormData({
        ...formData,
        name: formData.name || directoryName,
        path: `[Browser: ${directoryName}]`,
      })

      // Store handle ID for later use
      setDirectoryHandleId(handleId)
    } catch (error) {
      console.error('Browser directory picker failed:', error)
      alert(`Failed to select directory: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleBrowserDirectoryUpload = async () => {
    if (!isFileSystemAccessSupported()) {
      alert('File System Access API is not supported in your browser. Please use Chrome, Edge, or Safari 15.2+.')
      return
    }

    if (!formData.model_name) {
      alert('Please select a model before uploading files.')
      return
    }

    try {
      setIsUploading(true)
      setBrowserUploadProgress({ current: 0, total: 0, currentFile: 'Opening directory picker...' })

      // Pick directory using browser's native picker
      const result = await pickDirectory({
        onProgress: (progress) => {
          setBrowserUploadProgress({
            current: progress.current,
            total: progress.total,
            currentFile: progress.currentPath,
          })
        },
      })

      if (!result) {
        // User cancelled
        setBrowserUploadProgress(null)
        setIsUploading(false)
        return
      }

      const { files, directoryName } = result

      if (files.length === 0) {
        alert('No files found in the selected directory.')
        setBrowserUploadProgress(null)
        setIsUploading(false)
        return
      }

      // Upload files to server
      setBrowserUploadProgress({
        current: 0,
        total: files.length,
        currentFile: 'Uploading files to server...',
      })

      let uploadedCount = 0
      let failedCount = 0

      for (const { file } of files) {
        try {
          await apiClient.uploadFile(file, formData.model_name)
          uploadedCount++
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          failedCount++
        }

        setBrowserUploadProgress({
          current: uploadedCount + failedCount,
          total: files.length,
          currentFile: file.name,
        })
      }

      // Show success message
      setLastSyncResult({
        directory_id: 0, // Browser upload doesn't have a directory ID
        files_processed: files.length,
        files_created: uploadedCount,
        files_updated: 0,
        files_failed: failedCount,
        message: `Browser upload completed: ${uploadedCount} files uploaded from "${directoryName}"`,
      })

      setBrowserUploadProgress(null)
      setIsUploading(false)
    } catch (error) {
      console.error('Browser directory upload failed:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
      setBrowserUploadProgress(null)
      setIsUploading(false)
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
                Register directories for one-click document synchronization. Supports .eesignore for filtering files.
                {isFileSystemAccessSupported() && (
                  <span className="block mt-1 text-primary">
                    💡 Use "Quick Upload" to upload files directly from your browser - no permission issues!
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isFileSystemAccessSupported() && (
                <Button
                  variant="outline"
                  onClick={handleBrowserDirectoryUpload}
                  disabled={isUploading || isCollecting || !formData.model_name}
                  title="Use browser's native directory picker (no permission issues)"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading || isCollecting ? 'Processing...' : 'Quick Upload'}
                </Button>
              )}
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Register Directory
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Browser Upload Progress */}
        {browserUploadProgress && (
          <CardContent className="border-t">
            <div className="bg-info/10 dark:bg-info/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                  {isCollecting ? 'Collecting files from directory...' : 'Uploading to server...'}
                </span>
                <span className="text-blue-700 dark:text-blue-300 font-semibold">
                  {browserUploadProgress.current} / {browserUploadProgress.total}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-medium truncate" title={browserUploadProgress.currentFile}>
                    {browserUploadProgress.currentFile}
                  </span>
                  <span className="font-medium ml-2">
                    {browserUploadProgress.total > 0
                      ? `${Math.round((browserUploadProgress.current / browserUploadProgress.total) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
                    style={{
                      width: browserUploadProgress.total > 0
                        ? `${(browserUploadProgress.current / browserUploadProgress.total) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <FormField
                label="Directory Name"
                helpText="A user-friendly name for this directory"
              >
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Documents"
                  required
                />
              </FormField>

              <FormField
                label="Directory Path"
                helpText={isFileSystemAccessSupported()
                  ? "Use Browser Picker for easy, permission-free directory selection, or enter an absolute path."
                  : "Absolute path to the directory. Place a .eesignore file in the directory root to filter files (like .gitignore)."
                }
              >
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/Users/username/Documents"
                    required
                    className="flex-1"
                    readOnly={formData.path.startsWith('[Browser:')}
                  />
                  {isFileSystemAccessSupported() && (
                    <Button
                      type="button"
                      size="lg"
                      variant="default"
                      onClick={handleBrowserDirectoryPicker}
                      title="Use browser's native directory picker (recommended - no permission issues)"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => setShowDirectoryPicker(true)}
                    title="Browse server filesystem (may require permissions)"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {formData.path.startsWith('[Browser:') && (
                  <p className="text-sm text-primary mt-2">
                    ✓ Directory selected via browser picker - no permission issues!
                  </p>
                )}
              </FormField>

              <FormSelect
                label="Embedding Model"
                value={formData.model_name}
                onChange={(value) => setFormData({ ...formData, model_name: value })}
                options={availableModels.map((model) => ({
                  value: model.name,
                  label: model.displayName,
                }))}
              />

              {/* Task Types Selection */}
              {!isLoadingTaskTypes && taskTypeOptions.length > 0 && (
                <div>
                  <label className="block label-large mb-3">
                    Task Types (Optional - for models that support it)
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                    {taskTypeOptions.map((taskType) => (
                      <label
                        key={taskType.value}
                        className="flex items-start gap-2 cursor-pointer hover:bg-primary/[0.08] p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTaskTypes.includes(taskType.value as TaskType)}
                          onChange={() => handleTaskTypeToggle(taskType.value as TaskType)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="label-large">{taskType.label}</div>
                          <div className="body-small text-on-surface-variant">{taskType.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="body-small text-on-surface-variant mt-2">
                    {selectedTaskTypes.length > 0
                      ? `${selectedTaskTypes.length} task type(s) selected - will create ${selectedTaskTypes.length} embedding(s) per file`
                      : 'Select one or more task types to create specialized embeddings for each file'}
                  </p>
                </div>
              )}

              <FormField label="Description (Optional)">
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project documentation and guides"
                />
              </FormField>

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
                <Button type="submit" disabled={createMutation.isPending || !formData.model_name}>
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
                      {directory.task_types && directory.task_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {directory.task_types.map((taskType) => (
                            <Badge key={taskType} variant="outline" className="text-xs">
                              {taskType}
                            </Badge>
                          ))}
                        </div>
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
                        onClick={() => handleResetJobs(directory.id)}
                        title="Cancel all incomplete sync jobs"
                      >
                        <XCircle className="h-4 w-4" />
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
                    <div className="border-t pt-3 space-y-2 bg-info/10 dark:bg-info/20 -mx-4 -mb-3 px-4 pb-3 rounded-b-lg">
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Processing files...
                        </span>
                        <span className="text-blue-700 dark:text-blue-300 font-semibold">
                          {syncProgress[directory.id].current} / {syncProgress[directory.id].total}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                          <span className="font-medium truncate" title={syncProgress[directory.id].file}>
                            {syncProgress[directory.id].file || 'Collecting files...'}
                          </span>
                          <span className="font-medium ml-2">
                            {syncProgress[directory.id].total > 0
                              ? `${Math.round((syncProgress[directory.id].current / syncProgress[directory.id].total) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
                            style={{
                              width: syncProgress[directory.id].total > 0
                                ? `${(syncProgress[directory.id].current / syncProgress[directory.id].total) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-blue-700 dark:text-blue-300">
                        <span>Created: <span className="font-semibold">{syncProgress[directory.id].created}</span></span>
                        <span>Updated: <span className="font-semibold">{syncProgress[directory.id].updated}</span></span>
                        <span>Failed: <span className="font-semibold text-red-600 dark:text-red-400">{syncProgress[directory.id].failed}</span></span>
                      </div>

                      {/* Failed files list */}
                      {syncProgress[directory.id].failedFiles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                          <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Failed Files:</div>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {syncProgress[directory.id].failedFiles.map((failedFile, index) => (
                              <div key={index} className="text-xs bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 rounded px-2 py-1">
                                <div className="font-medium text-destructive-foreground truncate" title={failedFile.path}>
                                  {failedFile.path}
                                </div>
                                <div className="text-red-600 dark:text-red-400 text-[10px] mt-0.5" title={failedFile.error}>
                                  {failedFile.error}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
        <Card className="border-success/30 bg-success/10 dark:bg-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-success mb-4">
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
              <div className="bg-background rounded-lg p-4 border border-success/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Files</span>
                  <span className="text-2xl font-bold text-success">{lastSyncResult.files_processed}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-success/20 dark:bg-success/30">
                  <div
                    className="h-full bg-success transition-all"
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
                <div className="bg-background rounded p-3 border border-success/30">
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="text-xl font-semibold text-success">{lastSyncResult.files_created}</p>
                </div>
                <div className="bg-background rounded p-3 border border-success/30">
                  <p className="text-muted-foreground text-xs">Updated</p>
                  <p className="text-xl font-semibold text-success">{lastSyncResult.files_updated}</p>
                </div>
                <div className="bg-background rounded p-3 border border-success/30">
                  <p className="text-muted-foreground text-xs">Failed</p>
                  <p className="text-xl font-semibold text-destructive">{lastSyncResult.files_failed}</p>
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
