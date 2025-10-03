import { Effect } from "effect"
import {
  EmbeddingVectorSchema,
  StoredEmbeddingDataSchema,
} from "@/entities/embedding/model/openapi"
import { EmbeddingDataParseError } from "@/shared/errors/database"

/**
 * Safely parse stored embedding data from database
 *
 * Handles multiple storage formats for backward compatibility:
 * - F32_BLOB: Modern format using ArrayBuffer with 32-bit floats (space-efficient, 4 bytes/float)
 * - JSON string: Legacy format storing vector as JSON array (human-readable but larger)
 * - Uint8Array: Could be either format, requires heuristic detection
 *
 * Business Context:
 * - Database schema evolution: migrated from JSON to F32_BLOB for better performance
 * - Need to read old embeddings while writing new ones in optimized format
 * - Format detection ensures transparent migration without data loss
 */
export const parseStoredEmbeddingData = (
  data: unknown
): Effect.Effect<number[], EmbeddingDataParseError> =>
  Effect.gen(function* () {
    let parsedData: unknown

    try {
      if (data instanceof ArrayBuffer) {
        // Modern F32_BLOB format: libSQL returns ArrayBuffer for BLOB columns
        // Each float32 value is 4 bytes, directly interpretable as Float32Array
        // Example: 768-dim vector = 3072 bytes (768 * 4)
        const float32Array = new Float32Array(data)
        parsedData = Array.from(float32Array)
      } else if (data instanceof Uint8Array) {
        // Ambiguous format: Uint8Array could be either F32_BLOB or JSON bytes
        // Use heuristic to detect format:
        // - F32_BLOB: length divisible by 4 (float32 size) and >= 16 bytes (minimum 4 floats)
        // - JSON: typically not aligned to 4-byte boundaries
        if (data.length % 4 === 0 && data.length >= 16) {
          // Interpret as F32_BLOB: create Float32Array view over the Uint8Array buffer
          // Note: byteOffset and length/4 ensure correct alignment for typed array view
          const float32Array = new Float32Array(data.buffer, data.byteOffset, data.length / 4)
          parsedData = Array.from(float32Array)
        } else {
          // Interpret as legacy JSON format: convert bytes to string, then parse
          const jsonString = Buffer.from(data).toString()
          parsedData = JSON.parse(jsonString)
        }
      } else if (typeof data === "string") {
        // Legacy JSON string format: directly parse as JSON array
        // Example: "[0.1, 0.2, 0.3, ...]"
        parsedData = JSON.parse(data)
      } else {
        // Unknown format: validate using Zod schema for legacy format support
        // This handles edge cases where database returns unexpected types
        const validationResult = StoredEmbeddingDataSchema.safeParse(data)
        if (!validationResult.success) {
          return yield* Effect.fail(
            new EmbeddingDataParseError({
              message: `Invalid stored embedding data format: ${validationResult.error.message}`,
              cause: validationResult.error,
            })
          )
        }

        const storedData = validationResult.data

        if (storedData instanceof Uint8Array) {
          // Convert Uint8Array to string, then parse JSON (legacy format)
          const jsonString = Buffer.from(storedData).toString()
          parsedData = JSON.parse(jsonString)
        } else if (typeof storedData === "string") {
          // Parse JSON string directly (legacy format)
          parsedData = JSON.parse(storedData)
        } else {
          // Unsupported format: reject to ensure data integrity
          return yield* Effect.fail(
            new EmbeddingDataParseError({
              message: "Stored data must be ArrayBuffer, Uint8Array, or string",
            })
          )
        }
      }
    } catch (error) {
      // Catch JSON parsing errors, buffer conversion errors, etc.
      // Provides clear error context for debugging data corruption issues
      return yield* Effect.fail(
        new EmbeddingDataParseError({
          message: "Failed to parse embedding data from stored format",
          cause: error,
        })
      )
    }

    // Final validation: ensure parsed data is valid number[] embedding vector
    // Checks for:
    // - Array type (not object, null, undefined)
    // - All elements are numbers (not NaN, Infinity, or non-numeric)
    // - Vector length is reasonable (avoids corrupted data)
    const vectorValidation = EmbeddingVectorSchema.safeParse(parsedData)
    if (!vectorValidation.success) {
      return yield* Effect.fail(
        new EmbeddingDataParseError({
          message: `Invalid embedding vector format: ${vectorValidation.error.message}`,
          cause: vectorValidation.error,
        })
      )
    }

    return vectorValidation.data
  })

/**
 * Safely validate an embedding vector
 */
export const validateEmbeddingVector = (
  data: unknown
): Effect.Effect<number[], EmbeddingDataParseError> =>
  Effect.gen(function* () {
    const validation = EmbeddingVectorSchema.safeParse(data)
    if (!validation.success) {
      return yield* Effect.fail(
        new EmbeddingDataParseError({
          message: `Invalid embedding vector: ${validation.error.message}`,
          cause: validation.error,
        })
      )
    }
    return validation.data
  })
