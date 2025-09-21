/**
 * File Processing Service
 * Handles file content extraction and text processing for various file formats
 */

import { Effect } from "effect"

/**
 * Supported file types for text extraction
 */
export const SUPPORTED_FILE_TYPES = {
  TEXT: ['.txt', '.md', '.markdown', '.log', '.csv', '.json', '.yaml', '.yml'],
  DOCUMENT: ['.pdf'], // Future: Add more document types
  CODE: ['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h'],
} as const

/**
 * File processing result
 */
export interface FileProcessingResult {
  readonly filename: string
  readonly content: string
  readonly contentType: string
  readonly size: number
  readonly extractedChunks?: string[]
}

/**
 * File processing error types
 */
export class UnsupportedFileTypeError {
  readonly _tag = "UnsupportedFileTypeError"
  constructor(
    public readonly message: string,
    public readonly filename: string,
    public readonly mimeType: string
  ) {}
}

export class FileProcessingError {
  readonly _tag = "FileProcessingError"
  constructor(
    public readonly message: string,
    public readonly filename: string,
    public readonly cause?: unknown
  ) {}
}

export class FileTooLargeError {
  readonly _tag = "FileTooLargeError"
  constructor(
    public readonly message: string,
    public readonly filename: string,
    public readonly size: number,
    public readonly maxSize: number
  ) {}
}

export type FileProcessorError =
  | UnsupportedFileTypeError
  | FileProcessingError
  | FileTooLargeError

/**
 * File processor configuration
 */
export interface FileProcessorConfig {
  readonly maxFileSize: number // in bytes
  readonly maxChunkSize: number // for text chunking
  readonly enableChunking: boolean
}

const DEFAULT_CONFIG: FileProcessorConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxChunkSize: 8000, // characters
  enableChunking: false,
}

/**
 * Get file extension from filename
 */
const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase()
}

/**
 * Check if file type is supported
 */
const isSupportedFileType = (filename: string, mimeType: string): boolean => {
  const extension = getFileExtension(filename)

  // Check by extension
  const allSupportedExtensions = [
    ...SUPPORTED_FILE_TYPES.TEXT,
    ...SUPPORTED_FILE_TYPES.DOCUMENT,
    ...SUPPORTED_FILE_TYPES.CODE,
  ]

  if (allSupportedExtensions.includes(extension)) {
    return true
  }

  // Check by MIME type for common text types
  const supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/javascript',
    'text/typescript',
    'application/javascript',
    'text/python',
    'text/x-python',
  ]

  return supportedMimeTypes.some(type => mimeType.startsWith(type))
}

/**
 * Extract text content from file based on its type
 */
const extractTextContent = async (
  file: File,
  _config: FileProcessorConfig
): Promise<string> => {
  const extension = getFileExtension(file.name)

  // For now, we'll handle text-based files directly
  // Future: Add PDF processing, document parsing, etc.

  if (SUPPORTED_FILE_TYPES.TEXT.includes(extension) ||
      SUPPORTED_FILE_TYPES.CODE.includes(extension) ||
      file.type.startsWith('text/')) {
    return await file.text()
  }

  // Future: Add PDF processing
  if (extension === '.pdf') {
    throw new Error('PDF processing not yet implemented')
  }

  // Fallback: try to read as text
  try {
    return await file.text()
  } catch (error) {
    throw new Error(`Failed to extract text from ${file.name}: ${error}`)
  }
}

/**
 * Split text into chunks for processing
 */
const chunkText = (text: string, maxChunkSize: number): string[] => {
  if (text.length <= maxChunkSize) {
    return [text]
  }

  const chunks: string[] = []
  const paragraphs = text.split(/\n\s*\n/) // Split by double newlines

  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()
    if (!trimmedParagraph) continue

    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmedParagraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }

      // If single paragraph is too large, split by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        const sentences = trimmedParagraph.split(/[.!?]+\s+/)
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk) {
              chunks.push(currentChunk.trim())
              currentChunk = ''
            }
          }
          currentChunk += sentence + '. '
        }
      } else {
        currentChunk = trimmedParagraph
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

/**
 * Process a single file and extract text content
 */
export const processFile = (
  file: File,
  config: FileProcessorConfig = DEFAULT_CONFIG
): Effect.Effect<FileProcessingResult, FileProcessorError> =>
  Effect.gen(function* () {
    // Check file size
    if (file.size > config.maxFileSize) {
      return yield* Effect.fail(
        new FileTooLargeError(
          `File ${file.name} is too large (${file.size} bytes, max ${config.maxFileSize} bytes)`,
          file.name,
          file.size,
          config.maxFileSize
        )
      )
    }

    // Check if file type is supported
    if (!isSupportedFileType(file.name, file.type)) {
      return yield* Effect.fail(
        new UnsupportedFileTypeError(
          `Unsupported file type: ${file.name} (${file.type})`,
          file.name,
          file.type
        )
      )
    }

    // Extract text content
    const content = yield* Effect.tryPromise({
      try: () => extractTextContent(file, config),
      catch: (error) => new FileProcessingError(
        `Failed to process file ${file.name}`,
        file.name,
        error
      ),
    })

    // Validate extracted content
    if (!content || content.trim().length === 0) {
      return yield* Effect.fail(
        new FileProcessingError(
          `No text content found in file ${file.name}`,
          file.name
        )
      )
    }

    // Create result object
    const result: FileProcessingResult = {
      filename: file.name,
      content: content.trim(),
      contentType: file.type,
      size: file.size,
      ...(config.enableChunking && {
        extractedChunks: chunkText(content, config.maxChunkSize)
      })
    }

    return result
  })

/**
 * Process multiple files
 */
export const processFiles = (
  files: File[],
  config: FileProcessorConfig = DEFAULT_CONFIG
): Effect.Effect<FileProcessingResult[], FileProcessorError[]> =>
  Effect.all(
    files.map(file => processFile(file, config)),
    { mode: "either" }
  ).pipe(
    Effect.map(results => {
      const successes: FileProcessingResult[] = []
      const errors: FileProcessorError[] = []

      for (const result of results) {
        if (result._tag === "Left") {
          errors.push(result.left)
        } else {
          successes.push(result.right)
        }
      }

      return { successes, errors }
    }),
    Effect.flatMap(({ successes, errors }) => {
      if (errors.length > 0 && successes.length === 0) {
        return Effect.fail(errors)
      }
      return Effect.succeed(successes)
    })
  )