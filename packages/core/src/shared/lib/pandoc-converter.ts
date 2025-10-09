/**
 * Pandoc Converter Utility
 * Converts various document formats to Markdown using pandoc
 */

import { Effect } from "effect"
import { spawn } from "node:child_process"

/**
 * Pandoc conversion error
 */
export class PandocConversionError {
  readonly _tag = "PandocConversionError"
  constructor(
    public readonly message: string,
    public readonly sourceFormat: string,
    public readonly filename: string = "unknown",
    public readonly cause?: unknown
  ) {}
}

/**
 * Pandoc not available error
 */
export class PandocNotAvailableError {
  readonly _tag = "PandocNotAvailableError"
  constructor(
    public readonly message: string,
    public readonly filename: string = "unknown"
  ) {}
}

export type PandocError = PandocConversionError | PandocNotAvailableError

/**
 * Check if pandoc is available on the system
 */
export const isPandocAvailable = (): Effect.Effect<boolean, never> =>
  Effect.gen(function* () {
    try {
      yield* Effect.tryPromise({
        try: () =>
          new Promise<void>((resolve, reject) => {
            const process = spawn("pandoc", ["--version"])
            process.on("error", reject)
            process.on("close", (code) => {
              if (code === 0) resolve()
              else reject(new Error(`pandoc exited with code ${code}`))
            })
          }),
        catch: () => new Error("Pandoc not available"),
      })
      return true
    } catch {
      return false
    }
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))

/**
 * Convert org-mode content to Markdown using pandoc
 * @param orgContent - The org-mode text content
 * @returns Markdown formatted text
 */
export const convertOrgToMarkdown = (
  orgContent: string
): Effect.Effect<string, PandocError> =>
  Effect.gen(function* () {
    // Check if pandoc is available
    const available = yield* isPandocAvailable()
    if (!available) {
      return yield* Effect.fail(
        new PandocNotAvailableError(
          "Pandoc is not installed or not available in PATH. Please install pandoc to convert org files."
        )
      )
    }

    // Convert using pandoc with stdin/stdout
    const result = yield* Effect.tryPromise({
      try: () =>
        new Promise<string>((resolve, reject) => {
          const pandocProcess = spawn("pandoc", ["-f", "org", "-t", "markdown"])

          let stdout = ""
          let stderr = ""

          pandocProcess.stdout.on("data", (data) => {
            stdout += data.toString()
          })

          pandocProcess.stderr.on("data", (data) => {
            stderr += data.toString()
          })

          pandocProcess.on("error", reject)

          pandocProcess.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(`Pandoc exited with code ${code}. stderr: ${stderr}`))
            } else {
              if (stderr) {
                console.warn("Pandoc stderr output:", stderr)
              }
              resolve(stdout)
            }
          })

          // Write input to stdin and close it
          pandocProcess.stdin.write(orgContent)
          pandocProcess.stdin.end()

          // Add timeout
          setTimeout(() => {
            pandocProcess.kill()
            reject(new Error("Pandoc conversion timeout after 30 seconds"))
          }, 30000)
        }),
      catch: (error) =>
        new PandocConversionError(
          `Failed to convert org to markdown: ${error}`,
          "org",
          "unknown",
          error
        ),
    })

    // Validate that we got content back
    if (!result || result.trim().length === 0) {
      return yield* Effect.fail(
        new PandocConversionError(
          "Pandoc conversion resulted in empty output",
          "org"
        )
      )
    }

    return result.trim()
  })

/**
 * Generic pandoc conversion function
 * @param content - Source content
 * @param fromFormat - Source format (e.g., "org", "rst", "textile")
 * @param toFormat - Target format (default: "markdown")
 * @returns Converted content
 */
export const convertWithPandoc = (
  content: string,
  fromFormat: string,
  toFormat: string = "markdown"
): Effect.Effect<string, PandocError> =>
  Effect.gen(function* () {
    // Check if pandoc is available
    const available = yield* isPandocAvailable()
    if (!available) {
      return yield* Effect.fail(
        new PandocNotAvailableError(
          "Pandoc is not installed or not available in PATH. Please install pandoc to convert files."
        )
      )
    }

    // Convert using pandoc
    const result = yield* Effect.tryPromise({
      try: () =>
        new Promise<string>((resolve, reject) => {
          const pandocProcess = spawn("pandoc", ["-f", fromFormat, "-t", toFormat])

          let stdout = ""
          let stderr = ""

          pandocProcess.stdout.on("data", (data) => {
            stdout += data.toString()
          })

          pandocProcess.stderr.on("data", (data) => {
            stderr += data.toString()
          })

          pandocProcess.on("error", reject)

          pandocProcess.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(`Pandoc exited with code ${code}. stderr: ${stderr}`))
            } else {
              if (stderr) {
                console.warn("Pandoc stderr output:", stderr)
              }
              resolve(stdout)
            }
          })

          // Write input to stdin and close it
          pandocProcess.stdin.write(content)
          pandocProcess.stdin.end()

          // Add timeout
          setTimeout(() => {
            pandocProcess.kill()
            reject(new Error("Pandoc conversion timeout after 30 seconds"))
          }, 30000)
        }),
      catch: (error) =>
        new PandocConversionError(
          `Failed to convert ${fromFormat} to ${toFormat}: ${error}`,
          fromFormat,
          "unknown",
          error
        ),
    })

    // Validate output
    if (!result || result.trim().length === 0) {
      return yield* Effect.fail(
        new PandocConversionError(
          "Pandoc conversion resulted in empty output",
          fromFormat
        )
      )
    }

    return result.trim()
  })
