import { useEffect } from 'react'
import { X, FileText, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import type { Embedding, SearchResult } from '@/types/api'

interface QuickLookPopupProps {
  item: Embedding | SearchResult | null
  onClose: () => void
  renderMarkdown?: boolean
  onToggleMarkdown?: () => void
}

/**
 * Quick look popup component that displays content preview on long press
 * Displays in the center of the screen with max height of 80vh
 */
export function QuickLookPopup({
  item,
  onClose,
  renderMarkdown = false,
  onToggleMarkdown,
}: QuickLookPopupProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent background scroll when modal is open
  useEffect(() => {
    // Save current body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow

    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden'

    // Restore original overflow on unmount
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  if (!item) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Popup - Centered on screen */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[80vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="shadow-xl border-2 h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate" title={item.uri}>
                  {item.uri}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{item.model_name}</Badge>
                  {'task_type' in item && item.task_type && (
                    <Badge variant="outline" className="bg-info/10 dark:bg-info/20 border-info/30">
                      {item.task_type}
                    </Badge>
                  )}
                  {'similarity' in item && (
                    <Badge variant="default" className="font-mono">
                      {Math.round(item.similarity * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onToggleMarkdown && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onToggleMarkdown}
                    title={renderMarkdown ? 'Show raw text' : 'Render markdown'}
                  >
                    {renderMarkdown ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <FileCode className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 rounded-md bg-muted/30 p-4">
              {renderMarkdown ? (
                <MarkdownRenderer content={item.text} />
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {item.text}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground flex-shrink-0">
              <span>Created: {formatDate(item.created_at)}</span>
              {'embedding' in item && (
                <span>Dimensions: {item.embedding.length}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
