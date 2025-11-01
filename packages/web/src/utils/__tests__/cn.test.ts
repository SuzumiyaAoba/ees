/**
 * Tests for cn utility function
 */

import { describe, expect, it } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  describe('Basic Functionality', () => {
    it('should merge single class name', () => {
      expect(cn('foo')).toBe('foo')
    })

    it('should merge multiple class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should merge many class names', () => {
      expect(cn('foo', 'bar', 'baz', 'qux')).toBe('foo bar baz qux')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })

    it('should handle empty string', () => {
      expect(cn('')).toBe('')
    })

    it('should merge classes with spaces', () => {
      expect(cn('foo bar', 'baz')).toBe('foo bar baz')
    })
  })

  describe('Conditional Classes', () => {
    it('should handle conditional classes with boolean true', () => {
      expect(cn('foo', true && 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes with boolean false', () => {
      expect(cn('foo', false && 'bar')).toBe('foo')
    })

    it('should handle object with boolean values', () => {
      expect(cn({
        foo: true,
        bar: false,
        baz: true,
      })).toBe('foo baz')
    })

    it('should handle mixed conditional and regular classes', () => {
      expect(cn('always', { conditional: true, hidden: false })).toBe('always conditional')
    })
  })

  describe('Tailwind Merge Functionality', () => {
    it('should merge conflicting Tailwind classes', () => {
      // Later class should override earlier one
      expect(cn('p-4', 'p-8')).toBe('p-8')
    })

    it('should merge conflicting padding classes', () => {
      expect(cn('px-4', 'px-8')).toBe('px-8')
    })

    it('should merge conflicting margin classes', () => {
      expect(cn('m-2', 'm-4')).toBe('m-4')
    })

    it('should keep non-conflicting classes', () => {
      expect(cn('p-4', 'm-4')).toBe('p-4 m-4')
    })

    it('should merge conflicting color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should merge conflicting background classes', () => {
      expect(cn('bg-white', 'bg-black')).toBe('bg-black')
    })

    it('should handle responsive variants correctly', () => {
      expect(cn('p-4', 'md:p-8')).toBe('p-4 md:p-8')
    })

    it('should merge same responsive variants', () => {
      expect(cn('md:p-4', 'md:p-8')).toBe('md:p-8')
    })
  })

  describe('Array Inputs', () => {
    it('should handle array of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('should handle nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz')
    })

    it('should handle mixed array and string inputs', () => {
      expect(cn('foo', ['bar', 'baz'], 'qux')).toBe('foo bar baz qux')
    })
  })

  describe('Null and Undefined Handling', () => {
    it('should filter out null values', () => {
      expect(cn('foo', null, 'bar')).toBe('foo bar')
    })

    it('should filter out undefined values', () => {
      expect(cn('foo', undefined, 'bar')).toBe('foo bar')
    })

    it('should handle mix of null, undefined, and strings', () => {
      expect(cn('foo', null, undefined, 'bar', null)).toBe('foo bar')
    })

    it('should handle all null/undefined', () => {
      expect(cn(null, undefined, null)).toBe('')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle complex combination of inputs', () => {
      expect(cn(
        'base-class',
        { active: true, disabled: false },
        ['extra', 'classes'],
        null,
        undefined,
        'final-class'
      )).toBe('base-class active extra classes final-class')
    })

    it('should handle Tailwind classes with conditional logic', () => {
      const isActive = true
      const isDisabled = false

      expect(cn(
        'px-4 py-2',
        isActive && 'bg-blue-500',
        isDisabled && 'opacity-50',
        'text-white'
      )).toBe('px-4 py-2 bg-blue-500 text-white')
    })

    it('should merge complex Tailwind utilities', () => {
      // Note: Order is preserved, flex-col is added at the end
      expect(cn(
        'flex items-center justify-center',
        'flex-col',
        'gap-4'
      )).toBe('flex items-center justify-center flex-col gap-4')
    })

    it('should handle overriding with responsive variants', () => {
      expect(cn(
        'p-2 md:p-4',
        'p-6 md:p-8'
      )).toBe('p-6 md:p-8')
    })

    it('should work with state variants', () => {
      expect(cn(
        'hover:bg-gray-100',
        'focus:bg-gray-200',
        'active:bg-gray-300'
      )).toBe('hover:bg-gray-100 focus:bg-gray-200 active:bg-gray-300')
    })

    it('should merge dark mode variants correctly', () => {
      // Note: Order is preserved as provided
      expect(cn(
        'bg-white dark:bg-black',
        'text-black dark:text-white'
      )).toBe('bg-white dark:bg-black text-black dark:text-white')
    })
  })

  describe('Real-world Usage Patterns', () => {
    it('should work for button variant pattern', () => {
      const variant = 'primary' as 'primary' | 'secondary'
      const size = 'lg' as 'sm' | 'lg'

      expect(cn(
        'btn',
        {
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
        },
        {
          'btn-sm': size === 'sm',
          'btn-lg': size === 'lg',
        }
      )).toBe('btn btn-primary btn-lg')
    })

    it('should work for card component pattern', () => {
      const isHoverable = true
      const hasShadow = true

      expect(cn(
        'rounded-lg border',
        isHoverable && 'hover:shadow-lg transition-shadow',
        hasShadow && 'shadow-md',
        'p-4'
      )).toBe('rounded-lg border hover:shadow-lg transition-shadow shadow-md p-4')
    })

    it('should work for input state pattern', () => {
      const hasError = true
      const isDisabled = false
      const isFocused = true

      expect(cn(
        'input',
        'border rounded',
        {
          'border-red-500': hasError,
          'border-gray-300': !hasError,
        },
        {
          'opacity-50 cursor-not-allowed': isDisabled,
          'ring-2 ring-blue-500': isFocused && !isDisabled,
        }
      )).toBe('input border rounded border-red-500 ring-2 ring-blue-500')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long class strings', () => {
      const longClass = 'a '.repeat(100).trim()
      expect(cn(longClass)).toBe(longClass)
    })

    it('should handle many arguments', () => {
      const result = cn('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j')
      expect(result).toBe('a b c d e f g h i j')
    })

    it('should handle duplicate classes', () => {
      // clsx/twMerge keeps duplicates for non-conflicting classes
      expect(cn('foo', 'bar', 'foo')).toBe('foo bar foo')
    })

    it('should handle classes with numbers', () => {
      expect(cn('p-4', 'text-2xl', 'gap-8')).toBe('p-4 text-2xl gap-8')
    })

    it('should handle arbitrary Tailwind values', () => {
      expect(cn('p-[10px]', 'bg-[#123456]')).toBe('p-[10px] bg-[#123456]')
    })

    it('should merge arbitrary values correctly', () => {
      expect(cn('p-[10px]', 'p-[20px]')).toBe('p-[20px]')
    })
  })
})
