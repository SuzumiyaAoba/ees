import { useRef } from 'react'
import { Badge } from '@/components/ui/Badge'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { getTextFileSize } from '@/utils/format'
import type { SearchResult } from '@/types/api'

interface SearchResultCardProps {
  result: SearchResult
  renderMarkdown: boolean
  onLongPress: (result: SearchResult) => void
  onSelect: (result: SearchResult) => void
}

export function SearchResultCard({
  result,
  renderMarkdown,
  onLongPress,
  onSelect,
}: SearchResultCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isLongPressRef = useRef<boolean>(false)

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`
  }

  const handleStart = () => {
    isLongPressRef.current = false

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress(result)
    }, 500)
  }

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!isLongPressRef.current) {
      onSelect(result)
    }

    isLongPressRef.current = false
  }

  const handleCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    isLongPressRef.current = false
  }

  return (
    <div
      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors select-none"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleCancel}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{result.uri}</h4>
        <Badge variant="default" className="font-mono">
          {formatSimilarity(result.similarity)}
        </Badge>
      </div>
      {renderMarkdown ? (
        <div className="mb-2 max-h-48 overflow-y-auto">
          <MarkdownRenderer content={result.text} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
          {result.text}
        </p>
      )}
      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span>Model: {result.model_name}</span>
          <span>Size: {getTextFileSize(result.text)}</span>
        </div>
        <span>Created: {new Date(result.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
