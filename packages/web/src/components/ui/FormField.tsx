import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  helpText?: string
  required?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function FormField({
  label,
  error,
  helpText,
  required = false,
  children,
  className = '',
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
  )
}
