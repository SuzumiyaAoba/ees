import { z } from "zod"

export const CreateEmbeddingSchema = z.object({
  uri: z.string().min(1, "URI is required"),
  text: z.string().min(1, "Text is required"),
  model_name: z.string().optional().default("embeddinggemma:300m"),
})

export type CreateEmbeddingInput = z.infer<typeof CreateEmbeddingSchema>
