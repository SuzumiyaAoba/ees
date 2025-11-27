import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react'

// StatCard Component
const statCardVariants = cva(
  'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
  {
    variants: {
      variant: {
        default: 'border-l-4 border-l-primary',
        success: 'border-l-4 border-l-success',
        warning: 'border-l-4 border-l-warning',
        error: 'border-l-4 border-l-destructive',
        info: 'border-l-4 border-l-info',
      },
      glowing: {
        true: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      glowing: false,
    },
  }
)

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive?: boolean
    label?: string
  }
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant,
  glowing,
  className,
  ...props
}) => {
  const TrendIcon = trend
    ? trend.isPositive
      ? TrendingUp
      : trend.value === 0
        ? Minus
        : TrendingDown
    : null

  return (
    <Card
      className={cn(statCardVariants({ variant, glowing }), 'p-6', className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold">{value}</p>
            {trend && TrendIcon && (
              <span
                className={cn(
                  'flex items-center text-sm font-medium',
                  trend.isPositive
                    ? 'text-success'
                    : trend.value === 0
                      ? 'text-muted-foreground'
                      : 'text-destructive'
                )}
              >
                <TrendIcon className="h-4 w-4 mr-1" />
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
          {trend?.label && (
            <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
          )}
        </div>
        {Icon && (
          <div className="ml-4">
            <div
              className={cn(
                'p-3 rounded-lg',
                variant === 'success' && 'bg-success/10 text-success',
                variant === 'warning' && 'bg-warning/10 text-warning',
                variant === 'error' && 'bg-destructive/10 text-destructive',
                variant === 'info' && 'bg-info/10 text-info',
                variant === 'default' && 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// MetricDisplay Component
export interface MetricDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  change?: {
    value: number
    period?: string
  }
  size?: 'sm' | 'md' | 'lg'
  inline?: boolean
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  change,
  size = 'md',
  inline = false,
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: { value: 'text-xl', label: 'text-xs' },
    md: { value: 'text-3xl', label: 'text-sm' },
    lg: { value: 'text-5xl', label: 'text-base' },
  }

  const ChangeIcon = change
    ? change.value > 0
      ? ArrowUp
      : change.value < 0
        ? ArrowDown
        : Minus
    : null

  const containerClass = inline
    ? 'flex items-center gap-4'
    : 'flex flex-col gap-1'

  return (
    <div className={cn(containerClass, className)} {...props}>
      <div className={inline ? 'order-2' : ''}>
        <p className={cn('text-muted-foreground font-medium', sizeClasses[size].label)}>
          {label}
        </p>
      </div>
      <div className={cn('flex items-baseline gap-2', inline ? 'order-1' : '')}>
        <span className={cn('font-bold', sizeClasses[size].value)}>{value}</span>
        {change && ChangeIcon && (
          <span
            className={cn(
              'flex items-center text-sm font-medium',
              change.value > 0
                ? 'text-success'
                : change.value < 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            )}
          >
            <ChangeIcon className="h-3 w-3 mr-0.5" />
            {Math.abs(change.value)}%
            {change.period && (
              <span className="ml-1 text-muted-foreground">({change.period})</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

// ChartCard Component
export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <Card className={cn('p-6', className)} {...props}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </Card>
  )
}

// ProgressBar Component
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const percentage = Math.min((value / max) * 100, 100)

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive',
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showValue && (
            <span className="text-muted-foreground">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
