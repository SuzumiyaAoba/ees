import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

// Container Component
const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    },
    padding: {
      none: 'px-0',
      sm: 'px-4',
      md: 'px-6',
      lg: 'px-8',
    },
  },
  defaultVariants: {
    size: 'xl',
    padding: 'md',
  },
})

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

export const Container: React.FC<ContainerProps> = ({
  size,
  padding,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(containerVariants({ size, padding, className }))}
      {...props}
    >
      {children}
    </div>
  )
}

// Section Component
const sectionVariants = cva('w-full', {
  variants: {
    spacing: {
      none: 'py-0',
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
      xl: 'py-24',
    },
    variant: {
      default: '',
      muted: 'bg-muted/30',
      accent: 'bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5',
    },
  },
  defaultVariants: {
    spacing: 'md',
    variant: 'default',
  },
})

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {}

export const Section: React.FC<SectionProps> = ({
  spacing,
  variant,
  className,
  children,
  ...props
}) => {
  return (
    <section
      className={cn(sectionVariants({ spacing, variant, className }))}
      {...props}
    >
      {children}
    </section>
  )
}

// Grid Component
const gridVariants = cva('grid w-full', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    cols: 3,
    gap: 'md',
  },
})

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

export const Grid: React.FC<GridProps> = ({
  cols,
  gap,
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn(gridVariants({ cols, gap, className }))} {...props}>
      {children}
    </div>
  )
}

// Stack Component
const stackVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
  },
})

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

export const Stack: React.FC<StackProps> = ({
  direction,
  gap,
  align,
  justify,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(stackVariants({ direction, gap, align, justify, className }))}
      {...props}
    >
      {children}
    </div>
  )
}

// Divider Component
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacing = 'md',
  className,
  ...props
}) => {
  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
    lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',
  }

  return (
    <hr
      className={cn(
        'border-border',
        orientation === 'vertical' && 'h-full w-px',
        spacingClasses[spacing],
        className
      )}
      {...props}
    />
  )
}
