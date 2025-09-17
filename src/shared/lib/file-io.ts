/**
 * File I/O utilities for CLI applications
 * Provides Effect-based file operations with proper error handling
 */

import { readFile } from "node:fs/promises"
import { createInterface } from "node:readline"
import { Effect } from "effect"

/**
 * Read text content from a file
 */
export function readTextFile(filePath: string): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: () => readFile(filePath, "utf-8"),
    catch: (error) => new Error(`Failed to read file ${filePath}: ${error}`),
  })
}

/**
 * Read text from stdin
 */
export function readStdin(): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: async () => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      const lines: string[] = []

      for await (const line of rl) {
        lines.push(line)
      }

      return lines.join("\n")
    },
    catch: (error) => new Error(`Failed to read from stdin: ${error}`),
  })
}

/**
 * Parse batch file containing JSON entries
 */
export interface BatchEntry {
  uri: string
  text: string
}

export function parseBatchFile(
  filePath: string
): Effect.Effect<BatchEntry[], Error> {
  return Effect.gen(function* () {
    const content = yield* readTextFile(filePath)

    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          if (typeof item !== "object" || !item.uri || !item.text) {
            throw new Error(
              `Invalid batch entry at index ${index}: must have 'uri' and 'text' fields`
            )
          }
          return {
            uri: String(item.uri),
            text: String(item.text),
          }
        })
      }

      // If not an array, try to parse as newline-delimited JSON
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim())
      return lines.map((line, index) => {
        try {
          const item = JSON.parse(line)
          if (typeof item !== "object" || !item.uri || !item.text) {
            throw new Error(
              `Invalid batch entry at line ${index + 1}: must have 'uri' and 'text' fields`
            )
          }
          return {
            uri: String(item.uri),
            text: String(item.text),
          }
        } catch (parseError) {
          throw new Error(`Invalid JSON at line ${index + 1}: ${parseError}`)
        }
      })
    } catch (parseError) {
      return yield* Effect.fail(
        new Error(`Failed to parse batch file ${filePath}: ${parseError}`)
      )
    }
  })
}
