/**
 * Tests for usePagination hook
 */

import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../usePagination'

describe('usePagination', () => {
  describe('Initial State', () => {
    it('should use default values when no options provided', () => {
      const { result } = renderHook(() => usePagination())

      expect(result.current.page).toBe(1)
      expect(result.current.limit).toBe(20)
    })

    it('should use provided initial values', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 5,
        initialLimit: 50,
      }))

      expect(result.current.page).toBe(5)
      expect(result.current.limit).toBe(50)
    })

    it('should use initialLimit over defaultLimit for initial state', () => {
      const { result } = renderHook(() => usePagination({
        initialLimit: 30,
        defaultLimit: 10,
      }))

      expect(result.current.limit).toBe(30)
    })
  })

  describe('Page Navigation', () => {
    it('should increment page on nextPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.page).toBe(2)
    })

    it('should allow multiple nextPage calls', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.nextPage()
        result.current.nextPage()
        result.current.nextPage()
      })

      expect(result.current.page).toBe(4)
    })

    it('should decrement page on previousPage', () => {
      const { result } = renderHook(() => usePagination({ initialPage: 3 }))

      act(() => {
        result.current.previousPage()
      })

      expect(result.current.page).toBe(2)
    })

    it('should not go below page 1 on previousPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.previousPage()
        result.current.previousPage()
      })

      expect(result.current.page).toBe(1)
    })

    it('should go to specific page with goToPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.goToPage(10)
      })

      expect(result.current.page).toBe(10)
    })

    it('should not allow negative page numbers with goToPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.goToPage(-5)
      })

      expect(result.current.page).toBe(1)
    })

    it('should not allow zero page number with goToPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.goToPage(0)
      })

      expect(result.current.page).toBe(1)
    })
  })

  describe('Limit Management', () => {
    it('should update limit with setLimit', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setLimit(50)
      })

      expect(result.current.limit).toBe(50)
    })

    it('should allow changing limit multiple times', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setLimit(10)
      })
      expect(result.current.limit).toBe(10)

      act(() => {
        result.current.setLimit(100)
      })
      expect(result.current.limit).toBe(100)
    })
  })

  describe('Page State Management', () => {
    it('should update page with setPage', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setPage(7)
      })

      expect(result.current.page).toBe(7)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset to initial values on resetPagination', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 1,
        defaultLimit: 20,
      }))

      act(() => {
        result.current.nextPage()
        result.current.setLimit(50)
      })

      expect(result.current.page).toBe(2)
      expect(result.current.limit).toBe(50)

      act(() => {
        result.current.resetPagination()
      })

      expect(result.current.page).toBe(1)
      expect(result.current.limit).toBe(20)
    })

    it('should reset to custom initial values', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 5,
        defaultLimit: 30,
      }))

      act(() => {
        result.current.goToPage(10)
        result.current.setLimit(100)
      })

      act(() => {
        result.current.resetPagination()
      })

      expect(result.current.page).toBe(5)
      expect(result.current.limit).toBe(30)
    })
  })

  describe('Pagination Info Calculation', () => {
    it('should calculate correct pagination info for first page', () => {
      const { result } = renderHook(() => usePagination({ initialLimit: 10 }))

      const info = result.current.getPaginationInfo(100)

      expect(info.totalPages).toBe(10)
      expect(info.startIndex).toBe(1)
      expect(info.endIndex).toBe(10)
      expect(info.hasNextPage).toBe(true)
      expect(info.hasPreviousPage).toBe(false)
    })

    it('should calculate correct pagination info for middle page', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 3,
        initialLimit: 10
      }))

      const info = result.current.getPaginationInfo(100)

      expect(info.totalPages).toBe(10)
      expect(info.startIndex).toBe(21)
      expect(info.endIndex).toBe(30)
      expect(info.hasNextPage).toBe(true)
      expect(info.hasPreviousPage).toBe(true)
    })

    it('should calculate correct pagination info for last page', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 10,
        initialLimit: 10
      }))

      const info = result.current.getPaginationInfo(100)

      expect(info.totalPages).toBe(10)
      expect(info.startIndex).toBe(91)
      expect(info.endIndex).toBe(100)
      expect(info.hasNextPage).toBe(false)
      expect(info.hasPreviousPage).toBe(true)
    })

    it('should handle partial last page correctly', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 3,
        initialLimit: 10
      }))

      const info = result.current.getPaginationInfo(25)

      expect(info.totalPages).toBe(3)
      expect(info.startIndex).toBe(21)
      expect(info.endIndex).toBe(25)
      expect(info.hasNextPage).toBe(false)
      expect(info.hasPreviousPage).toBe(true)
    })

    it('should handle empty results', () => {
      const { result } = renderHook(() => usePagination())

      const info = result.current.getPaginationInfo(0)

      expect(info.totalPages).toBe(0)
      expect(info.startIndex).toBe(1)
      expect(info.endIndex).toBe(0)
      expect(info.hasNextPage).toBe(false)
      expect(info.hasPreviousPage).toBe(false)
    })

    it('should handle single page of results', () => {
      const { result } = renderHook(() => usePagination({ initialLimit: 20 }))

      const info = result.current.getPaginationInfo(15)

      expect(info.totalPages).toBe(1)
      expect(info.startIndex).toBe(1)
      expect(info.endIndex).toBe(15)
      expect(info.hasNextPage).toBe(false)
      expect(info.hasPreviousPage).toBe(false)
    })

    it('should handle exact multiple of limit', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 2,
        initialLimit: 25
      }))

      const info = result.current.getPaginationInfo(100)

      expect(info.totalPages).toBe(4)
      expect(info.startIndex).toBe(26)
      expect(info.endIndex).toBe(50)
      expect(info.hasNextPage).toBe(true)
      expect(info.hasPreviousPage).toBe(true)
    })
  })

  describe('Combined Operations', () => {
    it('should work correctly with navigation and limit changes', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.nextPage()
        result.current.nextPage()
      })

      expect(result.current.page).toBe(3)

      act(() => {
        result.current.setLimit(10)
      })

      const info = result.current.getPaginationInfo(100)
      expect(info.startIndex).toBe(21)
      expect(info.endIndex).toBe(30)
    })

    it('should recalculate info when page changes', () => {
      const { result } = renderHook(() => usePagination({ initialLimit: 10 }))

      let info = result.current.getPaginationInfo(100)
      expect(info.startIndex).toBe(1)

      act(() => {
        result.current.nextPage()
      })

      info = result.current.getPaginationInfo(100)
      expect(info.startIndex).toBe(11)
    })

    it('should recalculate info when limit changes', () => {
      const { result } = renderHook(() => usePagination({
        initialPage: 2,
        initialLimit: 10
      }))

      let info = result.current.getPaginationInfo(100)
      expect(info.startIndex).toBe(11)
      expect(info.endIndex).toBe(20)

      act(() => {
        result.current.setLimit(20)
      })

      info = result.current.getPaginationInfo(100)
      expect(info.startIndex).toBe(21)
      expect(info.endIndex).toBe(40)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large page numbers', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.goToPage(1000000)
      })

      expect(result.current.page).toBe(1000000)
    })

    it('should handle very large limits', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setLimit(1000000)
      })

      const info = result.current.getPaginationInfo(100)
      expect(info.totalPages).toBe(1)
      expect(info.endIndex).toBe(100)
    })

    it('should handle very small total counts', () => {
      const { result } = renderHook(() => usePagination({ initialLimit: 100 }))

      const info = result.current.getPaginationInfo(1)

      expect(info.totalPages).toBe(1)
      expect(info.startIndex).toBe(1)
      expect(info.endIndex).toBe(1)
    })
  })
})
