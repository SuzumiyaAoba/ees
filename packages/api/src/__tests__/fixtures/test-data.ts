/**
 * Test data fixtures for E2E API testing
 */

export const testEmbeddings = {
  simple: {
    uri: "test-doc-simple",
    text: "This is a simple test document for embedding generation.",
    model_name: "nomic-embed-text"
  },
  complex: {
    uri: "test-doc-complex",
    text: "This is a more complex document with technical content about machine learning, natural language processing, and vector embeddings used in semantic search applications.",
    model_name: "nomic-embed-text"
  },
  japanese: {
    uri: "test-doc-japanese",
    text: "これは日本語のテストドキュメントです。機械学習と自然言語処理について説明しています。",
    model_name: "nomic-embed-text"
  },
  long: {
    uri: "test-doc-long",
    text: "This is a very long document that contains multiple paragraphs of text. ".repeat(50) + "It should test the embedding generation with larger text inputs and verify that the system can handle substantial content without issues.",
    model_name: "nomic-embed-text"
  }
}

export const batchEmbeddingData = {
  texts: [
    { uri: "batch-doc-1", text: "First document in batch processing test." },
    { uri: "batch-doc-2", text: "Second document for batch embedding generation." },
    { uri: "batch-doc-3", text: "Third document to verify batch processing functionality." }
  ],
  model_name: "nomic-embed-text"
}

export const searchQueries = {
  simple: {
    query: "simple test document",
    limit: 5,
    threshold: 0.1,
    metric: "cosine" as const
  },
  technical: {
    query: "machine learning natural language processing",
    limit: 10,
    threshold: 0.2,
    metric: "euclidean" as const
  },
  japanese: {
    query: "日本語 機械学習",
    limit: 3,
    threshold: 0.0,
    metric: "dot_product" as const
  }
}

export const invalidData = {
  createEmbedding: {
    missingText: { uri: "test-uri" },
    missingUri: { text: "test text" },
    emptyText: { uri: "test-uri", text: "" },
    emptyUri: { uri: "", text: "test text" },
    invalidModelName: { uri: "test-uri", text: "test text", model_name: "" }
  },
  batchCreate: {
    missingTexts: { model_name: "nomic-embed-text" },
    emptyTexts: { texts: [], model_name: "nomic-embed-text" },
    invalidTextFormat: { texts: "not-an-array", model_name: "nomic-embed-text" }
  },
  search: {
    missingQuery: { limit: 5 },
    emptyQuery: { query: "", limit: 5 },
    invalidLimit: { query: "test", limit: -1 },
    invalidThreshold: { query: "test", threshold: -1 },
    invalidMetric: { query: "test", metric: "invalid" }
  }
}

export const mockProviderResponse = {
  embedding: new Array(768).fill(0).map(() => Math.random() - 0.5), // Mock 768-dimensional vector
  usage: {
    prompt_tokens: 10,
    total_tokens: 10
  }
}

export const expectedResponseStructure = {
  createEmbedding: {
    required: ["id", "uri", "text", "model_name", "embedding", "created_at"],
    optional: []
  },
  batchCreate: {
    required: ["successful", "failed", "total", "results"],
    optional: []
  },
  search: {
    required: ["count", "results"],
    optional: []
  },
  searchResult: {
    required: ["id", "uri", "text", "model_name", "similarity"],
    optional: ["created_at"]
  },
  listEmbeddings: {
    required: ["embeddings", "count", "page", "limit", "total_pages", "has_next", "has_prev"],
    optional: []
  },
  models: {
    required: ["models", "count", "providers"],
    optional: []
  },
  error: {
    required: ["error"],
    optional: ["details", "code"]
  }
}

export const testFiles = {
  small: {
    name: "small-test.txt",
    content: "Small test file content for upload testing.",
    size: 48
  },
  medium: {
    name: "medium-test.txt",
    content: "Medium sized test file content. ".repeat(20) + "Used for upload testing with moderate file sizes.",
    size: 720
  }
}

export const performanceThresholds = {
  createEmbedding: 5000, // 5 seconds max
  batchCreate: 15000, // 15 seconds max for batch
  search: 2000, // 2 seconds max
  listEmbeddings: 1000, // 1 second max
  deleteEmbedding: 500 // 0.5 seconds max
}