import type { Meta, StoryObj } from '@storybook/react'
import { EmbeddingVisualization } from './EmbeddingVisualization'
import { apiClient } from '@/services/api'

// Create a mock apiClient for stories
const createMockApiClient = () => ({
  getDistinctEmbeddingModels: async () => ({ models: ['nomic-embed-text', 'text-embedding-3-small'] }),
  visualizeEmbeddings: async (params: unknown) => {
    const dims = (params as { dimensions: 2 | 3 }).dimensions
    const total = 100
    const points = Array.from({ length: total }, (_, i) => ({
      id: i + 1,
      uri: `doc-${i}`,
      model_name: 'nomic-embed-text',
      coordinates: dims === 3 ? [Math.random(), Math.random(), Math.random()] : [Math.random(), Math.random()],
    }))
    return {
      method: 'pca',
      dimensions: dims,
      parameters: {},
      points,
      total_points: points.length,
      debug_info: {
        computation_time: Math.random() * 1000,
        memory_usage: Math.random() * 100,
      },
    }
  },
  getEmbedding: async (uri: string) => ({
    id: 1,
    uri,
    text: `Sample content for ${uri}`,
    model_name: 'nomic-embed-text',
    embedding: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    original_content: undefined,
    converted_format: undefined,
  }),
  createEmbedding: async ({ uri }: { uri: string; text: string }) => ({
    id: Math.floor(Math.random() * 10000),
    uri,
    model_name: 'nomic-embed-text',
    message: 'created',
  }),
  deleteEmbedding: async () => undefined,
})

const meta: Meta<typeof EmbeddingVisualization> = {
  title: 'Features/EmbeddingVisualization',
  component: EmbeddingVisualization,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof EmbeddingVisualization>

export const Default2D: Story = {
  name: 'Default (2D)',
  render: () => <EmbeddingVisualization />,
}

export const Default3D: Story = {
  name: 'Default (3D)',
  render: () => <EmbeddingVisualization />,
  parameters: {
    // Hint for interaction: switch to 3D in the UI
  },
}

export const Loading: Story = {
  render: () => {
    // Create a new mock client for this story
    const loadingMockClient = createMockApiClient()
    loadingMockClient.visualizeEmbeddings = async (params: unknown) => {
      await new Promise((r) => setTimeout(r, 2000)) // 2 second delay
      const dims = (params as { dimensions: 2 | 3 }).dimensions
      const total = 100
      const points = Array.from({ length: total }, (_, i) => ({
        id: i + 1,
        uri: `doc-${i}`,
        model_name: 'nomic-embed-text',
        coordinates: dims === 3 ? [Math.random(), Math.random(), Math.random()] : [Math.random(), Math.random()],
      }))
      return {
        method: 'pca',
        dimensions: dims,
        parameters: {},
        points,
        total_points: points.length,
        debug_info: {
          computation_time: Math.random() * 1000,
          memory_usage: Math.random() * 100,
        },
      }
    }
    
    // Temporarily replace the global apiClient
    Object.assign(apiClient, loadingMockClient)
    
    return <EmbeddingVisualization />
  },
}

export const EmptyState: Story = {
  render: () => {
    // Create a new mock client for this story
    const emptyMockClient = createMockApiClient()
    emptyMockClient.visualizeEmbeddings = async (params: unknown) => ({
      method: 'pca',
      dimensions: (params as { dimensions: 2 | 3 }).dimensions,
      parameters: {},
      points: [],
      total_points: 0,
      debug_info: {
        computation_time: 0,
        memory_usage: 0,
      },
    })
    
    // Temporarily replace the global apiClient
    Object.assign(apiClient, emptyMockClient)
    
    return <EmbeddingVisualization />
  },
}

export const ErrorState: Story = {
  render: () => {
    // Create a new mock client for this story
    const errorMockClient = createMockApiClient()
    errorMockClient.visualizeEmbeddings = async () => {
      throw new Error('Visualization failed (mocked)')
    }
    
    // Temporarily replace the global apiClient
    Object.assign(apiClient, errorMockClient)
    
    return <EmbeddingVisualization />
  },
}

export const LargeDataset: Story = {
  render: () => {
    // Create a new mock client for this story
    const largeMockClient = createMockApiClient()
    largeMockClient.visualizeEmbeddings = async (params: unknown) => {
      const dims = (params as { dimensions: 2 | 3 }).dimensions
      const total = 1000
      const points = Array.from({ length: total }, (_, i) => ({
        id: i + 1,
        uri: `doc-${i}`,
        model_name: 'nomic-embed-text',
        coordinates: dims === 3 ? [Math.random(), Math.random(), Math.random()] : [Math.random(), Math.random()],
      }))
      return {
        method: 'pca',
        dimensions: dims,
        parameters: {},
        points,
        total_points: points.length,
        debug_info: {
          computation_time: Math.random() * 2000,
          memory_usage: Math.random() * 200,
        },
      }
    }
    
    // Temporarily replace the global apiClient
    Object.assign(apiClient, largeMockClient)
    
    return <EmbeddingVisualization />
  },
}


