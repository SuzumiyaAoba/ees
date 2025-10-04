/**
 * Reusable pagination controls component
 * Displays page navigation buttons and current page info
 */

import { Button } from '@/components/ui/Button'
import type { UsePaginationReturn } from '@/hooks/usePagination'

export interface PaginationControlsProps {
  pagination: UsePaginationReturn
  total: number
  className?: string
}

export function PaginationControls({ pagination, total, className = '' }: PaginationControlsProps) {
  const { page, limit, nextPage, previousPage, getPaginationInfo } = pagination
  const paginationInfo = getPaginationInfo(total)

  if (total <= limit) {
    return null
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-muted-foreground">
        Showing {paginationInfo.startIndex}-{paginationInfo.endIndex} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={previousPage}
          disabled={!paginationInfo.hasPreviousPage}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {paginationInfo.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={!paginationInfo.hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
