import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const headingVariants = cva('font-bold text-foreground', {
  variants: {
    level: {
      h1: 'text-5xl tracking-tight',
      h2: 'text-4xl tracking-tight',
      h3: 'text-3xl',
      h4: 'text-2xl',
      h5: 'text-xl',
      h6: 'text-lg',
    },
    gradient: {
      true: 'bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent',
      false: '',
    },
  },
  defaultVariants: {
    level: 'h2',
    gradient: false,
  },
})

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const Heading: React.FC<HeadingProps> = ({
  as,
  level,
  gradient,
  className,
  children,
  ...props
}) => {
  const Component = as || level || 'h2'

  return (
    <Component
      className={cn(headingVariants({ level: level || as, gradient, className }))}
      {...props}
    >
      {children}
    </Component>
  )
}

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      body: 'text-base leading-relaxed',
      lead: 'text-xl leading-relaxed',
      large: 'text-lg',
      small: 'text-sm',
      muted: 'text-sm text-muted-foreground',
      caption: 'text-xs text-muted-foreground',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'body',
    weight: 'normal',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div'
}

export const Text: React.FC<TextProps> = ({
  as = 'p',
  variant,
  weight,
  className,
  children,
  ...props
}) => {
  const Component = as

  return (
    <Component
      className={cn(textVariants({ variant, weight, className }))}
      {...props}
    >
      {children}
    </Component>
  )
}

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean
}

export const Code: React.FC<CodeProps> = ({
  inline = true,
  className,
  children,
  ...props
}) => {
  if (inline) {
    return (
      <code
        className={cn(
          'rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <pre
      className={cn(
        'rounded-lg bg-muted p-4 font-mono text-sm text-foreground overflow-x-auto',
        className
      )}
    >
      <code {...props}>{children}</code>
    </pre>
  )
}

export interface DisplayTextProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean
}

export const DisplayText: React.FC<DisplayTextProps> = ({
  gradient = true,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight',
        gradient &&
          'bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent',
        !gradient && 'text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
