/**
 * Tests for Button component
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/__tests__/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>)

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should render button without crashing', () => {
      const { container } = render(<Button>Test</Button>)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<Button className="custom-class">Test</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
    })

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
    })

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
    })

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
    })

    it('should render icon size', () => {
      render(<Button size="icon">⚙</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'w-10')
    })
  })

  describe('User Interaction', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Click me</Button>)

      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not trigger onClick when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick} disabled>Disabled</Button>)

      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should have disabled styling when disabled', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Props', () => {
    it('should forward HTML button attributes', () => {
      render(
        <Button type="submit" name="submit-button" data-testid="test-button">
          Submit
        </Button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('name', 'submit-button')
      expect(button).toHaveAttribute('data-testid', 'test-button')
    })

    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLButtonElement | null }

      render(<Button ref={ref}>Button with ref</Button>)

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should handle aria-label for accessibility', () => {
      render(<Button aria-label="Close dialog">×</Button>)

      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should render with children as ReactNode', () => {
      render(
        <Button>
          <span>Icon</span> Text
        </Button>
      )

      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Text')).toBeInTheDocument()
    })

    it('should handle empty children', () => {
      const { container } = render(<Button />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should combine variant and size props', () => {
      render(<Button variant="outline" size="lg">Large Outline</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('h-11')
    })
  })
})
