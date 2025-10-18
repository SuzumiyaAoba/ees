/**
 * Reusable pagination controls component
 * Displays page navigation buttons and current page info using shadcn/ui components
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { UsePaginationReturn } from '@/hooks/usePagination'

export interface PaginationControlsProps {
  pagination: UsePaginationReturn
  total: number
  className?: string
}

export function PaginationControls({ pagination, total, className }: PaginationControlsProps) {
  const { page, limit, nextPage, previousPage, getPaginationInfo } = pagination
  const paginationInfo = getPaginationInfo(total)

  if (total <= limit) {
    return null
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{paginationInfo.startIndex}</span>-
        <span className="font-medium">{paginationInfo.endIndex}</span> of{' '}
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={previousPage}
          disabled={!paginationInfo.hasPreviousPage}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page <span className="font-medium">{page}</span> of{' '}
          <span className="font-medium">{paginationInfo.totalPages}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={!paginationInfo.hasNextPage}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
