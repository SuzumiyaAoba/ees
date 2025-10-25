import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: {
    container: 'py-6',
    icon: 'h-8 w-8 mb-2',
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'py-8',
    icon: 'h-12 w-12 mb-4',
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-12',
    icon: 'h-16 w-16 mb-6',
    title: 'text-lg',
    description: 'text-base',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizes = sizeClasses[size]

  return (
    <div className={`text-center text-muted-foreground ${sizes.container} ${className}`}>
      {icon && (
        <div className={`mx-auto ${sizes.icon} opacity-50`}>
          {icon}
        </div>
      )}
      <p className={`font-medium ${sizes.title}`}>{title}</p>
      {description && (
        <p className={`${sizes.description} mt-1`}>{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
