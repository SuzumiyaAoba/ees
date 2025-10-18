/**
 * Reusable loading state component
 * Displays loading indicator with optional message using shadcn/ui styling
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function LoadingState({
  message = 'Loading...',
  className,
  size = 'md'
}: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
      {message && (
        <span className="ml-3 text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  )
}
