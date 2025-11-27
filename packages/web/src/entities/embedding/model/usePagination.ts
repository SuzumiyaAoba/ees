/**
 * Reusable pagination hook
 * Manages pagination state and provides navigation controls
 */

import { useState, useCallback, useMemo } from 'react'

export interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  defaultLimit?: number
}

export interface UsePaginationReturn {
  page: number
  limit: number
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  nextPage: () => void
  previousPage: () => void
  goToPage: (page: number) => void
  resetPagination: () => void
  getPaginationInfo: (total: number) => {
    totalPages: number
    startIndex: number
    endIndex: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    defaultLimit = 20,
  } = options

  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const nextPage = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  const previousPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1))
  }, [])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  const resetPagination = useCallback(() => {
    setPage(initialPage)
    setLimit(defaultLimit)
  }, [initialPage, defaultLimit])

  const getPaginationInfo = useCallback((total: number) => {
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit + 1
    const endIndex = Math.min(page * limit, total)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return {
      totalPages,
      startIndex,
      endIndex,
      hasNextPage,
      hasPreviousPage,
    }
  }, [page, limit])

  return useMemo(() => ({
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    previousPage,
    goToPage,
    resetPagination,
    getPaginationInfo,
  }), [page, limit, nextPage, previousPage, goToPage, resetPagination, getPaginationInfo])
}
