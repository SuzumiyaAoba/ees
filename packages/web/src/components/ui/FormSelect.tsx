interface FormSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface FormSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  placeholder?: string
  disabled?: boolean
  helpText?: string
  error?: string
  className?: string
  required?: boolean
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  helpText,
  error,
  className = '',
  required = false,
}: FormSelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
  )
}
