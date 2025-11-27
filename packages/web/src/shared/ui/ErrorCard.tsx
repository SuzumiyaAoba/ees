/**
 * Reusable error display component
 * Shows error messages using shadcn/ui Alert component
 */

import { AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'

export interface ErrorCardProps {
  error: Error | string
  title?: string
  className?: string
}

export function ErrorCard({ error, title = 'Error', className = '' }: ErrorCardProps) {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  )
}
