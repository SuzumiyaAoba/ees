/**
 * File Upload feature implementation
 * Handles file upload, text extraction, and embedding generation
 */

import { OpenAPIHono } from "@hono/zod-openapi"
import { Effect } from "effect"
import {
  EmbeddingApplicationService,
  processFiles,
  type FileProcessorError,
  createPinoLogger,
  createLoggerConfig,
} from "@ees/core"
import {
  uploadFilesRoute,
  type UploadResponse,
  type UploadResultItem,
} from "./api/route"

/**
 * Logger instance for upload feature
 */
const logger = createPinoLogger(createLoggerConfig())

/**
 * File upload feature app with handlers
 */
export const uploadApp = new OpenAPIHono()

/**
 * Handler for uploading files and generating embeddings
 */
uploadApp.openapi(uploadFilesRoute, async (c) => {
  try {
    // Import AppLayer dynamically
    const { AppLayer } = await import("@/app/providers/main")

    // Parse multipart form data
    const body = await c.req.parseBody()

    // Extract files and model name
    const files: File[] = []
    let modelName: string | undefined

    // Handle both single file and multiple files
    if (body['file']) {
      if (Array.isArray(body['file'])) {
        files.push(...body['file'].filter((f): f is File => f instanceof File))
      } else if (body['file'] instanceof File) {
        files.push(body['file'])
      }
    }

    // Extract model name if provided
    if (body['model_name'] && typeof body['model_name'] === 'string') {
      modelName = body['model_name']
    }

    // Validate that files were provided
    if (files.length === 0) {
      return c.json(
        { error: "No files provided or files are invalid" },
        400
      )
    }

    const uploadProgram = Effect.gen(function* () {
      const appService = yield* EmbeddingApplicationService

      // Process files to extract text content
      const fileResults = yield* processFiles(files, {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxChunkSize: 8000,
        enableChunking: false,
      }).pipe(
        Effect.catchAll((errors: FileProcessorError[]) => {
          // Log errors but continue with successful files
          logger.warn({
            errorCount: errors.length,
            errors: errors.map(e => ({ filename: e.filename, message: e.message }))
          }, "Some files failed to process")
          return Effect.succeed([])
        })
      )

      // Generate embeddings for each processed file
      const results: UploadResultItem[] = []
      let successful = 0
      let failed = 0

      for (const fileResult of fileResults) {
        try {
          // Create embedding for file content (with optional conversion info)
          const embedding = yield* appService.createEmbedding({
            uri: fileResult.filename,
            text: fileResult.content,
            modelName,
            originalContent: fileResult.originalContent,
            convertedFormat: fileResult.convertedFormat,
          })

          results.push({
            id: embedding.id,
            uri: embedding.uri,
            status: "success",
          })
          successful++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          results.push({
            uri: fileResult.filename,
            status: "error",
            error: errorMessage,
          })
          failed++
        }
      }

      // Handle case where no files were successfully processed
      if (fileResults.length === 0) {
        // Try to get error information from file processing
        const processingErrors = yield* processFiles(files, {
          maxFileSize: 10 * 1024 * 1024,
          maxChunkSize: 8000,
          enableChunking: false,
        }).pipe(
          Effect.flip,
          Effect.catchAll(() => Effect.succeed([]))
        )

        for (const file of files) {
          const error = processingErrors.find((e: FileProcessorError) =>
            e && typeof e === 'object' && 'filename' in e && e.filename === file.name
          )
          results.push({
            uri: file.name,
            status: "error",
            error: error?.message || "Failed to process file",
          })
          failed++
        }
      }

      const response: UploadResponse = {
        successful,
        failed,
        results,
        model_name: modelName || "default",
        message: successful > 0
          ? `Successfully processed ${successful} file(s)`
          : "All files failed to process",
      }

      return response
    })

    const result = await Effect.runPromise(
      uploadProgram.pipe(Effect.provide(AppLayer)) as Effect.Effect<UploadResponse, Error, never>
    )

    return c.json(result, 200)
  } catch (error) {
    logger.error({ error: String(error) }, "Unexpected upload error")
    return c.json(
      { error: "Internal server error during file upload" },
      500
    )
  }
})