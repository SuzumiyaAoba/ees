/**
 * Task type definitions for embedding models
 * Different models support different task types with specific prompt formats
 */

/**
 * Task types supported by embedding models
 * Currently optimized for embeddinggemma model
 */
export const TaskType = {
  /**
   * Document search query embedding
   * Optimized for searching documents and information retrieval
   * Prompt format: "search_query: {content}"
   */
  RETRIEVAL_QUERY: "retrieval_query",

  /**
   * Document embedding for search
   * Optimized for document indexing (add title for better accuracy)
   * Prompt format: "search_document: {content}"
   */
  RETRIEVAL_DOCUMENT: "retrieval_document",

  /**
   * Question answering query embedding
   * Optimized for Q&A scenarios
   * Prompt format: "task: question answering | query: {content}"
   */
  QUESTION_ANSWERING: "question_answering",

  /**
   * Fact verification query embedding
   * Optimized for fact-checking scenarios
   * Prompt format: "task: fact checking | query: {content}"
   */
  FACT_VERIFICATION: "fact_verification",

  /**
   * Classification query embedding
   * Optimized for predefined label classification
   * Prompt format: "task: classification | query: {content}"
   */
  CLASSIFICATION: "classification",

  /**
   * Clustering query embedding
   * Optimized for similarity-based clustering
   * Prompt format: "task: clustering | query: {content}"
   */
  CLUSTERING: "clustering",

  /**
   * Semantic similarity evaluation
   * Optimized for similarity scoring (not recommended for search)
   * Prompt format: "task: sentence similarity | query: {content}"
   */
  SEMANTIC_SIMILARITY: "semantic_similarity",

  /**
   * Code retrieval query embedding
   * Optimized for searching code blocks with natural language
   * Prompt format: "task: code retrieval | query: {content}"
   * Note: Use retrieval_document for the code side
   */
  CODE_RETRIEVAL: "code_retrieval",
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

/**
 * Task type prompt formatters for embeddinggemma
 * Maps task types to their respective prompt prefixes
 */
export const EMBEDDINGGEMMA_TASK_PROMPTS: Record<TaskType, (content: string, title?: string) => string> = {
  [TaskType.RETRIEVAL_QUERY]: (content: string) =>
    `task: search result | query: ${content}`,

  [TaskType.RETRIEVAL_DOCUMENT]: (content: string, title?: string) =>
    title ? `title: ${title} | text: ${content}` : `title: none | text: ${content}`,

  [TaskType.QUESTION_ANSWERING]: (content: string) =>
    `task: question answering | query: ${content}`,

  [TaskType.FACT_VERIFICATION]: (content: string) =>
    `task: fact checking | query: ${content}`,

  [TaskType.CLASSIFICATION]: (content: string) =>
    `task: classification | query: ${content}`,

  [TaskType.CLUSTERING]: (content: string) =>
    `task: clustering | query: ${content}`,

  [TaskType.SEMANTIC_SIMILARITY]: (content: string) =>
    `task: sentence similarity | query: ${content}`,

  [TaskType.CODE_RETRIEVAL]: (content: string) =>
    `task: code retrieval | query: ${content}`,
}

/**
 * Model-specific task type support
 * Maps model names to their supported task types
 */
export const MODEL_TASK_SUPPORT: Record<string, TaskType[]> = {
  "embeddinggemma": Object.values(TaskType),
  "nomic-embed-text": [TaskType.RETRIEVAL_QUERY, TaskType.RETRIEVAL_DOCUMENT],
  // Other models can be added here with their supported task types
}

/**
 * Check if a model supports a specific task type
 */
export function isTaskTypeSupported(modelName: string, taskType: TaskType): boolean {
  const supportedTasks = MODEL_TASK_SUPPORT[modelName]
  if (!supportedTasks) {
    // If model not in the list, assume basic retrieval support only
    return taskType === TaskType.RETRIEVAL_QUERY || taskType === TaskType.RETRIEVAL_DOCUMENT
  }
  return supportedTasks.includes(taskType)
}

/**
 * Get the appropriate prompt formatter for a model and task type
 * Returns undefined if the model doesn't have specific task type support
 */
export function getTaskTypePromptFormatter(
  modelName: string,
  taskType: TaskType
): ((content: string, title?: string) => string) | undefined {
  // Currently only embeddinggemma has specific task type prompts
  if (modelName === "embeddinggemma") {
    return EMBEDDINGGEMMA_TASK_PROMPTS[taskType]
  }
  return undefined
}

/**
 * Format text with task type prompt if supported by the model
 * Falls back to original text if model doesn't support task types
 */
export function formatTextWithTaskType(
  modelName: string,
  text: string,
  taskType: TaskType,
  title?: string
): string {
  const formatter = getTaskTypePromptFormatter(modelName, taskType)
  if (formatter && isTaskTypeSupported(modelName, taskType)) {
    return formatter(text, title)
  }
  return text
}
