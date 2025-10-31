import type { Preview } from '@storybook/react'
import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(0, 0%, 100%)' },
        { name: 'dark', value: 'hsl(222, 47%, 11%)' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const client = new QueryClient()
      const isDark = context.globals.backgrounds?.value === 'hsl(222, 47%, 11%)'

      useEffect(() => {
        const htmlElement = document.documentElement
        if (isDark) {
          htmlElement.classList.add('dark')
        } else {
          htmlElement.classList.remove('dark')
        }

        return () => {
          htmlElement.classList.remove('dark')
        }
      }, [isDark])

      return (
        <QueryClientProvider client={client}>
          <div className="min-h-screen bg-background text-foreground p-4">
            <Story />
          </div>
        </QueryClientProvider>
      )
    },
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
}

export default preview


