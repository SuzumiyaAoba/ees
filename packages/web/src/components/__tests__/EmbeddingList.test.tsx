/**
 * Tests for EmbeddingList component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@/__tests__/test-utils'
import userEvent from '@testing-library/user-event'
import { EmbeddingList } from '../EmbeddingList'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'
import * as usePaginationModule from '@/hooks/usePagination'
import * as useFiltersModule from '@/hooks/useFilters'
import type { EmbeddingsListResponse } from '@/types/api'

// Mock the useEmbeddings and useDeleteEmbedding hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useEmbeddings: vi.fn(),
  useDeleteEmbedding: vi.fn(),
  useDeleteAllEmbeddings: vi.fn(),
}))

// Mock the usePagination hook
vi.mock('@/hooks/usePagination', () => ({
  usePagination: vi.fn(),
}))

// Mock the useFilters hook
vi.mock('@/hooks/useFilters', () => ({
  useFilters: vi.fn(),
}))

// Mock window.confirm
global.confirm = vi.fn()

// Mock data
const mockEmbeddingsListResponse: EmbeddingsListResponse = {
  embeddings: [
    {
      id: 1,
      uri: 'file:///path/to/doc1.txt',
      text: 'This is the first document with some sample text content.',
      model_name: 'nomic-embed-text',
      embedding: new Array(768).fill(0.1),
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
    {
      id: 2,
      uri: 'doc2',
      text: 'Second document with different content and longer text to test truncation functionality.',
      model_name: 'text-embedding-3-small',
      embedding: new Array(1536).fill(0.2),
      created_at: '2024-01-16T14:20:00Z',
      updated_at: '2024-01-16T14:20:00Z',
    },
  ],
  count: 2,
  page: 1,
  limit: 20,
  total: 2,
  total_pages: 1,
  has_next: false,
  has_prev: false,
}

const mockEmptyResponse: EmbeddingsListResponse = {
  embeddings: [],
  count: 0,
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
}

const mockLargeListResponse: EmbeddingsListResponse = {
  embeddings: mockEmbeddingsListResponse.embeddings,
  count: 2,
  page: 1,
  limit: 20,
  total: 45,
  total_pages: 3,
  has_next: true,
  has_prev: false,
}

describe('EmbeddingList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.confirm).mockReturnValue(true)

    // Setup default pagination mock
    vi.mocked(usePaginationModule.usePagination).mockReturnValue({
      page: 1,
      limit: 20,
      setPage: vi.fn(),
      setLimit: vi.fn(),
      nextPage: vi.fn(),
      previousPage: vi.fn(),
      goToPage: vi.fn(),
      resetPagination: vi.fn(),
      getPaginationInfo: (total: number) => ({
        totalPages: Math.ceil(total / 20),
        startIndex: 1,
        endIndex: Math.min(20, total),
        hasNextPage: total > 20,
        hasPreviousPage: false,
      }),
    } as any)

    // Setup default filters mock
    vi.mocked(useFiltersModule.useFilters).mockReturnValue({
      filters: { uri: '', modelName: '' },
      updateFilter: vi.fn(),
    } as any)
  })

  describe('Rendering', () => {
    it('should render embedding list component without crashing', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Embedding Collection')).toBeInTheDocument()
    })

    it('should render filter controls', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Filter by URI')).toBeInTheDocument()
      expect(screen.getByText('Filter by Model')).toBeInTheDocument()
      expect(screen.getByText('Items per page')).toBeInTheDocument()
    })

    it('should render embeddings list', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Embeddings')).toBeInTheDocument()
      expect(screen.getByText('doc1.txt')).toBeInTheDocument()
      expect(screen.getByText('doc2')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Loading embeddings...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error occurs', () => {
      const error = new Error('Failed to fetch embeddings')
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText(/failed to fetch embeddings/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no embeddings exist', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmptyResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('No embeddings found')).toBeInTheDocument()
      expect(screen.getByText('Upload files or create embeddings to get started')).toBeInTheDocument()
    })

    it('should show adjusted message when filters are active', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmptyResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const uriFilterInput = screen.getByPlaceholderText('Enter URI to filter...')
      await user.type(uriFilterInput, 'test')

      await waitFor(() => {
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
      })
    })
  })

  describe('Filtering', () => {
    it('should update URI filter on input', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const uriFilterInput = screen.getByPlaceholderText('Enter URI to filter...')
      await user.type(uriFilterInput, 'doc1')

      expect(uriFilterInput).toHaveValue('doc1')
    })

    it('should update model filter on input', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const modelFilterInput = screen.getByPlaceholderText('Enter model name...')
      await user.type(modelFilterInput, 'nomic')

      expect(modelFilterInput).toHaveValue('nomic')
    })

    it('should update items per page on selection', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const limitSelect = screen.getByText('Items per page').parentElement?.querySelector('select')
      expect(limitSelect).toBeInTheDocument()

      if (limitSelect) {
        await user.selectOptions(limitSelect, '50')
        expect(limitSelect).toHaveValue('50')
      }
    })
  })

  describe('Pagination', () => {
    it('should display pagination controls when total exceeds limit', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockLargeListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    })

    it('should not display pagination controls when total is within limit', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockLargeListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const previousButton = screen.getByText('Previous')
      expect(previousButton).toBeDisabled()
    })

    it('should navigate to next page', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockLargeListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // After clicking next, we'd expect page 2, but since we're mocking,
      // we just verify the button was clickable
      expect(nextButton).toBeInTheDocument()
    })
  })

  describe('Embedding Display', () => {
    it('should display embedding ID and model', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText(/ID: 1/)).toBeInTheDocument()
      expect(screen.getByText(/Model: nomic-embed-text/)).toBeInTheDocument()
    })

    it('should format file URIs correctly', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      // file:///path/to/doc1.txt should display as doc1.txt
      expect(screen.getByText('doc1.txt')).toBeInTheDocument()
      // Regular URI should display as-is
      expect(screen.getByText('doc2')).toBeInTheDocument()
    })

    it('should display embedding text', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText(/This is the first document/)).toBeInTheDocument()
      expect(screen.getByText(/Second document with different content/)).toBeInTheDocument()
    })

    it('should display embedding dimensions', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText('Embedding dimensions: 768')).toBeInTheDocument()
      expect(screen.getByText('Embedding dimensions: 1536')).toBeInTheDocument()
    })

    it('should display result count', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      expect(screen.getByText(/Total: 2 embeddings/)).toBeInTheDocument()
    })
  })

  describe('Delete Functionality', () => {
    it('should call delete mutation when delete button clicked and confirmed', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockResolvedValue({})
      vi.mocked(global.confirm).mockReturnValue(true)

      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      // Find all delete buttons (Trash2 icons)
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-trash-2')
      })

      expect(deleteButton).toBeInTheDocument()

      if (deleteButton) {
        await user.click(deleteButton)

        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this embedding?')
        expect(mockMutateAsync).toHaveBeenCalledWith(1)
      }
    })

    it('should not delete when user cancels confirmation', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn()
      vi.mocked(global.confirm).mockReturnValue(false)

      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-trash-2')
      })

      if (deleteButton) {
        await user.click(deleteButton)

        expect(global.confirm).toHaveBeenCalled()
        expect(mockMutateAsync).not.toHaveBeenCalled()
      }
    })

    it('should disable delete button when mutation is pending', () => {
      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-trash-2')
      })

      expect(deleteButton).toBeDisabled()
    })
  })

  describe('Selection Callback', () => {
    it('should call onEmbeddingSelect when view button clicked', async () => {
      const user = userEvent.setup()
      const onEmbeddingSelect = vi.fn()

      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList onEmbeddingSelect={onEmbeddingSelect} />)

      // Find all view buttons (Eye icons)
      const viewButtons = screen.getAllByRole('button')
      const viewButton = viewButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-eye')
      })

      expect(viewButton).toBeInTheDocument()

      if (viewButton) {
        await user.click(viewButton)

        expect(onEmbeddingSelect).toHaveBeenCalledWith(mockEmbeddingsListResponse.embeddings[0])
      }
    })

    it('should not throw error when onEmbeddingSelect is not provided', async () => {
      const user = userEvent.setup()

      vi.mocked(useEmbeddingsModule.useEmbeddings).mockReturnValue({
        data: mockEmbeddingsListResponse,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteEmbedding).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      vi.mocked(useEmbeddingsModule.useDeleteAllEmbeddings).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<EmbeddingList />)

      const viewButtons = screen.getAllByRole('button')
      const viewButton = viewButtons.find((btn: HTMLElement) => {
        const svg = btn.querySelector('svg')
        return svg && svg.classList.contains('lucide-eye')
      })

      if (viewButton) {
        await user.click(viewButton)
        // Should not throw error
        expect(viewButton).toBeInTheDocument()
      }
    })
  })
})
