import type { Meta, StoryObj } from '@storybook/react'
import { EmbeddingVisualization } from './EmbeddingVisualization'

// Mock apiClient used inside the component
// We mock on window to avoid import path rewrites inside component
// and keep stories self-contained.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiClientMock: any = {
  getDistinctEmbeddingModels: async () => ({ models: ['nomic-embed-text', 'text-embedding-3-small'] }),
  visualizeEmbeddings: async (params: unknown) => {
    const dims = (params as { dimensions: 2 | 3 }).dimensions
    const total = 100
    const points = Array.from({ length: dims === 3 ? total : total }, (_, i) => ({
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
}

// Provide mocked apiClient on globalThis so the component picks it up
// when it imports from '@/services/api'.
;(globalThis as unknown as { apiClient?: unknown }).apiClient = apiClientMock

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
    // Slow down visualizeEmbeddings to show loading state
    apiClientMock.visualizeEmbeddings = async () => {
      await new Promise((r) => setTimeout(r, 1500))
      return apiClientMock.visualizeEmbeddings({ dimensions: 2 })
    }
    return <EmbeddingVisualization />
  },
}

export const EmptyState: Story = {
  render: () => {
    apiClientMock.visualizeEmbeddings = async (params: unknown) => ({
      method: 'pca',
      dimensions: (params as { dimensions: 2 | 3 }).dimensions,
      parameters: {},
      points: [],
      total_points: 0,
    })
    return <EmbeddingVisualization />
  },
}

export const ErrorState: Story = {
  render: () => {
    apiClientMock.visualizeEmbeddings = async () => {
      throw new Error('Visualization failed (mocked)')
    }
    return <EmbeddingVisualization />
  },
}

export const LargeDataset: Story = {
  render: () => {
    apiClientMock.visualizeEmbeddings = async (params: unknown) => {
      const dims = (params as { dimensions: 2 | 3 }).dimensions
      const total = 1000
      const points = Array.from({ length: total }, (_, i) => ({
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
      }
    }
    return <EmbeddingVisualization />
  },
}


