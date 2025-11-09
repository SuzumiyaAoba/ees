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
      <label htmlFor={htmlFor} className="block label-large mb-3">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="body-small text-error mt-2">{error}</p>
      )}
      {helpText && !error && (
        <p className="body-small text-on-surface-variant mt-2">{helpText}</p>
      )}
    </div>
  )
}
