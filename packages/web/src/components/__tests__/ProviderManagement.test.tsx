/**
 * Tests for ProviderManagement component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@/__tests__/test-utils'
import userEvent from '@testing-library/user-event'
import { ProviderManagement } from '../ProviderManagement'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'

// Mock the hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useProviders: vi.fn(),
  useProviderModels: vi.fn(),
  useOllamaStatus: vi.fn(),
  useCurrentProvider: vi.fn(),
}))

// Mock data
const mockProviders = [
  {
    name: 'ollama',
    displayName: 'Ollama',
    status: 'online' as const,
    description: 'Run large language models locally',
    version: 'v0.1.0',
    modelCount: 3,
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    status: 'online' as const,
    description: 'OpenAI embedding models',
    version: 'v1.0.0',
    modelCount: 2,
  },
  {
    name: 'cohere',
    displayName: 'Cohere',
    status: 'offline' as const,
    description: 'Cohere embedding models',
    version: 'v1.0.0',
    modelCount: 1,
  },
]

const mockModels = [
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    provider: 'ollama',
    dimensions: 768,
    maxTokens: 8192,
    size: 274349168,
    modified_at: '2024-01-15T10:00:00Z',
    digest: 'abcd1234567890',
  },
  {
    name: 'text-embedding-3-small',
    provider: 'openai',
    dimensions: 1536,
    maxTokens: 8191,
    pricePerToken: 0.00002,
  },
]

const mockCurrentProvider = {
  provider: 'ollama',
  configuration: {
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
  },
}

const mockOllamaStatusOnline = {
  status: 'online' as const,
  version: '0.1.17',
  models: ['nomic-embed-text', 'llama2', 'mistral'],
}

const mockOllamaStatusOffline = {
  status: 'offline' as const,
}

describe('ProviderManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render provider management component without crashing', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Provider Management')).toBeInTheDocument()
    })

    it('should render refresh all button', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Refresh All')).toBeInTheDocument()
    })
  })

  describe('Provider Display', () => {
    it('should display all providers', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const ollamaElements = screen.getAllByText('Ollama')
      expect(ollamaElements.length).toBeGreaterThan(0)
      const openaiElements = screen.getAllByText('OpenAI')
      expect(openaiElements.length).toBeGreaterThan(0)
      const cohereElements = screen.getAllByText('Cohere')
      expect(cohereElements.length).toBeGreaterThan(0)
    })

    it('should display provider status badges', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const onlineBadges = screen.getAllByText('Online')
      expect(onlineBadges).toHaveLength(2)
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should display provider descriptions', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText(/Run large language models locally/)).toBeInTheDocument()
      const openaiDescElements = screen.getAllByText(/OpenAI embedding models/)
      expect(openaiDescElements.length).toBeGreaterThan(0)
    })

    it('should display model counts', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const threeModelsElements = screen.getAllByText('3 models')
      expect(threeModelsElements.length).toBeGreaterThan(0)
      const twoModelsElements = screen.getAllByText('2 models')
      expect(twoModelsElements.length).toBeGreaterThan(0)
    })

    it('should show loading state for providers', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Loading providers...')).toBeInTheDocument()
    })

    it('should show empty state when no providers', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('No providers available')).toBeInTheDocument()
    })
  })

  describe('Current Provider Configuration', () => {
    it('should display current provider when available', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: mockCurrentProvider,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Current Provider Configuration')).toBeInTheDocument()
      expect(screen.getByText(/Active Provider: ollama/)).toBeInTheDocument()
    })

    it('should not display current provider section when not available', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.queryByText('Current Provider Configuration')).not.toBeInTheDocument()
    })
  })

  describe('Ollama Status Monitoring', () => {
    it('should display online status when Ollama is running', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Service Online')).toBeInTheDocument()
      expect(screen.getByText('0.1.17')).toBeInTheDocument()
    })

    it('should display offline status when Ollama is not running', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: mockOllamaStatusOffline,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Service Offline')).toBeInTheDocument()
      expect(screen.getByText('Retry Connection')).toBeInTheDocument()
    })

    it('should display Ollama models when available', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const nomicElements = screen.getAllByText('nomic-embed-text')
      expect(nomicElements.length).toBeGreaterThan(0)
      expect(screen.getByText('llama2')).toBeInTheDocument()
      expect(screen.getByText('mistral')).toBeInTheDocument()
    })

    it('should show loading state for Ollama status', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Checking Ollama status...')).toBeInTheDocument()
    })
  })

  describe('Model Management', () => {
    it('should display models when available', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Nomic Embed Text')).toBeInTheDocument()
      expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument()
    })

    it('should display model dimensions and tokens', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      const dimensionsLabels = screen.getAllByText(/Dimensions:/)
      expect(dimensionsLabels.length).toBeGreaterThan(0)
      expect(screen.getByText(/768/)).toBeInTheDocument()
      const maxTokensLabels = screen.getAllByText(/Max Tokens:/)
      expect(maxTokensLabels.length).toBeGreaterThan(0)
    })

    it('should show loading state for models', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('Loading models...')).toBeInTheDocument()
    })

    it('should show empty state when no models', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByText('No models available')).toBeInTheDocument()
    })
  })

  describe('Provider Selection', () => {
    it('should select provider when clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const ollamaElements = screen.getAllByText('Ollama')
      const ollamaCard = ollamaElements[0].closest('.cursor-pointer')
      expect(ollamaCard).toBeInTheDocument()

      if (ollamaCard) {
        await user.click(ollamaCard)
        // Provider is selected, component re-renders with filter
        expect(ollamaCard).toHaveClass('ring-2')
      }
    })

    it('should filter models by selected provider', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      const filterSelect = screen.getByText('Filter by provider:').nextElementSibling as HTMLSelectElement
      expect(filterSelect).toBeInTheDocument()

      await user.selectOptions(filterSelect, 'ollama')
      expect(filterSelect).toHaveValue('ollama')
    })
  })

  describe('Model Pull Functionality', () => {
    it('should render model pull input', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      expect(screen.getByPlaceholderText(/Enter model name/)).toBeInTheDocument()
      expect(screen.getByText('Pull Model')).toBeInTheDocument()
    })

    it('should update model name input on typing', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const modelInput = screen.getByPlaceholderText(/Enter model name/)
      await user.type(modelInput, 'llama2')

      expect(modelInput).toHaveValue('llama2')
    })

    it('should disable pull button when model name is empty', () => {
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

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

      renderWithQueryClient(<ProviderManagement />)

      const pullButton = screen.getByText('Pull Model')
      expect(pullButton).toBeDisabled()
    })
  })

  describe('Refresh Functionality', () => {
    it('should call refetch functions when refresh all is clicked', async () => {
      const user = userEvent.setup()
      const mockRefetchProviders = vi.fn()
      const mockRefetchCurrentProvider = vi.fn()
      const mockRefetchModels = vi.fn()
      const mockRefetchOllamaStatus = vi.fn()

      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: mockRefetchProviders,
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: mockRefetchCurrentProvider,
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetchModels,
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: mockRefetchOllamaStatus,
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      const refreshButton = screen.getByText('Refresh All')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(mockRefetchProviders).toHaveBeenCalled()
        expect(mockRefetchCurrentProvider).toHaveBeenCalled()
        expect(mockRefetchModels).toHaveBeenCalled()
        expect(mockRefetchOllamaStatus).toHaveBeenCalled()
      })
    })
  })

  describe('Model Details Toggle', () => {
    it('should toggle model details when eye button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviders).mockReturnValue({
        data: mockProviders,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useCurrentProvider).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useEmbeddingsModule.useOllamaStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as any)

      renderWithQueryClient(<ProviderManagement />)

      const eyeButtons = screen.getAllByRole('button')
      const eyeButton = eyeButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-eye')
      })

      expect(eyeButton).toBeInTheDocument()

      if (eyeButton) {
        await user.click(eyeButton)

        await waitFor(() => {
          expect(screen.getByText('Full Name:')).toBeInTheDocument()
        })
      }
    })
  })
})
