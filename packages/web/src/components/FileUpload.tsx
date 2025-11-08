import React, { useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormSelect } from '@/components/ui/FormSelect'
import { useUploadFile, useProviderModels } from '@/hooks/useEmbeddings'

interface FileWithStatus {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const { data: models } = useProviderModels()
  const uploadMutation = useUploadFile()

  const generateFileId = () => Math.random().toString(36).substring(2, 15)

  const addFiles = useCallback((newFiles: File[]) => {
    const filesWithStatus: FileWithStatus[] = newFiles.map(file => ({
      file,
      id: generateFileId(),
      status: 'pending' as const,
    }))

    setFiles(prev => [...prev, ...filesWithStatus])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const updateFileStatus = useCallback((id: string, status: FileWithStatus['status'], error?: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status, error } : f
    ))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
      e.dataTransfer.clearData()
    }
  }, [addFiles])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  const uploadFile = async (fileWithStatus: FileWithStatus) => {
    updateFileStatus(fileWithStatus.id, 'uploading')

    try {
      console.log('[FileUpload] Uploading file:', fileWithStatus.file.name, 'Model:', selectedModel)
      const result = await uploadMutation.mutateAsync({
        file: fileWithStatus.file,
        modelName: selectedModel || undefined,
      })
      console.log('[FileUpload] Upload result:', result)

      // Check if the response contains results array (upload response structure)
      if (typeof result === 'object' && result && 'results' in result && Array.isArray(result.results)) {
        const fileResult = result.results[0]

        if (fileResult && 'status' in fileResult && fileResult.status === 'error') {
          const errorMsg = ('error' in fileResult && typeof fileResult.error === 'string')
            ? fileResult.error
            : 'File processing failed'
          updateFileStatus(fileWithStatus.id, 'error', errorMsg)
          return
        }
      }

      // Check if overall upload had failures
      if (typeof result === 'object' && result && 'failed' in result && typeof (result as { failed: number }).failed === 'number') {
        const failedCount = (result as { failed: number }).failed
        if (failedCount > 0) {
          const message = (result as { message?: string }).message ?? 'File processing failed'
          updateFileStatus(fileWithStatus.id, 'error', message)
          return
        }
      }

      updateFileStatus(fileWithStatus.id, 'success')
    } catch (error) {
      console.error('[FileUpload] Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFileStatus(fileWithStatus.id, 'error', errorMessage)
    }
  }

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')

    // Upload files sequentially
    for (const file of pendingFiles) {
      await uploadFile(file)
    }
  }

  const clearAllFiles = () => {
    setFiles([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Upload Configuration
          </CardTitle>
          <CardDescription>
            Configure settings for individual file uploads and embedding generation.
            For directory synchronization, use the Directory Management feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSelect
            label="Embedding Model"
            value={selectedModel}
            onChange={setSelectedModel}
            options={[
              { value: '', label: 'Use default model' },
              ...(models?.map((model) => ({
                value: model.name,
                label: model.displayName || model.name,
              })) || [])
            ]}
          />
        </CardContent>
      </Card>

      {/* File Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop files here or click to select files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="title-large">
                {dragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="body-medium text-on-surface-variant">
                or click to select files
              </p>
              <Input
                type="file"
                multiple={true}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                data-testid="file-upload"
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Select Files
              </Button>
            </div>
          </div>

          {/* Upload Controls */}
          {files.length > 0 && (
            <div className="flex justify-between items-center pt-4" data-testid="upload-controls">
              <div className="text-sm text-muted-foreground">
                {files.length} file(s) selected
                {pendingCount > 0 && ` • ${pendingCount} pending`}
                {uploadingCount > 0 && ` • ${uploadingCount} uploading`}
                {successCount > 0 && ` • ${successCount} completed`}
                {errorCount > 0 && ` • ${errorCount} failed`}
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={clearAllFiles}>
                  Clear All
                </Button>
                <Button
                  onClick={uploadAllFiles}
                  disabled={pendingCount === 0 || uploadingCount > 0}
                >
                  Upload All ({pendingCount})
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue</CardTitle>
            <CardDescription>
              Monitor the progress of your file uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map((fileWithStatus) => (
                <div
                  key={fileWithStatus.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(fileWithStatus.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {fileWithStatus.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(fileWithStatus.file.size)}
                        {fileWithStatus.error && (
                          <span className="text-red-500 ml-2">
                            • {fileWithStatus.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileWithStatus.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => uploadFile(fileWithStatus)}
                        disabled={uploadingCount > 0}
                      >
                        Upload
                      </Button>
                    )}
                    {fileWithStatus.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadFile(fileWithStatus)}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFile(fileWithStatus.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}