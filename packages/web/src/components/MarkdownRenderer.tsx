import { useEffect, useState, useRef } from 'react'
import MarkdownIt from 'markdown-it'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Global cache for rendered Markdown content
// Key: content hash (or content itself for simplicity)
// Value: rendered HTML string
const renderCache = new Map<string, string>()
const MAX_CACHE_SIZE = 100 // Limit cache size to prevent memory issues

// Simple hash function for content
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

// LRU cache management
function getCachedRender(key: string): string | undefined {
  const cached = renderCache.get(key)
  if (cached) {
    // Move to end (most recently used)
    renderCache.delete(key)
    renderCache.set(key, cached)
  }
  return cached
}

function setCachedRender(key: string, html: string): void {
  // Remove oldest entries if cache is full
  if (renderCache.size >= MAX_CACHE_SIZE) {
    const firstKey = renderCache.keys().next().value
    if (firstKey) {
      renderCache.delete(firstKey)
    }
  }
  renderCache.set(key, html)
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const highlighterRef = useRef<Highlighter | null>(null)
  const contentHashRef = useRef<string>('')

  useEffect(() => {
    let mounted = true

    const contentHash = hashContent(content)
    contentHashRef.current = contentHash

    // Check cache first
    const cachedHtml = getCachedRender(contentHash)
    if (cachedHtml) {
      setHtml(cachedHtml)
      setIsLoading(false)
      return
    }

    const initializeHighlighter = async () => {
      if (highlighterRef.current) {
        renderMarkdown(content, contentHash)
        return
      }

      try {
        const highlighter = await createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: Object.keys(bundledLanguages),
        })

        if (!mounted) return

        highlighterRef.current = highlighter
        renderMarkdown(content, contentHash)
      } catch (error) {
        console.error('Failed to initialize highlighter:', error)
        if (mounted) {
          // Fallback to rendering without syntax highlighting
          const md = new MarkdownIt()
          const renderedHtml = md.render(content)
          setHtml(renderedHtml)
          setIsLoading(false)
          // Cache the fallback result too
          setCachedRender(contentHash, renderedHtml)
        }
      }
    }

    const renderMarkdown = (text: string, hash: string) => {
      if (!highlighterRef.current) return

      const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        highlight: (code, lang) => {
          if (!highlighterRef.current) return code

          try {
            // Check if language is supported
            const loadedLanguages = highlighterRef.current.getLoadedLanguages()
            const language = loadedLanguages.includes(lang as never) ? lang : 'text'

            return highlighterRef.current.codeToHtml(code, {
              lang: language,
              themes: {
                light: 'github-light',
                dark: 'github-dark',
              },
            })
          } catch (error) {
            console.error('Failed to highlight code:', error)
            return `<pre><code>${code}</code></pre>`
          }
        },
      })

      const renderedHtml = md.render(text)
      setHtml(renderedHtml)
      setIsLoading(false)

      // Cache the rendered result
      setCachedRender(hash, renderedHtml)
    }

    initializeHighlighter()

    return () => {
      mounted = false
    }
  }, [content])

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    )
  }

  return (
    <div
      className={`markdown-content prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
