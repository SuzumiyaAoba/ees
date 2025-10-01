/**
 * Tests for ProviderConfig component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProviderConfig } from '../ProviderConfig'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'

// Mock the hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useProviderModels: vi.fn(),
  useOllamaStatus: vi.fn(),
}))

// Mock data
const mockModels = [
  {
    name: 'nomic-embed-text',
    provider: 'ollama',
    size: 274349168,
    modified_at: '2024-01-15T10:00:00Z',
    digest: 'abcd1234567890efgh',
  },
  {
    name: 'mxbai-embed-large',
    provider: 'ollama',
    size: 669000000,
    modified_at: '2024-01-20T14:30:00Z',
    digest: 'xyz9876543210abcd',
  },
]

const mockOllamaStatusOnline = {
  status: 'online' as const,
  version: '0.1.17',
  models: ['nomic-embed-text', 'mxbai-embed-large'],
}

describe('ProviderConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render provider config component without crashing', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Ollama Service Status')).toBeInTheDocument()
    })

    it('should render all main sections', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Ollama Service Status')).toBeInTheDocument()
      expect(screen.getByText('Available Models')).toBeInTheDocument()
      expect(screen.getByText('Default Settings')).toBeInTheDocument()
    })
  })

  describe('Ollama Status', () => {
    it('should display online status when service is running', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Service Online')).toBeInTheDocument()
      expect(screen.getByText(/Version: 0.1.17/)).toBeInTheDocument()
    })

    it('should display offline status when service is not running', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Service Offline')).toBeInTheDocument()
    })

    it('should display loading state when checking status', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Checking status...')).toBeInTheDocument()
    })

    it('should call refetch when refresh button clicked', async () => {
      const user = userEvent.setup()
      const mockRefetch = vi.fn()

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: mockRefetch,
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const refreshButtons = screen.getAllByText('Refresh')
      const statusRefreshButton = refreshButtons[0]

      await user.click(statusRefreshButton)

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('Model Management', () => {
    it('should display installed models', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const nomicElements = screen.getAllByText('nomic-embed-text')
      expect(nomicElements.length).toBeGreaterThan(0)
      const mxbaiElements = screen.getAllByText('mxbai-embed-large')
      expect(mxbaiElements.length).toBeGreaterThan(0)
    })

    it('should display model size and modified date', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText(/0.3 GB/)).toBeInTheDocument()
      expect(screen.getByText(/0.6 GB/)).toBeInTheDocument()
    })

    it('should display model digest', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText(/abcd12345678.../)).toBeInTheDocument()
      expect(screen.getByText(/xyz987654321.../)).toBeInTheDocument()
    })

    it('should display loading state when fetching models', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Loading models...')).toBeInTheDocument()
    })

    it('should display empty state when no models', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('No models found')).toBeInTheDocument()
      expect(screen.getByText('Pull a model using the form above')).toBeInTheDocument()
    })

    it('should call refetch when refresh models button clicked', async () => {
      const user = userEvent.setup()
      const mockRefetchModels = vi.fn()
      const mockRefetchStatus = vi.fn()

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: mockRefetchModels,
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: mockRefetchStatus,
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const refreshButtons = screen.getAllByText('Refresh')
      const modelsRefreshButton = refreshButtons[1]

      await user.click(modelsRefreshButton)

      expect(mockRefetchModels).toHaveBeenCalled()
      expect(mockRefetchStatus).toHaveBeenCalled()
    })
  })

  describe('Model Pull', () => {
    it('should render model pull input', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByPlaceholderText(/Enter model name/)).toBeInTheDocument()
      expect(screen.getByText('Pull Model')).toBeInTheDocument()
    })

    it('should update model name input on typing', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const modelInput = screen.getByPlaceholderText(/Enter model name/)
      await user.type(modelInput, 'llama2')

      expect(modelInput).toHaveValue('llama2')
    })

    it('should disable pull button when input is empty', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const pullButton = screen.getByText('Pull Model')
      expect(pullButton).toBeDisabled()
    })

    it('should enable pull button when input has value', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const modelInput = screen.getByPlaceholderText(/Enter model name/)
      await user.type(modelInput, 'llama2')

      const pullButton = screen.getByText('Pull Model')
      expect(pullButton).not.toBeDisabled()
    })

    it('should clear input after pull button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const modelInput = screen.getByPlaceholderText(/Enter model name/) as HTMLInputElement
      await user.type(modelInput, 'llama2')

      const pullButton = screen.getByText('Pull Model')
      await user.click(pullButton)

      await waitFor(() => {
        expect(modelInput).toHaveValue('')
      })
    })
  })

  describe('Default Settings', () => {
    it('should render default settings section', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Default Settings')).toBeInTheDocument()
      expect(screen.getByText('Default Model')).toBeInTheDocument()
      expect(screen.getByText('Search Metric')).toBeInTheDocument()
      expect(screen.getByText('Default Search Limit')).toBeInTheDocument()
      expect(screen.getByText('Default Threshold')).toBeInTheDocument()
    })

    it('should display available models in default model dropdown', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const defaultModelElements = screen.getAllByText('nomic-embed-text')
      expect(defaultModelElements.length).toBeGreaterThan(0)
    })

    it('should display search metric options', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Cosine Similarity')).toBeInTheDocument()
      expect(screen.getByText('Euclidean Distance')).toBeInTheDocument()
      expect(screen.getByText('Dot Product')).toBeInTheDocument()
    })

    it('should render save settings button', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    it('should have default values for numeric inputs', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const limitInput = screen.getByText('Default Search Limit').parentElement?.querySelector('input')
      const thresholdInput = screen.getByText('Default Threshold').parentElement?.querySelector('input')

      expect(limitInput).toHaveValue(10)
      expect(thresholdInput).toHaveValue(0.7)
    })

    it('should allow changing default model selection', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const modelSelect = screen.getByText('Default Model').nextElementSibling as HTMLSelectElement
      await user.selectOptions(modelSelect, 'nomic-embed-text')

      expect(modelSelect).toHaveValue('nomic-embed-text')
    })

    it('should allow changing search metric', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOnline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderConfig />)

      const metricSelect = screen.getByText('Search Metric').nextElementSibling as HTMLSelectElement
      await user.selectOptions(metricSelect, 'euclidean')

      expect(metricSelect).toHaveValue('euclidean')
    })
  })
})
