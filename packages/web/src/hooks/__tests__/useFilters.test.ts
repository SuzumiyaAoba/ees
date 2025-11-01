/**
 * Tests for useFilters hook
 */

import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from '../useFilters'

interface TestFilters extends Record<string, unknown> {
  search: string
  status: string
  category: string
  minPrice: number
  maxPrice: number
  isActive: boolean
}

describe('useFilters', () => {
  const defaultFilters: TestFilters = {
    search: '',
    status: 'all',
    category: 'all',
    minPrice: 0,
    maxPrice: 1000,
    isActive: true,
  }

  describe('Initial State', () => {
    it('should initialize with provided filters', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      expect(result.current.filters).toEqual(defaultFilters)
    })

    it('should have no active filters initially', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should work with different filter types', () => {
      interface SimpleFilters extends Record<string, unknown> {
        name: string
        age: number
      }

      const simpleFilters: SimpleFilters = {
        name: 'John',
        age: 30,
      }

      const { result } = renderHook(() => useFilters({
        initialFilters: simpleFilters
      }))

      expect(result.current.filters).toEqual(simpleFilters)
    })
  })

  describe('updateFilter', () => {
    it('should update a single filter', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test query')
      })

      expect(result.current.filters.search).toBe('test query')
      expect(result.current.filters.status).toBe('all') // Other filters unchanged
    })

    it('should update multiple filters independently', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'laptop')
      })

      act(() => {
        result.current.updateFilter('category', 'electronics')
      })

      act(() => {
        result.current.updateFilter('minPrice', 100)
      })

      expect(result.current.filters).toEqual({
        ...defaultFilters,
        search: 'laptop',
        category: 'electronics',
        minPrice: 100,
      })
    })

    it('should update number filters', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('maxPrice', 500)
      })

      expect(result.current.filters.maxPrice).toBe(500)
    })

    it('should update boolean filters', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('isActive', false)
      })

      expect(result.current.filters.isActive).toBe(false)
    })

    it('should type-check filter keys and values', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        // TypeScript should only allow valid keys
        result.current.updateFilter('search', 'valid')
        result.current.updateFilter('minPrice', 100)
        result.current.updateFilter('isActive', true)

        // These would be TypeScript errors (commented out as they won't compile):
        // result.current.updateFilter('invalidKey', 'value')
        // result.current.updateFilter('search', 123) // wrong type
      })

      expect(result.current.filters.search).toBe('valid')
    })
  })

  describe('setFilters', () => {
    it('should set all filters at once with object', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      const newFilters: TestFilters = {
        search: 'new search',
        status: 'active',
        category: 'books',
        minPrice: 50,
        maxPrice: 500,
        isActive: false,
      }

      act(() => {
        result.current.setFilters(newFilters)
      })

      expect(result.current.filters).toEqual(newFilters)
    })

    it('should set filters using updater function', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.setFilters(prev => ({
          ...prev,
          search: 'updated',
          minPrice: (prev as TestFilters).minPrice + 100,
        }))
      })

      expect(result.current.filters.search).toBe('updated')
      expect(result.current.filters.minPrice).toBe(100)
    })

    it('should allow chaining updates with updater function', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.setFilters(prev => ({
          ...prev,
          minPrice: 100,
        }))
      })

      act(() => {
        result.current.setFilters(prev => ({
          ...prev,
          maxPrice: (prev as TestFilters).minPrice + 200,
        }))
      })

      expect(result.current.filters.minPrice).toBe(100)
      expect(result.current.filters.maxPrice).toBe(300)
    })
  })

  describe('resetFilters', () => {
    it('should reset all filters to initial values', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
        result.current.updateFilter('status', 'active')
        result.current.updateFilter('minPrice', 100)
      })

      expect(result.current.filters).not.toEqual(defaultFilters)

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters).toEqual(defaultFilters)
    })

    it('should reset hasActiveFilters to false', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
      })

      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should work with custom initial filters', () => {
      const customFilters: TestFilters = {
        search: 'custom',
        status: 'pending',
        category: 'tech',
        minPrice: 50,
        maxPrice: 500,
        isActive: false,
      }

      const { result } = renderHook(() => useFilters({
        initialFilters: customFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'changed')
      })

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters).toEqual(customFilters)
    })
  })

  describe('hasActiveFilters', () => {
    it('should be false when no filters are changed', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should be true when any filter is changed', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be true when number filter is changed', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('minPrice', 50)
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be true when boolean filter is changed', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('isActive', false)
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be false when filter is changed back to initial value', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
      })

      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.updateFilter('search', '')
      })

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should be true when multiple filters are changed', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
        result.current.updateFilter('status', 'active')
        result.current.updateFilter('minPrice', 100)
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be true when some filters match initial and some do not', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'test')
        result.current.updateFilter('status', 'all') // Same as initial
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe('Combined Operations', () => {
    it('should work correctly with mixed operations', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'laptop')
      })

      act(() => {
        result.current.setFilters(prev => ({
          ...prev,
          category: 'electronics',
        }))
      })

      act(() => {
        result.current.updateFilter('minPrice', 100)
      })

      expect(result.current.filters).toEqual({
        ...defaultFilters,
        search: 'laptop',
        category: 'electronics',
        minPrice: 100,
      })
      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters).toEqual(defaultFilters)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should handle rapid updates correctly', () => {
      const { result } = renderHook(() => useFilters({
        initialFilters: defaultFilters
      }))

      act(() => {
        result.current.updateFilter('search', 'a')
        result.current.updateFilter('search', 'ab')
        result.current.updateFilter('search', 'abc')
      })

      expect(result.current.filters.search).toBe('abc')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty object as filters', () => {
      interface EmptyFilters extends Record<string, never> {}
      const emptyFilters: EmptyFilters = {}

      const { result } = renderHook(() => useFilters({
        initialFilters: emptyFilters
      }))

      expect(result.current.filters).toEqual({})
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should handle filters with null values', () => {
      interface NullableFilters extends Record<string, unknown> {
        name: string | null
        value: number | null
      }

      const nullableFilters: NullableFilters = {
        name: null,
        value: null,
      }

      const { result } = renderHook(() => useFilters({
        initialFilters: nullableFilters
      }))

      act(() => {
        result.current.updateFilter('name', 'test')
      })

      expect(result.current.filters.name).toBe('test')
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should handle filters with undefined values', () => {
      interface OptionalFilters extends Record<string, unknown> {
        name?: string
        value?: number
      }

      const optionalFilters: OptionalFilters = {
        name: undefined,
        value: undefined,
      }

      const { result } = renderHook(() => useFilters({
        initialFilters: optionalFilters
      }))

      act(() => {
        result.current.updateFilter('name', 'test')
      })

      expect(result.current.filters.name).toBe('test')
      expect(result.current.hasActiveFilters).toBe(true)
    })
  })
})
