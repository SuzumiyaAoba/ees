import { Effect, Exit } from "effect"
import type { Context } from "hono"
import { AppLayer } from "@/app/providers/main"

/**
 * Type-safe Effect runner for Hono handlers
 * Properly handles Effect error channels and converts them to HTTP responses
 */
export async function runEffectProgram<A, E>(
  program: Effect.Effect<A, E, never>,
  context: Context,
  operation: string
): Promise<Response> {
  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(AppLayer))
  )

  if (Exit.isSuccess(exit)) {
    return context.json(exit.value, 200)
  } else {
    return handleEffectError(context, exit.cause, operation)
  }
}

/**
 * Helper function to map Effect errors to appropriate HTTP status codes
 */
function handleEffectError(c: Context, cause: unknown, operation: string) {
  console.error(`Effect error in ${operation}:`, cause)

  const causeString = String(cause)
  if (causeString.includes("ValidationError") || causeString.includes("required") || causeString.includes("invalid")) {
    return c.json({ error: "Validation error", details: causeString }, 400)
  }
  if (causeString.includes("NotFound") || causeString.includes("not found")) {
    return c.json({ error: "Resource not found", details: causeString }, 404)
  }
  if (causeString.includes("Unauthorized") || causeString.includes("authentication")) {
    return c.json({ error: "Unauthorized", details: causeString }, 401)
  }
  if (causeString.includes("RateLimit") || causeString.includes("rate limit")) {
    return c.json({ error: "Rate limit exceeded", details: causeString }, 429)
  }

  return c.json({ error: "Internal server error", details: causeString }, 500)
}