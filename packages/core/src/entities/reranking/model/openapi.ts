import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z)

/**
 * Reranking document schema
 */
export const RerankDocumentSchema = z.object({
  text: z.string().min(1).openapi({
    description: "Text content of the document",
    example: "This document discusses machine learning algorithms.",
  }),
  uri: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi("RerankDocument")

/**
 * Reranking request schema
 */
export const RerankRequestSchema = z.object({
  query: z.string().min(1).openapi({
    description: "Query text to rank documents against",
    example: "What are the best machine learning algorithms?",
  }),
  documents: z.array(RerankDocumentSchema).min(1).openapi({
    description: "Array of documents to rerank",
  }),
  model_name: z.string().optional(),
  top_n: z.number().int().min(1).optional(),
  provider_options: z.record(z.string(), z.unknown()).optional(),
}).openapi("RerankRequest")

/**
 * Reranking result schema
 */
export const RerankResultSchema = z.object({
  index: z.number().int().openapi({
    description: "Index of the document in the original documents array",
    example: 0,
  }),
  uri: z.string().optional(),
  text: z.string().openapi({
    description: "Text content of the document",
    example: "This document discusses machine learning algorithms.",
  }),
  score: z.number().openapi({
    description: "Relevance score (higher = more relevant)",
    example: 0.95,
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi("RerankResult")

/**
 * Reranking response schema
 */
export const RerankResponseSchema = z.object({
  query: z.string().openapi({
    description: "Original query text",
    example: "What are the best machine learning algorithms?",
  }),
  model_name: z.string().openapi({
    description: "Model used for reranking",
    example: "rerank-english-v3.0",
  }),
  results: z.array(RerankResultSchema).openapi({
    description: "Reranked results ordered by relevance score (descending)",
  }),
  total_documents: z.number().int().openapi({
    description: "Total number of documents processed",
    example: 10,
  }),
  top_n: z.number().int().openapi({
    description: "Number of top results returned",
    example: 5,
  }),
}).openapi("RerankResponse")
