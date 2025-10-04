/**
 * Input validation for embedding operations
 * Provides type-safe validation with clear error messages
 */

import { Effect } from "effect"
import { DatabaseQueryError } from "@/shared/errors/database"

/**
 * Validate embedding input parameters
 *
 * Business Rules:
 * - URI must contain non-whitespace characters (trimmed length > 0)
 * - Text content must be non-empty (prevents wasted API calls)
 * - URI length capped at 2048 characters (database column constraint)
 *
 * Edge Cases Handled:
 * - Whitespace-only strings are rejected (after trimming)
 * - Very long URIs are rejected before database insertion (prevents SQL errors)
 *
 * @param uri - Unique identifier for the text content
 * @param text - Text content to generate embedding for
 * @returns Effect.void on success, DatabaseQueryError on validation failure
 */
export const validateEmbeddingInput = (
  uri: string,
  text: string
): Effect.Effect<void, DatabaseQueryError> => {
  // Check URI is not empty or whitespace-only
  if (!uri.trim()) {
    return Effect.fail(
      new DatabaseQueryError({
        message: "URI cannot be empty",
        cause: new Error("Invalid URI parameter"),
      })
    )
  }

  // Check text content is not empty or whitespace-only
  // This prevents wasted API calls to embedding providers
  if (!text.trim()) {
    return Effect.fail(
      new DatabaseQueryError({
        message: "Text content cannot be empty",
        cause: new Error("Invalid text parameter"),
      })
    )
  }

  // Enforce URI length limit (2048 chars) to match database schema constraint
  // Prevents SQL errors from exceeding VARCHAR length
  if (uri.length > 2048) {
    return Effect.fail(
      new DatabaseQueryError({
        message: "URI exceeds maximum length of 2048 characters",
        cause: new Error("URI too long"),
      })
    )
  }

  return Effect.void
}
