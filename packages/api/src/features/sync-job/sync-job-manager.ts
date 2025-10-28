/**
 * Sync Job Manager
 * Manages background sync jobs execution
 */
import { Effect } from "effect"
import { AppLayer } from "@/app/providers/main"
import { SyncJobRepository } from "./sync-job-repository"
import { processSyncJob } from "./sync-worker"
import type { UploadDirectory } from "@ees/core"

// Store running jobs to prevent duplicates
const runningJobs = new Set<number>()

/**
 * Start a background sync job
 * Returns the job ID immediately and processes in background
 */
export async function startBackgroundSync(
  directoryId: number,
  directory: UploadDirectory
): Promise<number> {
  const program = Effect.gen(function* () {
    // Create job record
    const job = yield* SyncJobRepository.create(directoryId)
    const jobId = job.id

    // Start background processing (fire and forget)
    // Use setImmediate to ensure this runs async
    setImmediate(() => {
      if (runningJobs.has(jobId)) {
        console.log(`Job ${jobId} is already running, skipping`)
        return
      }

      runningJobs.add(jobId)

      processSyncJob(jobId, directory)
        .then(() => {
          console.log(`Job ${jobId} completed successfully`)
        })
        .catch((error) => {
          console.error(`Job ${jobId} failed:`, error)
        })
        .finally(() => {
          runningJobs.delete(jobId)
        })
    })

    return jobId
  })

  return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
}

/**
 * Get sync job status
 */
export async function getSyncJobStatus(jobId: number) {
  const program = Effect.gen(function* () {
    const job = yield* SyncJobRepository.findById(jobId)

    if (!job) {
      return null
    }

    return {
      id: job.id,
      directoryId: job.directoryId,
      status: job.status,
      totalFiles: job.totalFiles || 0,
      processedFiles: job.processedFiles || 0,
      createdFiles: job.createdFiles || 0,
      updatedFiles: job.updatedFiles || 0,
      failedFiles: job.failedFiles || 0,
      failedFilePaths: job.failedFilePaths,
      currentFile: job.currentFile,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }
  })

  return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
}

/**
 * Get latest sync job for a directory
 */
export async function getLatestSyncJob(directoryId: number) {
  const program = Effect.gen(function* () {
    const job = yield* SyncJobRepository.findLatestByDirectoryId(directoryId)

    if (!job) {
      return null
    }

    return {
      id: job.id,
      directoryId: job.directoryId,
      status: job.status,
      totalFiles: job.totalFiles || 0,
      processedFiles: job.processedFiles || 0,
      createdFiles: job.createdFiles || 0,
      updatedFiles: job.updatedFiles || 0,
      failedFiles: job.failedFiles || 0,
      failedFilePaths: job.failedFilePaths,
      currentFile: job.currentFile,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }
  })

  return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
}

/**
 * Cancel all incomplete jobs for a directory
 */
export async function cancelIncompleteJobs(directoryId: number) {
  const program = Effect.gen(function* () {
    yield* SyncJobRepository.cancelIncompleteJobs(directoryId)
  })

  return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
}
