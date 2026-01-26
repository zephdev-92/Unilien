import { forwardRef } from 'react'
import {
  Field,
  NativeSelect,
} from '@chakra-ui/react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface AccessibleSelectProps {
  /** Label du champ (obligatoire pour accessibilité) */
  label: string
  /** Options du select */
  options: SelectOption[]
  /** Masquer le label visuellement */
  hideLabel?: boolean
  /** Message d'erreur */
  error?: string
  /** Texte d'aide */
  helperText?: string
  /** Placeholder */
  placeholder?: string
  /** ID unique */
  id?: string
  /** Champ requis */
  required?: boolean
  /** Désactivé */
  disabled?: boolean
  /** Nom du champ */
  name?: string
  /** Valeur */
  value?: string
  /** Valeur par défaut */
  defaultValue?: string
  /** Callback onChange */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  /** Callback onBlur */
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  (
    {
      label,
      options,
      hideLabel = false,
      error,
      helperText,
      placeholder,
      id,
      required,
      disabled,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
    },
    ref
  ) => {
    const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 9)}`

    const isInvalid = !!error

    return (
      <Field.Root invalid={isInvalid} required={required} disabled={disabled}>
        <Field.Label
          htmlFor={selectId}
          fontWeight="medium"
          fontSize="md"
          srOnly={hideLabel}
        >
          {label}
        </Field.Label>

        <NativeSelect.Root size="lg">
          <NativeSelect.Field
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            css={{
              minHeight: '56px',
              fontSize: 'md',
              borderWidth: '2px',
              '&:focus': {
                borderColor: 'var(--chakra-colors-blue-500)',
                boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.3)',
              },
              '&[aria-invalid=true]': {
                borderColor: 'var(--chakra-colors-red-500)',
                boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
              },
            }}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
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
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {helperText && !isInvalid && (
          <Field.HelperText fontSize="sm" color="gray.600">
            {helperText}
          </Field.HelperText>
        )}

        {isInvalid && (
          <Field.ErrorText fontSize="sm">
            {error}
          </Field.ErrorText>
        )}
      </Field.Root>
    )
  }
)

AccessibleSelect.displayName = 'AccessibleSelect'

export default AccessibleSelect
