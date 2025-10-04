/**
 * Reusable error display component
 * Shows error messages in a consistent card format
 */

import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export interface ErrorCardProps {
  error: Error | string
  title?: string
  className?: string
}

export function ErrorCard({ error, title = 'Error', className = '' }: ErrorCardProps) {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <Card className={`border-destructive ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">{title}</p>
            <p className="text-sm text-destructive/80 mt-1">{errorMessage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
