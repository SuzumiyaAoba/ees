import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 label-large',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-elevation2 hover:shadow-elevation3 hover:brightness-110 active:brightness-90',
        filled: 'bg-primary text-primary-foreground shadow-elevation2 hover:shadow-elevation3 hover:brightness-110 active:brightness-90',
        'filled-tonal': 'bg-secondary-container text-on-secondary-container shadow-elevation1 hover:shadow-elevation2 hover:brightness-110 active:brightness-90',
        elevated: 'bg-surface text-primary shadow-elevation1 hover:shadow-elevation3 hover:bg-surface/90',
        outline: 'border border-outline bg-transparent text-primary hover:bg-primary/8 active:bg-primary/12',
        text: 'bg-transparent text-primary hover:bg-primary/8 active:bg-primary/12',
        // Legacy variants for compatibility
        gradient: 'bg-gradient-to-r from-primary via-tertiary to-secondary text-white shadow-elevation2 hover:shadow-elevation4',
        destructive: 'bg-error text-error-foreground shadow-elevation2 hover:shadow-elevation3 hover:brightness-110 active:brightness-90',
        secondary: 'bg-secondary-container text-on-secondary-container shadow-elevation1 hover:shadow-elevation2',
        ghost: 'bg-transparent hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground shadow-elevation2 hover:shadow-elevation3',
        warning: 'bg-warning text-warning-foreground shadow-elevation2 hover:shadow-elevation3',
      },
      size: {
        default: 'h-10 px-6',
        sm: 'h-8 px-4 text-sm',
        lg: 'h-14 px-8',
        xl: 'h-16 px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }