import { Data } from "effect"

export class OllamaError extends Data.TaggedError("OllamaError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class OllamaConnectionError extends Data.TaggedError(
  "OllamaConnectionError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class OllamaModelError extends Data.TaggedError("OllamaModelError")<{
  readonly message: string
  readonly modelName: string
  readonly cause?: unknown
}> {}
