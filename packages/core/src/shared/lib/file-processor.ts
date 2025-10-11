/**
 * File Processing Service
 * Handles file content extraction and text processing for various file formats
 */

import { Effect } from "effect"
import * as pdfParse from "pdf-parse"
import { convertOrgToMarkdown, type PandocError } from "./pandoc-converter"

/**
 * Supported file types for text extraction
 */
export const SUPPORTED_FILE_TYPES = {
  TEXT: ['.txt', '.md', '.markdown', '.log', '.csv', '.json', '.yaml', '.yml', '.org'],
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
  readonly originalContent?: string // Original content before conversion (e.g., org-mode text)
  readonly convertedFormat?: string // Format after conversion (e.g., "markdown")
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
  | PandocError

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
 * PDF processing safety limits to prevent memory exhaustion and infinite processing
 */
const PDF_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max PDF file size
  MAX_TEXT_LENGTH: 10 * 1024 * 1024, // 10MB max extracted text
  PROCESSING_TIMEOUT: 30000, // 30 seconds timeout
} as const

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

  // Many browsers/clients send unknown text files as application/octet-stream.
  // Allow best-effort processing for octet-stream and defer actual validation
  // to the text extraction step.
  if (mimeType === 'application/octet-stream') {
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
 * Extract text from PDF file using pdf-parse library with safety limits
 * Includes file size validation, text length limits, and timeout protection
 */
const extractTextFromPDF = async (file: File, config?: FileProcessorConfig): Promise<string> => {
  const maxFileSize = config?.maxFileSize || PDF_LIMITS.MAX_FILE_SIZE

  // Check file size before processing
  if (file.size > maxFileSize) {
    throw new Error(`PDF file too large: ${file.size} bytes (max: ${maxFileSize} bytes)`)
  }

  try {
    // Wrap PDF processing with timeout protection
    const processingPromise = (async () => {
      const buffer = await file.arrayBuffer()

      // Additional buffer size validation
      if (buffer.byteLength !== file.size) {
        throw new Error('File buffer size mismatch - file may be corrupted')
      }

      const data = await pdfParse.default(Buffer.from(buffer))
      return data.text
    })()

    // Race between PDF processing and timeout
    const textContent = await Promise.race([
      processingPromise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`PDF processing timeout after ${PDF_LIMITS.PROCESSING_TIMEOUT}ms`)),
          PDF_LIMITS.PROCESSING_TIMEOUT
        )
      })
    ])

    // Validate extracted text length
    if (textContent.length > PDF_LIMITS.MAX_TEXT_LENGTH) {
      throw new Error(
        `Extracted text too large: ${textContent.length} characters (max: ${PDF_LIMITS.MAX_TEXT_LENGTH} characters)`
      )
    }

    // Clean up the extracted text
    const cleanText = textContent
      .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .trim()

    if (!cleanText || cleanText.length === 0) {
      throw new Error('No text content found in PDF file')
    }

    return cleanText
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`)
  }
}

/**
 * Extract text content from file based on its type
 * Returns an object with content and optional original content for converted files
 */
const extractTextContent = async (
  file: File,
  _config: FileProcessorConfig
): Promise<{ content: string; originalContent?: string; convertedFormat?: string }> => {
  const extension = getFileExtension(file.name)

  // Special handling for org files - convert to markdown using pandoc
  if (extension === '.org') {
    const orgContent = await file.text()

    // Attempt conversion with pandoc - propagate errors to caller
    const markdown = await Effect.runPromise(convertOrgToMarkdown(orgContent))
    return {
      content: markdown,
      originalContent: orgContent,
      convertedFormat: 'markdown'
    }
  }

  // Process different file types based on their extensions and content
  if (SUPPORTED_FILE_TYPES.TEXT.includes(extension) ||
      SUPPORTED_FILE_TYPES.CODE.includes(extension) ||
      file.type.startsWith('text/')) {
    const content = await file.text()
    return { content }
  }

  // Document processing (PDF, etc.)
  if (SUPPORTED_FILE_TYPES.DOCUMENT.includes(extension)) {
    if (extension === '.pdf') {
      const content = await extractTextFromPDF(file, _config)
      return { content }
    }
    // Future: Add support for other document types (docx, odt, etc.)
    throw new Error(`Document type ${extension} is not yet supported`)
  }

  // Fallback: try to read as text
  try {
    const content = await file.text()
    return { content }
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

    // Extract text content (with optional conversion)
    const extractResult = yield* Effect.tryPromise({
      try: () => extractTextContent(file, config),
      catch: (error) => new FileProcessingError(
        `Failed to process file ${file.name}`,
        file.name,
        error
      ),
    })

    // Validate extracted content
    if (!extractResult.content || extractResult.content.trim().length === 0) {
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
      content: extractResult.content.trim(),
      contentType: file.type,
      size: file.size,
      ...(extractResult.originalContent && { originalContent: extractResult.originalContent }),
      ...(extractResult.convertedFormat && { convertedFormat: extractResult.convertedFormat }),
      ...(config.enableChunking && {
        extractedChunks: chunkText(extractResult.content, config.maxChunkSize)
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