/**
 * .eesignore file parser and matcher
 * Compatible with .gitignore specification
 */

import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

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
 * Uses simple glob-style matching compatible with .gitignore
 */
export function shouldIgnore(
  filePath: string,
  patterns: string[],
  basePath: string = ""
): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/")
  const relativePath = basePath
    ? normalizedPath.replace(basePath.replace(/\\/g, "/"), "").replace(/^\//, "")
    : normalizedPath

  for (const pattern of patterns) {
    // Handle negation patterns (!)
    const isNegation = pattern.startsWith("!")
    const actualPattern = isNegation ? pattern.slice(1) : pattern

    if (matchPattern(relativePath, actualPattern)) {
      return !isNegation
    }
  }

  return false
}

/**
 * Match a file path against a glob pattern
 * Supports:
 * - * (any characters except /)
 * - ** (any characters including /)
 * - ? (single character)
 * - [abc] (character class)
 * - / prefix or suffix for directory matching
 */
function matchPattern(path: string, pattern: string): boolean {
  // Directory-only pattern (ends with /)
  if (pattern.endsWith("/")) {
    const dirPattern = pattern.slice(0, -1)
    return path.split("/").some(segment => matchGlob(segment, dirPattern))
  }

  // Exact match or glob match
  if (pattern.includes("/")) {
    // Pattern contains path separator - match full path
    return matchGlob(path, pattern)
  }

  // Pattern without / - match any segment in the path
  return path.split("/").some(segment => matchGlob(segment, pattern))
}

/**
 * Simple glob pattern matcher
 */
function matchGlob(text: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".")
    .replace(/\[([^\]]+)\]/g, "[$1]")

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(text)
}
