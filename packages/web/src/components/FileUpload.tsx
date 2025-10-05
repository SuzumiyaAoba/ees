import React, { useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useUploadFile, useProviderModels } from '@/hooks/useEmbeddings'

interface FileWithStatus {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

// Extend HTMLInputElement attributes to include directory selection
interface DirectoryInputAttributes {
  webkitdirectory?: string
  directory?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [uploadMode, setUploadMode] = useState<'files' | 'directory'>('files')
  const { data: models } = useProviderModels()
  const uploadMutation = useUploadFile()

  const generateFileId = () => Math.random().toString(36).substring(2, 15)

  const addFiles = useCallback((newFiles: FileList) => {
    const fileArray = Array.from(newFiles)
    const filesWithStatus: FileWithStatus[] = fileArray.map(file => ({
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
      addFiles(e.dataTransfer.files)
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
      addFiles(e.target.files)
    }
  }

  const uploadFile = async (fileWithStatus: FileWithStatus) => {
    updateFileStatus(fileWithStatus.id, 'uploading')

    try {
      await uploadMutation.mutateAsync({
        file: fileWithStatus.file,
        modelName: selectedModel || undefined,
      })
      updateFileStatus(fileWithStatus.id, 'success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFileStatus(fileWithStatus.id, 'error', errorMessage)
    }
  }

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')

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
            Configure settings for file uploads and embedding generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Upload Mode</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={uploadMode}
              onChange={(e) => {
                setUploadMode(e.target.value as 'files' | 'directory')
                setFiles([]) // Clear files when switching modes
              }}
            >
              <option value="files">Individual Files</option>
              <option value="directory">Directory (with .eesignore support)</option>
            </select>
            {uploadMode === 'directory' && (
              <p className="text-xs text-muted-foreground mt-1">
                Uploads all files from the selected directory. Create a .eesignore file (like .gitignore) in the directory root to filter files.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Embedding Model</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="">Use default model</option>
              {models?.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* File Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>
            {uploadMode === 'directory' ? 'Upload Directory' : 'Upload Files'}
          </CardTitle>
          <CardDescription>
            {uploadMode === 'directory'
              ? 'Select a directory to upload all files (respects .eesignore patterns)'
              : 'Drag and drop files here or click to select files'
            }
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
              <p className="text-lg font-medium">
                {dragActive
                  ? uploadMode === 'directory' ? 'Drop directory here' : 'Drop files here'
                  : uploadMode === 'directory' ? 'Click to select directory' : 'Drag & drop files here'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {uploadMode === 'directory'
                  ? 'Select a directory to upload all its files'
                  : 'or click to select files'
                }
              </p>
              <Input
                type="file"
                multiple={uploadMode === 'files'}
                {...(uploadMode === 'directory' && ({
                  webkitdirectory: '',
                  directory: '',
                } as DirectoryInputAttributes))}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {uploadMode === 'directory' ? 'Select Directory' : 'Select Files'}
              </Button>
            </div>
          </div>

          {/* Upload Controls */}
          {files.length > 0 && (
            <div className="flex justify-between items-center pt-4">
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