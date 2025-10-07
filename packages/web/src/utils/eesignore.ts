/**
 * Client-side .eesignore file parser and matcher
 * Compatible with .gitignore specification
 */

/**
 * Parse .eesignore file content into patterns
 */
export function parseIgnorePatterns(content: string): string[] {
  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
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
 */
export function shouldIgnore(
  filePath: string,
  patterns: string[]
): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/")

  // First pass: check for negation patterns (they override regular patterns)
  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      const actualPattern = pattern.slice(1)
      if (matchPattern(normalizedPath, actualPattern)) {
        return false // Negation pattern matches, so don't ignore
      }
    }
  }

  // Second pass: check for regular patterns
  for (const pattern of patterns) {
    if (!pattern.startsWith("!")) {
      if (matchPattern(normalizedPath, pattern)) {
        return true // Regular pattern matches, so ignore
      }
    }
  }

  return false
}

/**
 * Match a file path against a glob pattern
 */
function matchPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith("/")) {
    const dirPattern = pattern.slice(0, -1)
    return path.split("/").some(segment => matchGlob(segment, dirPattern))
  }

  if (pattern.includes("/")) {
    return matchGlob(path, pattern)
  }

  // For patterns without "/", only match if the pattern appears as a directory name
  // or if it's a file pattern that matches the filename
  const pathSegments = path.split("/")
  return pathSegments.some(segment => matchGlob(segment, pattern))
}

/**
 * Simple glob pattern matcher
 */
function matchGlob(text: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<GLOBSTAR>>>/g, ".*")
    .replace(/\?/g, ".")
    .replace(/\[([^\]]+)\]/g, "[$1]")

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(text)
}

/**
 * Find .eesignore file in FileList and parse it
 */
export async function loadEesignoreFromFiles(files: FileList): Promise<string[]> {
  const eesignoreFile = Array.from(files).find(
    file => file.webkitRelativePath.endsWith('.eesignore') || file.name === '.eesignore'
  )

  if (eesignoreFile) {
    const content = await eesignoreFile.text()
    return parseIgnorePatterns(content)
  }

  return getDefaultIgnorePatterns()
}

/**
 * Filter files based on ignore patterns
 */
export function filterFiles(files: File[], patterns: string[]): File[] {
  return files.filter(file => {
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    return !shouldIgnore(path, patterns)
  })
}
