import { Effect, Context, Layer } from "effect"
import { existsSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { homedir } from "node:os"

/**
 * File System Service
 * Provides directory browsing capabilities for the upload directory picker
 */

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface FileSystemService {
  readonly listDirectory: (path: string) => Effect.Effect<DirectoryEntry[], Error>
  readonly validatePath: (path: string) => Effect.Effect<boolean, Error>
}

export const FileSystemService = Context.GenericTag<FileSystemService>("FileSystemService")

/**
 * List contents of a directory
 * Only returns directories, not files
 */
const listDirectory = (dirPath: string): Effect.Effect<DirectoryEntry[], Error> =>
  Effect.gen(function* () {
    // Resolve ~ to home directory
    const resolvedPath = dirPath.startsWith("~")
      ? resolve(homedir(), dirPath.slice(1))
      : resolve(dirPath)

    // Validate path exists and is a directory
    if (!existsSync(resolvedPath)) {
      return yield* Effect.fail(new Error(`Path does not exist: ${dirPath}`))
    }

    const stat = yield* Effect.try({
      try: () => statSync(resolvedPath),
      catch: (error) => new Error(`Failed to read path: ${String(error)}`),
    })

    if (!stat.isDirectory()) {
      return yield* Effect.fail(new Error(`Path is not a directory: ${dirPath}`))
    }

    // Read directory contents
    const entries = yield* Effect.try({
      try: () => readdirSync(resolvedPath),
      catch: (error) => new Error(`Failed to read directory: ${String(error)}`),
    })

    // Filter to only directories and map to DirectoryEntry
    const directoryEntries: DirectoryEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/directories (starting with .)
      if (entry.startsWith(".")) {
        continue
      }

      const fullPath = join(resolvedPath, entry)

      try {
        const entryStat = statSync(fullPath)
        if (entryStat.isDirectory()) {
          directoryEntries.push({
            name: entry,
            path: fullPath,
            isDirectory: true,
          })
        }
      } catch {
        // Skip entries we can't stat (permission errors, etc.)
        continue
      }
    }

    // Sort directories alphabetically
    directoryEntries.sort((a, b) => a.name.localeCompare(b.name))

    return directoryEntries
  })

/**
 * Validate that a path exists and is accessible
 */
const validatePath = (path: string): Effect.Effect<boolean, Error> =>
  Effect.gen(function* () {
    const resolvedPath = path.startsWith("~")
      ? resolve(homedir(), path.slice(1))
      : resolve(path)

    if (!existsSync(resolvedPath)) {
      return false
    }

    const stat = yield* Effect.try({
      try: () => statSync(resolvedPath),
      catch: () => new Error("Failed to read path"),
    })

    return stat.isDirectory()
  })

/**
 * Live implementation of FileSystemService
 */
export const FileSystemServiceLive = Layer.succeed(
  FileSystemService,
  FileSystemService.of({
    listDirectory,
    validatePath,
  })
)
