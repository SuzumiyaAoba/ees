import { z } from "zod"

export const CreateEmbeddingSchema = z.object({
  file_path: z.string().min(1, "File path is required"),
  text: z.string().min(1, "Text is required"),
  model_name: z.string().optional().default("gemma:300m"),
})

export type CreateEmbeddingInput = z.infer<typeof CreateEmbeddingSchema>
