import { Effect } from "effect"
import {
  EmbeddingVectorSchema,
  StoredEmbeddingDataSchema,
} from "../schemas/openapi"

export class EmbeddingDataParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "EmbeddingDataParseError"
    this.cause = cause
  }
}

/**
 * Safely parse stored embedding data from database
 * Handles both Uint8Array and string formats with proper validation
 */
export const parseStoredEmbeddingData = (
  data: unknown
): Effect.Effect<number[], EmbeddingDataParseError> =>
  Effect.gen(function* () {
    // First validate the raw data format
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
    let parsedData: unknown

    try {
      if (storedData instanceof Uint8Array) {
        // Convert Uint8Array to string, then parse JSON
        const jsonString = Buffer.from(storedData).toString()
        parsedData = JSON.parse(jsonString)
      } else if (typeof storedData === "string") {
        // Parse JSON string directly
        parsedData = JSON.parse(storedData)
      } else {
        return yield* Effect.fail(
          new EmbeddingDataParseError(
            "Stored data must be Uint8Array or string"
          )
        )
      }
    } catch (error) {
      return yield* Effect.fail(
        new EmbeddingDataParseError(
          "Failed to parse JSON from stored embedding data",
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
