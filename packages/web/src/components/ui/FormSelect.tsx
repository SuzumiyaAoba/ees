import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select'

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
  // Filter out empty string options and use their label as placeholder
  const filteredOptions = options.filter(opt => opt.value !== '')
  const emptyOption = options.find(opt => opt.value === '')
  const effectivePlaceholder = emptyOption?.label || placeholder

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium block mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <Select
        value={value || undefined}
        onValueChange={(newValue) => onChange(newValue || '')}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
  )
}
