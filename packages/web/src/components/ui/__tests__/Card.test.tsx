/**
 * Tests for Card component and its sub-components
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card'

describe('Card', () => {
  describe('Rendering', () => {
    it('should render card without crashing', () => {
      render(<Card>Card content</Card>)

      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should apply default styling classes', () => {
      const { container } = render(<Card>Test</Card>)
      const card = container.firstChild as HTMLElement

      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('bg-card')
    })

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>)
      const card = container.firstChild as HTMLElement

      expect(card).toHaveClass('custom-card')
      expect(card).toHaveClass('rounded-lg') // Should keep default classes
    })
  })

  describe('Props', () => {
    it('should forward HTML div attributes', () => {
      render(
        <Card data-testid="test-card" role="article">
          Content
        </Card>
      )

      const card = screen.getByTestId('test-card')
      expect(card).toHaveAttribute('role', 'article')
    })

    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLDivElement | null }

      render(<Card ref={ref}>Card with ref</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Composition', () => {
    it('should render complete card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>Main content area</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card description text')).toBeInTheDocument()
      expect(screen.getByText('Main content area')).toBeInTheDocument()
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('should work with partial composition', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>Content Only</CardContent>
        </Card>
      )

      expect(screen.getByText('Title Only')).toBeInTheDocument()
      expect(screen.getByText('Content Only')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should render empty card', () => {
      const { container } = render(<Card />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle complex children', () => {
      render(
        <Card>
          <div>
            <span>Nested</span> <strong>content</strong>
          </div>
        </Card>
      )

      expect(screen.getByText('Nested')).toBeInTheDocument()
      expect(screen.getByText('content')).toBeInTheDocument()
    })
  })
})

describe('CardHeader', () => {
  describe('Rendering', () => {
    it('should render header without crashing', () => {
      render(<CardHeader>Header content</CardHeader>)

      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('should apply header styling', () => {
      const { container } = render(<CardHeader>Test</CardHeader>)
      const header = container.firstChild as HTMLElement

      expect(header).toHaveClass('flex', 'flex-col', 'p-6')
    })

    it('should apply custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Test</CardHeader>)
      const header = container.firstChild as HTMLElement

      expect(header).toHaveClass('custom-header')
    })
  })

  describe('Props', () => {
    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLDivElement | null }

      render(<CardHeader ref={ref}>Header</CardHeader>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})

describe('CardTitle', () => {
  describe('Rendering', () => {
    it('should render title as h3 element', () => {
      render(<CardTitle>Test Title</CardTitle>)

      const title = screen.getByText('Test Title')
      expect(title.tagName).toBe('H3')
    })

    it('should apply title styling', () => {
      render(<CardTitle>Title</CardTitle>)

      const title = screen.getByText('Title')
      expect(title).toHaveClass('text-2xl', 'font-semibold')
    })

    it('should apply custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)

      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
    })
  })

  describe('Props', () => {
    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLParagraphElement | null }

      render(<CardTitle ref={ref}>Title</CardTitle>)

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('Accessibility', () => {
    it('should provide semantic heading structure', () => {
      render(<CardTitle>Accessible Title</CardTitle>)

      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveTextContent('Accessible Title')
    })
  })
})

describe('CardDescription', () => {
  describe('Rendering', () => {
    it('should render description as paragraph', () => {
      render(<CardDescription>Test description</CardDescription>)

      const desc = screen.getByText('Test description')
      expect(desc.tagName).toBe('P')
    })

    it('should apply description styling', () => {
      render(<CardDescription>Description</CardDescription>)

      const desc = screen.getByText('Description')
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('should apply custom className', () => {
      render(<CardDescription className="custom-desc">Desc</CardDescription>)

      const desc = screen.getByText('Desc')
      expect(desc).toHaveClass('custom-desc')
    })
  })

  describe('Props', () => {
    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLParagraphElement | null }

      render(<CardDescription ref={ref}>Description</CardDescription>)

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })
})

describe('CardContent', () => {
  describe('Rendering', () => {
    it('should render content without crashing', () => {
      render(<CardContent>Content text</CardContent>)

      expect(screen.getByText('Content text')).toBeInTheDocument()
    })

    it('should apply content styling', () => {
      const { container } = render(<CardContent>Content</CardContent>)
      const content = container.firstChild as HTMLElement

      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('should apply custom className', () => {
      const { container } = render(<CardContent className="custom-content">Test</CardContent>)
      const content = container.firstChild as HTMLElement

      expect(content).toHaveClass('custom-content')
    })
  })

  describe('Props', () => {
    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLDivElement | null }

      render(<CardContent ref={ref}>Content</CardContent>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})

describe('CardFooter', () => {
  describe('Rendering', () => {
    it('should render footer without crashing', () => {
      render(<CardFooter>Footer text</CardFooter>)

      expect(screen.getByText('Footer text')).toBeInTheDocument()
    })

    it('should apply footer styling', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>)
      const footer = container.firstChild as HTMLElement

      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('should apply custom className', () => {
      const { container } = render(<CardFooter className="custom-footer">Test</CardFooter>)
      const footer = container.firstChild as HTMLElement

      expect(footer).toHaveClass('custom-footer')
    })
  })

  describe('Props', () => {
    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLDivElement | null }

      render(<CardFooter ref={ref}>Footer</CardFooter>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should handle multiple children in flex layout', () => {
      render(
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })
})
