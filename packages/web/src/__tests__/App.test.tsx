/**
 * Tests for App component
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App', () => {
  describe('Rendering', () => {
    it('should render app without crashing', () => {
      render(<App />)

      expect(screen.getByText('EES Dashboard')).toBeInTheDocument()
    })

    it('should render navigation tabs', () => {
      render(<App />)

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /migration/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /config/i })).toBeInTheDocument()
    })

    it('should render search tab by default', () => {
      render(<App />)

      // Search interface should be visible
      expect(screen.getByText('Semantic Search')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to browse tab when clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const browseTab = screen.getByRole('button', { name: /browse/i })
      await user.click(browseTab)

      // EmbeddingList should be visible
      expect(screen.getByText(/embeddings list/i)).toBeInTheDocument()
    })

    it('should switch to upload tab when clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const uploadTab = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadTab)

      // FileUpload should be visible
      expect(screen.getByText(/upload files/i)).toBeInTheDocument()
    })

    it('should switch to migration tab when clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const migrationTab = screen.getByRole('button', { name: /migration/i })
      await user.click(migrationTab)

      // ModelMigration should be visible
      expect(screen.getByText(/model migration/i)).toBeInTheDocument()
    })

    it('should switch to config tab when clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const configTab = screen.getByRole('button', { name: /config/i })
      await user.click(configTab)

      // ProviderManagement should be visible
      expect(screen.getByText(/provider configuration/i)).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('should render QueryClientProvider wrapper', () => {
      const { container } = render(<App />)

      // App should render without errors (QueryClientProvider is internal)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should maintain tab state across re-renders', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<App />)

      // Switch to browse tab
      const browseTab = screen.getByRole('button', { name: /browse/i })
      await user.click(browseTab)

      // Rerender the component
      rerender(<App />)

      // Should still be on browse tab
      expect(screen.getByText(/embeddings list/i)).toBeInTheDocument()
    })
  })
})
