import { Effect } from "effect"
import {
  EmbeddingVectorSchema,
  StoredEmbeddingDataSchema,
} from "@/entities/embedding/model/openapi"

export class EmbeddingDataParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "EmbeddingDataParseError"
    this.cause = cause
  }
}

/**
 * Safely parse stored embedding data from database
 * Handles F32_BLOB (ArrayBuffer), Uint8Array, and string formats with proper validation
 */
export const parseStoredEmbeddingData = (
  data: unknown
): Effect.Effect<number[], EmbeddingDataParseError> =>
  Effect.gen(function* () {
    let parsedData: unknown

    try {
      if (data instanceof ArrayBuffer) {
        // Handle libSQL F32_BLOB format (ArrayBuffer with 32-bit floats)
        const float32Array = new Float32Array(data)
        parsedData = Array.from(float32Array)
      } else if (data instanceof Uint8Array) {
        // Handle Uint8Array - could be F32_BLOB or legacy JSON
        // Try to interpret as F32_BLOB first (must be multiple of 4 bytes and reasonable size)
        if (data.length % 4 === 0 && data.length >= 16) {
          // Length is multiple of 4 and at least 16 bytes (4 floats minimum), likely F32_BLOB
          const float32Array = new Float32Array(data.buffer, data.byteOffset, data.length / 4)
          parsedData = Array.from(float32Array)
        } else {
          // Fallback to legacy JSON format
          const jsonString = Buffer.from(data).toString()
          parsedData = JSON.parse(jsonString)
        }
      } else if (typeof data === "string") {
        // Parse JSON string directly (legacy format)
        parsedData = JSON.parse(data)
      } else {
        // First validate the raw data format for other legacy formats
        const validationResult = StoredEmbeddingDataSchema.safeParse(data)
        if (!validationResult.success) {
          return yield* Effect.fail(
            new EmbeddingDataParseError(
              `Invalid stored embedding data format: ${validationResult.error.message}`,
              validationResult.error
            )
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
          return yield* Effect.fail(
            new EmbeddingDataParseError(
              "Stored data must be ArrayBuffer, Uint8Array, or string"
            )
          )
        }
      }
    } catch (error) {
      return yield* Effect.fail(
        new EmbeddingDataParseError(
          "Failed to parse embedding data from stored format",
          error
        )
      )
    }

    // Validate the parsed embedding vector
    const vectorValidation = EmbeddingVectorSchema.safeParse(parsedData)
    if (!vectorValidation.success) {
      return yield* Effect.fail(
        new EmbeddingDataParseError(
          `Invalid embedding vector format: ${vectorValidation.error.message}`,
          vectorValidation.error
        )
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
        new EmbeddingDataParseError(
          `Invalid embedding vector: ${validation.error.message}`,
          validation.error
        )
      )
    }
    return validation.data
  })
