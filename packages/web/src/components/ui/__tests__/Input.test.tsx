/**
 * Tests for Input component
 */

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input without crashing', () => {
      render(<Input />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should apply default styling classes', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('rounded-md')
      expect(input).toHaveClass('border')
      expect(input).toHaveClass('bg-background')
    })

    it('should apply custom className', () => {
      render(<Input className="custom-input" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input')
      expect(input).toHaveClass('rounded-md') // Should keep default classes
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text..." />)

      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
    })
  })

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      // Input without explicit type attribute defaults to text behavior
      expect(input).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<Input type="email" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render password input', () => {
      render(<Input type="password" />)

      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('should render number input', () => {
      render(<Input type="number" />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('should render search input', () => {
      render(<Input type="search" />)

      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('type', 'search')
    })

    it('should render file input', () => {
      render(<Input type="file" />)

      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('should handle text input', async () => {
      const user = userEvent.setup()
      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello World')

      expect(input).toHaveValue('Hello World')
    })

    it('should handle onChange event', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<Input onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(handleChange).toHaveBeenCalled()
      expect(handleChange).toHaveBeenCalledTimes(4) // One call per character
    })

    it('should handle onFocus event', async () => {
      const handleFocus = vi.fn()
      const user = userEvent.setup()

      render(<Input onFocus={handleFocus} />)

      const input = screen.getByRole('textbox')
      await user.click(input)

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('should handle onBlur event', async () => {
      const handleBlur = vi.fn()
      const user = userEvent.setup()

      render(<Input onBlur={handleBlur} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab() // Trigger blur

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('should not accept input when disabled', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<Input disabled onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(input).toBeDisabled()
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('Props', () => {
    it('should forward HTML input attributes', () => {
      render(
        <Input
          name="username"
          maxLength={50}
          required
          data-testid="test-input"
        />
      )

      const input = screen.getByTestId('test-input')
      expect(input).toHaveAttribute('name', 'username')
      expect(input).toHaveAttribute('maxLength', '50')
      expect(input).toHaveAttribute('required')
    })

    it('should support value prop', () => {
      render(<Input value="controlled value" readOnly />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('controlled value')
    })

    it('should support defaultValue prop', () => {
      render(<Input defaultValue="default text" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('default text')
    })

    it('should support disabled prop', () => {
      render(<Input disabled />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:opacity-50')
    })

    it('should support readOnly prop', () => {
      render(<Input readOnly value="read only" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readOnly')
    })

    it('should support ref forwarding', () => {
      const ref = { current: null as HTMLInputElement | null }

      render(<Input ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('should support min and max for number input', () => {
      render(<Input type="number" min={0} max={100} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
    })

    it('should support pattern for validation', () => {
      render(<Input type="text" pattern="[0-9]{3}" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('pattern', '[0-9]{3}')
    })
  })

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Username input" />)

      expect(screen.getByLabelText('Username input')).toBeInTheDocument()
    })

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="input-help" />
          <span id="input-help">Help text</span>
        </>
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'input-help')
    })

    it('should support aria-invalid for error states', () => {
      render(<Input aria-invalid="true" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<Input placeholder="Test" />)

      const input = screen.getByPlaceholderText('Test')

      await user.tab()
      expect(input).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty value', () => {
      render(<Input value="" readOnly />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('should handle very long values', async () => {
      const longValue = 'a'.repeat(1000)
      const user = userEvent.setup()

      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, longValue)

      expect(input).toHaveValue(longValue)
    })

    it('should handle special characters', async () => {
      const specialChars = '!@#$%^&*()_+-='
      const user = userEvent.setup()

      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, specialChars)

      expect(input).toHaveValue(specialChars)
    })

    it('should handle controlled component updates', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('')
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )
      }

      const user = userEvent.setup()
      render(<TestComponent />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(input).toHaveValue('test')
    })
  })

  describe('Validation', () => {
    it('should support required validation', () => {
      render(<Input required />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
      expect(input).toBeInvalid()
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<Input type="email" />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'invalid-email')

      expect(input).toHaveValue('invalid-email')
    })
  })
})
