import { useEffect, useState, useRef } from 'react'
import MarkdownIt from 'markdown-it'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const highlighterRef = useRef<Highlighter | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeHighlighter = async () => {
      if (highlighterRef.current) {
        renderMarkdown(content)
        return
      }

      try {
        const highlighter = await createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: Object.keys(bundledLanguages),
        })

        if (!mounted) return

        highlighterRef.current = highlighter
        renderMarkdown(content)
      } catch (error) {
        console.error('Failed to initialize highlighter:', error)
        if (mounted) {
          // Fallback to rendering without syntax highlighting
          const md = new MarkdownIt()
          setHtml(md.render(content))
          setIsLoading(false)
        }
      }
    }

    const renderMarkdown = (text: string) => {
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

      setHtml(md.render(text))
      setIsLoading(false)
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
