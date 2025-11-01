/**
 * Tests for MarkdownRenderer component
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MarkdownRenderer } from '../MarkdownRenderer'

// Mock shiki to avoid loading actual syntax highlighter in tests
vi.mock('shiki', () => ({
  createHighlighter: vi.fn(() =>
    Promise.resolve({
      getLoadedLanguages: () => ['javascript', 'typescript', 'python', 'text'],
      codeToHtml: (code: string) => `<pre><code>${code}</code></pre>`,
    })
  ),
  bundledLanguages: {},
}))

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render simple markdown content', async () => {
      const content = '# Hello World'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText(/Hello World/i)).toBeInTheDocument()
      })
    })

    it('should render paragraph text', async () => {
      const content = 'This is a paragraph of text.'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText(/This is a paragraph of text/i)).toBeInTheDocument()
      })
    })

    it('should apply custom className', async () => {
      const content = 'Test content'
      const customClass = 'custom-markdown-class'
      const { container } = render(<MarkdownRenderer content={content} className={customClass} />)

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveClass(customClass)
      })
    })
  })

  describe('Front Matter Parsing', () => {
    it('should parse and display YAML front matter as table', async () => {
      const content = `---
title: Test Document
author: John Doe
version: "1.0"
---

# Content Here`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
        expect(screen.getByText('Test Document')).toBeInTheDocument()
        expect(screen.getByText('author')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('version')).toBeInTheDocument()
        expect(screen.getByText('1.0')).toBeInTheDocument()
      })
    })

    it('should handle content without front matter', async () => {
      const content = '# Just Content'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText(/Just Content/i)).toBeInTheDocument()
      })
    })

    it('should format array values in front matter as JSON', async () => {
      const content = `---
tags: [markdown, test, documentation]
---

# Content`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('tags')).toBeInTheDocument()
        // Array should be formatted as JSON string
        expect(screen.getByText(/markdown.*test.*documentation/)).toBeInTheDocument()
      })
    })

    it('should handle object values in front matter', async () => {
      const content = `---
metadata:
  version: 1.0
  status: published
---

# Content`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('metadata')).toBeInTheDocument()
        // Object should be formatted as JSON string
        expect(screen.getByText(/version/)).toBeInTheDocument()
      })
    })

    it('should handle empty front matter values', async () => {
      const content = `---
title:
author: null
---

# Content`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
        expect(screen.getByText('author')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      const content = '# Test'
      const { container } = render(<MarkdownRenderer content={content} />)

      // Check for loading skeleton (animate-pulse class)
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
    })

    it('should hide loading skeleton after content loads', async () => {
      const content = '# Test'
      const { container } = render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        const skeleton = container.querySelector('.animate-pulse')
        expect(skeleton).not.toBeInTheDocument()
      })
    })
  })

  describe('Markdown Features', () => {
    it('should render headings at different levels', async () => {
      const content = `# H1
## H2
### H3`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.getByText('H2')).toBeInTheDocument()
        expect(screen.getByText('H3')).toBeInTheDocument()
      })
    })

    it('should render links', async () => {
      const content = '[Link Text](https://example.com)'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        const link = screen.getByText('Link Text')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com')
      })
    })

    it('should render lists', async () => {
      const content = `- Item 1
- Item 2
- Item 3`

      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
        expect(screen.getByText('Item 2')).toBeInTheDocument()
        expect(screen.getByText('Item 3')).toBeInTheDocument()
      })
    })

    it('should render code blocks', async () => {
      const content = '```javascript\nconst x = 42;\n```'
      const { container } = render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        const codeBlock = container.querySelector('pre')
        expect(codeBlock).toBeInTheDocument()
        expect(codeBlock?.textContent).toContain('const x = 42')
      })
    })

    it('should render inline code', async () => {
      const content = 'This is `inline code` text'
      const { container } = render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        const code = container.querySelector('code')
        expect(code).toBeInTheDocument()
        expect(code?.textContent).toBe('inline code')
      })
    })
  })

  describe('Content Updates', () => {
    it('should update when content changes', async () => {
      const { rerender } = render(<MarkdownRenderer content="# First" />)

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument()
      })

      rerender(<MarkdownRenderer content="# Second" />)

      await waitFor(() => {
        expect(screen.getByText('Second')).toBeInTheDocument()
        expect(screen.queryByText('First')).not.toBeInTheDocument()
      })
    })

    it('should update front matter when content changes', async () => {
      const firstContent = `---
title: First Title
---
# Content`

      const secondContent = `---
title: Second Title
---
# Content`

      const { rerender } = render(<MarkdownRenderer content={firstContent} />)

      await waitFor(() => {
        expect(screen.getByText('First Title')).toBeInTheDocument()
      })

      rerender(<MarkdownRenderer content={secondContent} />)

      await waitFor(() => {
        expect(screen.getByText('Second Title')).toBeInTheDocument()
        expect(screen.queryByText('First Title')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const { container } = render(<MarkdownRenderer content="" />)

      await waitFor(() => {
        expect(container.querySelector('.markdown-content')).toBeInTheDocument()
      })
    })

    it('should handle content with only whitespace', async () => {
      const { container } = render(<MarkdownRenderer content="   \n   \n   " />)

      await waitFor(() => {
        expect(container.querySelector('.markdown-content')).toBeInTheDocument()
      })
    })

    it('should handle malformed front matter gracefully', async () => {
      const content = `---
this is not valid yaml: [unclosed
---

# Content`

      render(<MarkdownRenderer content={content} />)

      // Should still render the content without crashing
      await waitFor(() => {
        expect(screen.getByText(/Content/i)).toBeInTheDocument()
      })
    })

    it('should handle very long content', async () => {
      const content = 'a'.repeat(10000)
      const { container } = render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(container.querySelector('.markdown-content')).toBeInTheDocument()
      })
    })
  })
})
