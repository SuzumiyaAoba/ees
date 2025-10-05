/**
 * Directory traversal and file collection with .eesignore support
 */

import { Effect } from "effect"
import { readdir, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import { loadEesignore, shouldIgnore } from "./eesignore"

export interface DirectoryProcessOptions {
  /**
   * Whether to follow symbolic links
   */
  followSymlinks?: boolean

  /**
   * Maximum depth for directory traversal (default: unlimited)
   */
  maxDepth?: number

  /**
   * Custom ignore patterns (in addition to .eesignore)
   */
  additionalIgnorePatterns?: string[]
}

export interface CollectedFile {
  /**
   * Absolute file path
   */
  absolutePath: string

  /**
   * Path relative to the root directory
   */
  relativePath: string

  /**
   * File size in bytes
   */
  size: number
}

/**
 * Collect all files from a directory, respecting .eesignore patterns
 */
export function collectFilesFromDirectory(
  dirPath: string,
  options: DirectoryProcessOptions = {}
): Effect.Effect<CollectedFile[], Error> {
  const {
    followSymlinks = false,
    maxDepth,
    additionalIgnorePatterns = [],
  } = options

  return Effect.gen(function* () {
    // Load ignore patterns from .eesignore or use defaults
    const ignorePatterns = yield* loadEesignore(dirPath)
    const allPatterns = [...ignorePatterns, ...additionalIgnorePatterns]

    // Recursively traverse directory
    const files = yield* traverseDirectory(
      dirPath,
      dirPath,
      allPatterns,
      0,
      maxDepth,
      followSymlinks
    )

    return files
  })
}

/**
 * Recursively traverse directory and collect files
 */
function traverseDirectory(
  rootPath: string,
  currentPath: string,
  ignorePatterns: string[],
  currentDepth: number,
  maxDepth: number | undefined,
  followSymlinks: boolean
): Effect.Effect<CollectedFile[], Error> {
  return Effect.gen(function* () {
    // Check depth limit
    if (maxDepth !== undefined && currentDepth > maxDepth) {
      return []
    }

    const entries = yield* Effect.tryPromise({
      try: () => readdir(currentPath, { withFileTypes: true }),
      catch: (error) =>
        new Error(`Failed to read directory ${currentPath}: ${String(error)}`),
    })

    const files: CollectedFile[] = []

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name)
      const relativePath = relative(rootPath, fullPath)

      // Check if should be ignored
      if (shouldIgnore(relativePath, ignorePatterns, rootPath)) {
        continue
      }

      // Handle symbolic links
      if (entry.isSymbolicLink()) {
        if (!followSymlinks) {
          continue
        }
        // Get actual file stats for symlink target
        const stats = yield* Effect.tryPromise({
          try: () => stat(fullPath),
          catch: () => new Error(`Failed to stat symlink ${fullPath}`),
        })

        if (stats.isFile()) {
          files.push({
            absolutePath: fullPath,
            relativePath,
            size: stats.size,
          })
        } else if (stats.isDirectory()) {
          const subFiles = yield* traverseDirectory(
            rootPath,
            fullPath,
            ignorePatterns,
            currentDepth + 1,
            maxDepth,
            followSymlinks
          )
          files.push(...subFiles)
        }
      } else if (entry.isDirectory()) {
        // Recursively process subdirectory
        const subFiles = yield* traverseDirectory(
          rootPath,
          fullPath,
          ignorePatterns,
          currentDepth + 1,
          maxDepth,
          followSymlinks
        )
        files.push(...subFiles)
      } else if (entry.isFile()) {
        const stats = yield* Effect.tryPromise({
          try: () => stat(fullPath),
          catch: () => new Error(`Failed to stat file ${fullPath}`),
        })

        files.push({
          absolutePath: fullPath,
          relativePath,
          size: stats.size,
        })
      }
    }

    return files
  })
}

/**
 * Filter collected files by extension
 */
export function filterByExtension(
  files: CollectedFile[],
  extensions: string[]
): CollectedFile[] {
  const normalizedExts = extensions.map(ext =>
    ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`
  )

  return files.filter(file => {
    const ext = file.relativePath.slice(file.relativePath.lastIndexOf(".")).toLowerCase()
    return normalizedExts.includes(ext)
  })
}

/**
 * Filter collected files by size
 */
export function filterBySize(
  files: CollectedFile[],
  maxSize: number
): CollectedFile[] {
  return files.filter(file => file.size <= maxSize)
}
