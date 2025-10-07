/**
 * Tests for SearchInterface component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInterface } from '../SearchInterface'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import { mockSearchResponse } from '@/__tests__/mocks/handlers'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'

// Mock the useEmbeddings hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useSearchEmbeddings: vi.fn(),
  useModels: vi.fn(),
}))

describe('SearchInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for useModels
    vi.mocked(useEmbeddingsModule.useModels).mockReturnValue({
      data: {
        models: [
          { name: 'nomic-embed-text', displayName: 'Nomic Embed Text', available: true },
          { name: 'text-embedding-3-small', displayName: 'OpenAI Small', available: true },
        ]
      },
      isLoading: false,
      error: null,
    } as any)
  })

  describe('Rendering', () => {
    it('should render search interface without crashing', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      expect(screen.getByText('Semantic Search')).toBeInTheDocument()
    })

    it('should render search input', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      expect(screen.getByPlaceholderText(/enter your search query/i)).toBeInTheDocument()
    })

    it('should render search button', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // There are multiple search buttons/icons, use getAllByText
      const searchButtons = screen.getAllByText('Search')
      expect(searchButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Search Parameters', () => {
    it('should have default limit of 10', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // Find the Limit input by label
      const limitLabel = screen.getByText('Limit')
      const limitInput = limitLabel.parentElement?.querySelector('input')
      expect(limitInput).toHaveValue(10)
    })

    it('should have default threshold of 0.7', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      const thresholdLabel = screen.getByText('Threshold')
      const thresholdInput = thresholdLabel.parentElement?.querySelector('input')
      expect(thresholdInput).toHaveValue(0.7)
    })

    it('should have default metric of cosine', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      const metricLabel = screen.getByText('Metric')
      const metricSelect = metricLabel.parentElement?.querySelector('select')
      expect(metricSelect).toHaveValue('cosine')
    })
  })

  describe('User Interaction', () => {
    it('should update query on typing', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      const input = screen.getByPlaceholderText(/enter your search query/i)
      await user.type(input, 'test query')

      expect(input).toHaveValue('test query')
    })

    it('should disable search button when query is empty', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // Get the search button (not the tab button)
      const buttons = screen.getAllByRole('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('Search') && btn.hasAttribute('disabled'))
      expect(searchButton).toBeDefined()
    })

    it('should enable search button when query has text', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      const input = screen.getByPlaceholderText(/enter your search query/i)
      await user.type(input, 'test')

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const searchButton = buttons.find(btn => btn.textContent?.includes('Search') && !btn.hasAttribute('disabled'))
        expect(searchButton).toBeDefined()
      })
    })
  })

  describe('Search Results', () => {
    it('should display search results when available', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: mockSearchResponse,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      expect(screen.getByText('Search Results')).toBeInTheDocument()
      expect(screen.getByText(mockSearchResponse.results[0].uri)).toBeInTheDocument()
    })

    it('should display similarity as percentage', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: mockSearchResponse,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // 0.95 should display as 95%
      expect(screen.getByText('95%')).toBeInTheDocument()
    })

    it('should display result count', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: mockSearchResponse,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      expect(screen.getByText(/found 1 results/i)).toBeInTheDocument()
    })

    it('should call onResultSelect when result is clicked', async () => {
      const onResultSelect = vi.fn()
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: mockSearchResponse,
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface onResultSelect={onResultSelect} />)

      const resultUri = screen.getByText(mockSearchResponse.results[0].uri)
      await user.click(resultUri)

      expect(onResultSelect).toHaveBeenCalledWith(mockSearchResponse.results[0])
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when searching', () => {
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // When loading, the search button should be disabled
      const buttons = screen.getAllByRole('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('Search'))
      expect(searchButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when search fails', () => {
      const error = new Error('Search failed')
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      expect(screen.getByText(/search failed/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show no results message when search returns empty', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useSearchEmbeddings).mockReturnValue({
        data: {
          ...mockSearchResponse,
          results: [],
          total_results: 0,
          query: 'test query',
        },
        isLoading: false,
        error: null,
      } as any)

      renderWithQueryClient(<SearchInterface />)

      // Type in the query to update searchParams
      const input = screen.getByPlaceholderText(/enter your search query/i)
      await user.type(input, 'test query')

      await waitFor(() => {
        expect(screen.getByText(/no results found for "test query"/i)).toBeInTheDocument()
      })
    })
  })
})
