/**
 * Reusable filters hook
 * Manages filter state with type-safe updates
 */

import { useState, useCallback, useMemo } from 'react'

export interface UseFiltersOptions<T> {
  initialFilters: T
}

export interface UseFiltersReturn<T> {
  filters: T
  setFilters: (filters: T | ((prev: T) => T)) => void
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void
  resetFilters: () => void
  hasActiveFilters: boolean
}

export function useFilters<T extends Record<string, unknown>>(
  options: UseFiltersOptions<T>
): UseFiltersReturn<T> {
  const { initialFilters } = options

  const [filters, setFilters] = useState<T>(initialFilters)

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const initialValue = initialFilters[key as keyof T]
      return value !== initialValue
    })
  }, [filters, initialFilters])

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  }
}
