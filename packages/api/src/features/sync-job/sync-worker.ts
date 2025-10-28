/**
 * Sync Worker
 * Background worker for processing directory synchronization jobs
 * Runs independently of HTTP connections
 */
import { Effect } from "effect"
import { AppLayer } from "@/app/providers/main"
import { SyncJobRepository } from "./sync-job-repository"
import { collectFilesFromDirectory, processFile } from "@ees/core"
import { readFile } from "node:fs/promises"
import type { UploadDirectory } from "@ees/core"
import type { TaskType } from "@ees/core"

/**
 * Process a single sync job
 */
export async function processSyncJob(
  jobId: number,
  directory: UploadDirectory
): Promise<void> {
  const program = Effect.gen(function* () {
    try {
      // Mark as running
      yield* SyncJobRepository.markAsRunning(jobId)

      // Get embedding service from AppLayer
      const { EmbeddingApplicationService } = yield* Effect.promise(() => import("@ees/core"))
      const embeddingService = yield* EmbeddingApplicationService

      // Collect files from directory
      const collectedFiles = yield* collectFilesFromDirectory(directory.path)

      // Update total files
      yield* SyncJobRepository.update(jobId, {
        totalFiles: collectedFiles.length,
      })

      // Process each file
      let filesCreated = 0
      let filesUpdated = 0
      let filesFailed = 0
      const failedFilePaths: Array<{ path: string; error: string }> = []

      for (let i = 0; i < collectedFiles.length; i++) {
        const collectedFile = collectedFiles[i]
        if (!collectedFile) {
          continue
        }

        try {
          // Update progress
          yield* SyncJobRepository.update(jobId, {
            processedFiles: i + 1,
            createdFiles: filesCreated,
            updatedFiles: filesUpdated,
            failedFiles: filesFailed,
            failedFilePaths: JSON.stringify(failedFilePaths),
            currentFile: collectedFile.relativePath,
          })

          // Read file content
          const buffer = yield* Effect.tryPromise({
            try: () => readFile(collectedFile.absolutePath),
            catch: (error) => {
              const errorMessage = `Failed to read file: ${String(error)}`
              filesFailed++
              failedFilePaths.push({
                path: collectedFile.relativePath,
                error: errorMessage,
              })
              return new Error(errorMessage)
            },
          })

          // Create a File object from buffer
          const file = new File(
            [new Uint8Array(buffer)],
            collectedFile.relativePath,
            {
              type: "application/octet-stream",
            }
          )

          // Process file to extract text
          const fileResult = yield* processFile(file).pipe(
            Effect.catchAll((error) =>
              Effect.sync(() => {
                filesFailed++
                failedFilePaths.push({
                  path: collectedFile.relativePath,
                  error: `Failed to process file: ${String(error)}`,
                })
                return null
              })
            )
          )

          if (!fileResult) {
            continue
          }

          // Parse task types if provided
          const taskTypes = directory.taskTypes
            ? (typeof directory.taskTypes === "string"
                ? JSON.parse(directory.taskTypes) as TaskType[]
                : directory.taskTypes as TaskType[])
            : undefined

          // Create embedding for file content
          yield* embeddingService.createEmbedding(
            collectedFile.relativePath,
            fileResult.content,
            directory.modelName,
            taskTypes,
            undefined,
            fileResult.originalContent,
            fileResult.convertedFormat
          ).pipe(
            Effect.catchAll((error) =>
              Effect.sync(() => {
                filesFailed++
                failedFilePaths.push({
                  path: collectedFile.relativePath,
                  error: `Failed to create embedding: ${String(error)}`,
                })
              })
            )
          )

          filesCreated++
        } catch (error) {
          console.error(`Failed to process file ${collectedFile.relativePath}:`, error)
          filesFailed++
          failedFilePaths.push({
            path: collectedFile.relativePath,
            error: String(error),
          })
        }
      }

      // Mark as completed
      yield* SyncJobRepository.markAsCompleted(jobId)

      // Final progress update
      yield* SyncJobRepository.update(jobId, {
        processedFiles: collectedFiles.length,
        createdFiles: filesCreated,
        updatedFiles: filesUpdated,
        failedFiles: filesFailed,
        failedFilePaths: JSON.stringify(failedFilePaths),
        currentFile: null,
      })
    } catch (error) {
      // Mark as failed
      yield* SyncJobRepository.markAsFailed(
        jobId,
        error instanceof Error ? error.message : String(error)
      )
    }
  }) as Effect.Effect<void, unknown, never>

  // Run the program with app layer
  await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
}
