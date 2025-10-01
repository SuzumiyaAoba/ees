/**
 * Test utilities and helpers
 * Provides custom render function with React Query support
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Create a new QueryClient for each test to avoid cross-test pollution
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable garbage collection
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Custom render function that wraps components with QueryClientProvider
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const testQueryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: testQueryClient,
  }
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithQueryClient as render }
