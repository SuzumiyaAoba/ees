/**
 * Tests for QuickLookPopup component
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickLookPopup } from '../QuickLookPopup'
import type { Embedding, SearchResult } from '@/types/api'

// Mock MarkdownRenderer to avoid complex dependencies
vi.mock('@/components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}))

const mockEmbedding: Embedding = {
  id: 1,
  uri: 'test://document.txt',
  text: 'This is test content',
  model_name: 'test-model',
  embedding: [0.1, 0.2, 0.3],
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  task_type: 'retrieval_document',
}

const mockSearchResult: SearchResult = {
  ...mockEmbedding,
  similarity: 0.95,
}

describe('QuickLookPopup', () => {
  let originalBodyOverflow: string

  beforeEach(() => {
    vi.clearAllMocks()
    // Save and restore body overflow style
    originalBodyOverflow = document.body.style.overflow
  })

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow
  })

  describe('Rendering', () => {
    it('should render with embedding data', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText(mockEmbedding.uri)).toBeInTheDocument()
      expect(screen.getByText(mockEmbedding.text)).toBeInTheDocument()
      expect(screen.getByText(mockEmbedding.model_name)).toBeInTheDocument()
    })

    it('should render with search result data', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockSearchResult} onClose={onClose} />)

      expect(screen.getByText(mockSearchResult.uri)).toBeInTheDocument()
      expect(screen.getByText(mockSearchResult.text)).toBeInTheDocument()
      // Similarity should be displayed as percentage
      expect(screen.getByText('95%')).toBeInTheDocument()
    })

    it('should not render when item is null', () => {
      const onClose = vi.fn()
      const { container } = render(<QuickLookPopup item={null} onClose={onClose} />)

      expect(container.firstChild).toBeNull()
    })

    it('should display task type badge', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText('retrieval_document')).toBeInTheDocument()
    })

    it('should display dimensions for embeddings', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText(/Dimensions: 3/)).toBeInTheDocument()
    })

    it('should display file size', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText(/Size:/)).toBeInTheDocument()
    })

    it('should display creation date', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText(/Created:/)).toBeInTheDocument()
    })
  })

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      const closeButton = screen.getByTitle('Close')
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const { container } = render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      // Backdrop is the first fixed element
      const backdrop = container.querySelector('.fixed.inset-0')
      expect(backdrop).toBeInTheDocument()

      if (backdrop) {
        await user.click(backdrop)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })

    it('should not call onClose when popup content is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      const content = screen.getByText(mockEmbedding.text)
      await user.click(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not close on other key presses', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      fireEvent.keyDown(window, { key: 'Enter' })
      fireEvent.keyDown(window, { key: 'Space' })
      fireEvent.keyDown(window, { key: 'Tab' })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Scroll Prevention', () => {
    it('should prevent body scroll when mounted', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when unmounted', () => {
      const onClose = vi.fn()
      document.body.style.overflow = 'auto'

      const { unmount } = render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).toBe('auto')
    })
  })

  describe('Markdown Rendering', () => {
    it('should show raw text by default', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.getByText(mockEmbedding.text)).toBeInTheDocument()
      expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument()
    })

    it('should render markdown when renderMarkdown is true', () => {
      const onClose = vi.fn()
      render(
        <QuickLookPopup
          item={mockEmbedding}
          onClose={onClose}
          renderMarkdown={true}
        />
      )

      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })

    it('should show markdown toggle button when onToggleMarkdown is provided', () => {
      const onClose = vi.fn()
      const onToggleMarkdown = vi.fn()

      render(
        <QuickLookPopup
          item={mockEmbedding}
          onClose={onClose}
          onToggleMarkdown={onToggleMarkdown}
        />
      )

      expect(screen.getByTitle('Render markdown')).toBeInTheDocument()
    })

    it('should not show markdown toggle button when onToggleMarkdown is not provided', () => {
      const onClose = vi.fn()
      render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      expect(screen.queryByTitle('Render markdown')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Show raw text')).not.toBeInTheDocument()
    })

    it('should call onToggleMarkdown when toggle button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onToggleMarkdown = vi.fn()

      render(
        <QuickLookPopup
          item={mockEmbedding}
          onClose={onClose}
          onToggleMarkdown={onToggleMarkdown}
        />
      )

      const toggleButton = screen.getByTitle('Render markdown')
      await user.click(toggleButton)

      expect(onToggleMarkdown).toHaveBeenCalledTimes(1)
    })

    it('should change toggle button title based on renderMarkdown state', () => {
      const onClose = vi.fn()
      const onToggleMarkdown = vi.fn()

      const { rerender } = render(
        <QuickLookPopup
          item={mockEmbedding}
          onClose={onClose}
          onToggleMarkdown={onToggleMarkdown}
          renderMarkdown={false}
        />
      )

      expect(screen.getByTitle('Render markdown')).toBeInTheDocument()

      rerender(
        <QuickLookPopup
          item={mockEmbedding}
          onClose={onClose}
          onToggleMarkdown={onToggleMarkdown}
          renderMarkdown={true}
        />
      )

      expect(screen.getByTitle('Show raw text')).toBeInTheDocument()
    })
  })

  describe('Styling and Layout', () => {
    it('should have backdrop with blur effect', () => {
      const onClose = vi.fn()
      const { container } = render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      const backdrop = container.querySelector('.backdrop-blur-sm')
      expect(backdrop).toBeInTheDocument()
    })

    it('should center popup on screen', () => {
      const onClose = vi.fn()
      const { container } = render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      const popup = container.querySelector('.left-1\\/2.top-1\\/2')
      expect(popup).toBeInTheDocument()
    })

    it('should have max height constraint', () => {
      const onClose = vi.fn()
      const { container } = render(<QuickLookPopup item={mockEmbedding} onClose={onClose} />)

      const popup = container.querySelector('.max-h-\\[80vh\\]')
      expect(popup).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000)
      const longItem = { ...mockEmbedding, text: longText }
      const onClose = vi.fn()

      render(<QuickLookPopup item={longItem} onClose={onClose} />)

      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('should handle empty text', () => {
      const emptyItem = { ...mockEmbedding, text: '' }
      const onClose = vi.fn()

      render(<QuickLookPopup item={emptyItem} onClose={onClose} />)

      expect(screen.getByText(emptyItem.uri)).toBeInTheDocument()
    })

    it('should handle search result without task_type', () => {
      const itemWithoutTaskType = { ...mockSearchResult, task_type: undefined }
      const onClose = vi.fn()

      render(<QuickLookPopup item={itemWithoutTaskType} onClose={onClose} />)

      expect(screen.getByText(itemWithoutTaskType.uri)).toBeInTheDocument()
      expect(screen.queryByText('retrieval_document')).not.toBeInTheDocument()
    })

    it('should handle embedding without dimensions', () => {
      const itemWithoutEmbedding = { ...mockSearchResult, embedding: [] }
      const onClose = vi.fn()

      render(<QuickLookPopup item={itemWithoutEmbedding} onClose={onClose} />)

      // Empty embedding array should still show dimensions: 0
      expect(screen.getByText(/Dimensions: 0/)).toBeInTheDocument()
    })
  })
})
