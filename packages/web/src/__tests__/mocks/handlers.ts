/**
 * Mock API handlers for testing
 * Used to mock API responses in component tests
 */

import { vi } from 'vitest'

// Mock embedding data
export const mockEmbedding = {
  id: 1,
  uri: 'test-document.txt',
  text: 'This is a test document for embeddings',
  model_name: 'nomic-embed-text',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockSearchResult = {
  id: 1,
  uri: 'test-document.txt',
  text: 'This is a test document for embeddings',
  model_name: 'nomic-embed-text',
  created_at: '2024-01-01T00:00:00Z',
  similarity: 0.95,
}

export const mockSearchResponse = {
  query: 'test query',
  model_name: 'nomic-embed-text',
  metric: 'cosine' as const,
  total_results: 1,
  results: [mockSearchResult],
}

export const mockProvider = {
  name: 'ollama',
  models: ['nomic-embed-text', 'all-minilm'],
}

// Mock fetch function
export const createMockFetch = (mockData: unknown, shouldError = false) => {
  return vi.fn(() => {
    if (shouldError) {
      return Promise.reject(new Error('API Error'))
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    } as Response)
  })
}
