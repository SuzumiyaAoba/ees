import React from 'react'
import { cn } from '@/utils/cn'

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'gradient' | 'white'
  className?: string
}

const sizeMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
}

/**
 * EES Logo Component
 *
 * The logo features a modern design representing embeddings and neural networks
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  className,
}) => {
  const heightClass = sizeMap[size]

  const getColors = () => {
    switch (variant) {
      case 'gradient':
        return {
          primary: 'url(#logoGradient)',
          secondary: 'url(#logoGradient)',
        }
      case 'white':
        return {
          primary: '#ffffff',
          secondary: '#ffffff',
        }
      default:
        return {
          primary: 'hsl(239, 84%, 67%)',
          secondary: 'hsl(189, 94%, 43%)',
        }
    }
  }

  const colors = getColors()

  return (
    <svg
      className={cn(heightClass, 'w-auto', className)}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(239, 84%, 67%)" />
          <stop offset="50%" stopColor="hsl(271, 91%, 65%)" />
          <stop offset="100%" stopColor="hsl(189, 94%, 43%)" />
        </linearGradient>
      </defs>

      {/* Icon: Neural Network / Embedding representation */}
      <g>
        {/* Central node */}
        <circle cx="30" cy="30" r="6" fill={colors.primary} />

        {/* Surrounding nodes */}
        <circle cx="15" cy="15" r="4" fill={colors.secondary} />
        <circle cx="45" cy="15" r="4" fill={colors.secondary} />
        <circle cx="15" cy="45" r="4" fill={colors.secondary} />
        <circle cx="45" cy="45" r="4" fill={colors.secondary} />

        {/* Connection lines */}
        <line x1="30" y1="30" x2="15" y2="15" stroke={colors.primary} strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="30" x2="45" y2="15" stroke={colors.primary} strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="30" x2="15" y2="45" stroke={colors.primary} strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="30" x2="45" y2="45" stroke={colors.primary} strokeWidth="2" opacity="0.6" />
      </g>
    </svg>
  )
}
