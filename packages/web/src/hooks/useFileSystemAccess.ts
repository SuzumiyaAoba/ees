import { useState, useCallback } from 'react'

interface FileWithPath {
  file: File
  relativePath: string
}

interface CollectionProgress {
  current: number
  total: number
  currentPath: string
}

export interface FileSystemAccessResult {
  files: FileWithPath[]
  directoryName: string
}

/**
 * Hook for using File System Access API to select and read directories
 * Solves permission issues by using browser-native directory picker
 */
export function useFileSystemAccess() {
  const [isCollecting, setIsCollecting] = useState(false)
  const [progress, setProgress] = useState<CollectionProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Check if File System Access API is supported
   */
  const isSupported = useCallback(() => {
    return 'showDirectoryPicker' in window
  }, [])

  /**
   * Open browser's native directory picker and collect all files
   */
  const pickDirectory = useCallback(async (
    options?: {
      onProgress?: (progress: CollectionProgress) => void
      maxDepth?: number
      ignorePatterns?: string[]
    }
  ): Promise<FileSystemAccessResult | null> => {
    if (!isSupported()) {
      throw new Error('File System Access API is not supported in this browser')
    }

    try {
      setIsCollecting(true)
      setError(null)
      setProgress(null)

      // Show browser's native directory picker
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'read',
      })

      const files: FileWithPath[] = []
      const ignorePatterns = options?.ignorePatterns || []

      // Collect files recursively
      await collectFilesRecursively(
        directoryHandle,
        files,
        '',
        0,
        options?.maxDepth,
        ignorePatterns,
        (current, currentPath) => {
          const progressData = {
            current,
            total: files.length,
            currentPath,
          }
          setProgress(progressData)
          options?.onProgress?.(progressData)
        }
      )

      return {
        files,
        directoryName: directoryHandle.name,
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - not an error
        return null
      }
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsCollecting(false)
      setProgress(null)
    }
  }, [isSupported])

  return {
    pickDirectory,
    isSupported,
    isCollecting,
    progress,
    error,
  }
}

/**
 * Recursively collect files from a directory handle
 */
async function collectFilesRecursively(
  dirHandle: FileSystemDirectoryHandle,
  files: FileWithPath[],
  currentPath: string,
  currentDepth: number,
  maxDepth: number | undefined,
  ignorePatterns: string[],
  onProgress: (current: number, currentPath: string) => void
): Promise<void> {
  // Check depth limit
  if (maxDepth !== undefined && currentDepth > maxDepth) {
    return
  }

  for await (const entry of dirHandle.values()) {
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name

    // Check if should be ignored
    if (shouldIgnore(entryPath, ignorePatterns)) {
      continue
    }

    if (entry.kind === 'file') {
      try {
        const file = await entry.getFile()

        // Create a new File with the relative path
        const fileWithPath = new File([file], entryPath, {
          type: file.type,
          lastModified: file.lastModified,
        })

        files.push({
          file: fileWithPath,
          relativePath: entryPath,
        })

        onProgress(files.length, entryPath)
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Failed to read file ${entryPath}:`, error)
      }
    } else if (entry.kind === 'directory') {
      // Skip hidden directories
      if (entry.name.startsWith('.')) {
        continue
      }

      try {
        await collectFilesRecursively(
          entry,
          files,
          entryPath,
          currentDepth + 1,
          maxDepth,
          ignorePatterns,
          onProgress
        )
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Failed to read directory ${entryPath}:`, error)
      }
    }
  }
}

/**
 * Check if a path should be ignored based on patterns
 * Supports simple glob patterns like .gitignore
 */
function shouldIgnore(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false

  for (const pattern of patterns) {
    // Skip empty lines and comments
    if (!pattern || pattern.startsWith('#')) {
      continue
    }

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')

    const regex = new RegExp(`^${regexPattern}$`)

    if (regex.test(path)) {
      return true
    }

    // Check if any part of the path matches
    const pathParts = path.split('/')
    for (let i = 0; i < pathParts.length; i++) {
      const partialPath = pathParts.slice(i).join('/')
      if (regex.test(partialPath)) {
        return true
      }
    }
  }

  return false
}

/**
 * TypeScript declarations for File System Access API
 */
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite'
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
    }): Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory'
    readonly name: string
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file'
    getFile(): Promise<File>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory'
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
  }
}

export {}
