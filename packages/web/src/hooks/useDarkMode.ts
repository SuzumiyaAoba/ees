import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(() => {
    // SSR-safe: check if window is defined
    if (typeof window === 'undefined') return 'light'

    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  })

  useEffect(() => {
    // SSR-safe: skip on server-side
    if (typeof window === 'undefined') return

    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
