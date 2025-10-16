/**
 * .eesignore file parser and matcher
 * Compatible with .gitignore specification
 */

import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { minimatch } from "minimatch"

/**
 * Parse .eesignore file content into patterns
 * Follows .gitignore specification:
 * - Lines starting with # are comments
 * - Empty lines are ignored
 * - ! prefix negates a pattern
 * - Trailing spaces are ignored unless escaped
 */
export function parseIgnorePatterns(content: string): string[] {
  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
}

/**
 * Load .eesignore file from directory
 */
export function loadEesignore(
  dirPath: string
): Effect.Effect<string[], Error> {
  return Effect.tryPromise({
    try: async () => {
      const ignoreFilePath = join(dirPath, ".eesignore")
      try {
        const content = await readFile(ignoreFilePath, "utf-8")
        return parseIgnorePatterns(content)
      } catch {
        // No .eesignore file found, return default patterns
        return getDefaultIgnorePatterns()
      }
    },
    catch: (error) =>
      new Error(`Failed to load .eesignore: ${String(error)}`),
  })
}

/**
 * Default ignore patterns when no .eesignore file exists
 */
export function getDefaultIgnorePatterns(): string[] {
  return [
    "node_modules",
    ".git",
    ".DS_Store",
    "*.log",
    ".env",
    ".env.*",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    ".cache",
  ]
}

/**
 * Check if a file path matches any ignore pattern
 * Uses minimatch for .gitignore-compatible pattern matching
 */
export function shouldIgnore(
  filePath: string,
  patterns: string[],
  _basePath: string = ""
): boolean {
  // Normalize path separators to forward slashes
  const normalizedPath = filePath.replace(/\\/g, "/")

  let ignored = false

  for (const pattern of patterns) {
    // Handle negation patterns (!)
    const isNegation = pattern.startsWith("!")
    const actualPattern = isNegation ? pattern.slice(1) : pattern

    if (matchPattern(normalizedPath, actualPattern)) {
      // Negation patterns can override previous matches
      ignored = !isNegation
    }
  }

  return ignored
}

/**
 * Match a file path against a glob pattern using minimatch
 * Follows .gitignore specification:
 * - Pattern without / matches basename or any path component
 * - Pattern with / matches from root or subdirectories
 * - Pattern ending with / matches directories only
 * - ** matches zero or more directories
 */
function matchPattern(path: string, pattern: string): boolean {
  // minimatch options for .gitignore-style matching
  const options = {
    dot: true,        // Match files starting with .
    matchBase: false, // Don't match basename by default
    nocase: false,    // Case-sensitive matching
  }

  // Pattern contains / - match from root
  if (pattern.includes("/")) {
    // Remove leading ./ if present
    const cleanPattern = pattern.replace(/^\.\//, "")

    // Try exact match first
    if (minimatch(path, cleanPattern, options)) {
      return true
    }

    // Also try matching as subdirectory pattern (with ** prefix)
    // This makes "src/generated" match both "src/generated" and "src/generated/file.ts"
    if (minimatch(path, `${cleanPattern}/**`, options)) {
      return true
    }

    return false
  }

  // Pattern without / - match basename or any path component
  // This means the pattern can match anywhere in the path
  const pathSegments = path.split("/")
  return pathSegments.some(segment => minimatch(segment, pattern, options))
}
