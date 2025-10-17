import React, { useState, useEffect } from 'react'
import { FolderOpen, ChevronRight, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { apiClient } from '@/services/api'
import type { DirectoryEntry } from '@/types/api'

interface DirectoryPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
  initialPath?: string
}

export function DirectoryPickerModal({ open, onClose, onSelect, initialPath = '/Users' }: DirectoryPickerModalProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadDirectory(currentPath)
    }
  }, [open, currentPath])

  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.listDirectory(path)
      setEntries(response.entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  const handleDirectoryClick = (path: string) => {
    setCurrentPath(path)
  }

  const handleParentClick = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    setCurrentPath(parentPath)
  }

  const handleHomeClick = () => {
    setCurrentPath('/Users')
  }

  const handleSelect = () => {
    onSelect(currentPath)
    onClose()
  }

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs: { name: string; path: string }[] = [
      { name: 'Root', path: '/' }
    ]

    let accumulatedPath = ''
    for (const part of parts) {
      accumulatedPath += `/${part}`
      breadcrumbs.push({
        name: part,
        path: accumulatedPath
      })
    }

    return breadcrumbs
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Select Directory</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleHomeClick}
              disabled={currentPath === '/Users'}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleParentClick}
              disabled={currentPath === '/' || currentPath === ''}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
            {getBreadcrumbs().map((crumb, index, array) => (
              <React.Fragment key={crumb.path}>
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className="hover:text-foreground whitespace-nowrap"
                >
                  {crumb.name}
                </button>
                {index < array.length - 1 && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 text-red-600">{error}</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No subdirectories found</p>
              </div>
            ) : (
              <div className="divide-y">
                {entries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => handleDirectoryClick(entry.path)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="flex-1 truncate">{entry.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Path Display */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Selected Path:</p>
            <p className="text-sm font-mono bg-gray-50 p-2 rounded border break-all">
              {currentPath}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSelect}>
              Select This Directory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
