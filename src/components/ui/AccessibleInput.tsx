import { forwardRef, useId } from 'react'
import {
  Field,
  Input,
  Group,
  type InputProps,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface AccessibleInputProps extends InputProps {
  /** Label du champ (obligatoire pour accessibilité) */
  label: string
  /** Masquer le label visuellement (reste accessible aux lecteurs d'écran) */
  hideLabel?: boolean
  /** Message d'erreur */
  error?: string
  /** Texte d'aide */
  helperText?: string
  /** Élément à gauche de l'input */
  leftElement?: ReactNode
  /** Élément à droite de l'input */
  rightElement?: ReactNode
  /** ID unique (généré automatiquement si non fourni) */
  id?: string
  /** Champ requis */
  required?: boolean
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      hideLabel = false,
      error,
      helperText,
      leftElement,
      rightElement,
      id,
      required,
      disabled,
      readOnly,
      ...inputProps
    },
    ref
  ) => {
    // Génération automatique d'un ID unique
    const generatedId = useId()
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}-${generatedId}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const isInvalid = !!error

    // Lien explicite input → messages pour les lecteurs d'écran (WCAG 1.3.1, 3.3.1)
    const ariaDescribedBy = [
      isInvalid ? errorId : null,
      helperText && !isInvalid ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <Field.Root invalid={isInvalid} required={required} disabled={disabled}>
        <Field.Label
          htmlFor={inputId}
          fontWeight="medium"
          fontSize="md"
          srOnly={hideLabel}
        >
          {label}
        </Field.Label>

        <Group>
          {leftElement}
          <Input
            ref={ref}
            id={inputId}
            size="lg"
            minH="56px"
            fontSize="md"
            borderWidth="2px"
            readOnly={readOnly}
            aria-describedby={ariaDescribedBy}
            css={{
              '&:focus': {
                borderColor: 'var(--chakra-colors-blue-500)',
                boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.3)',
              },
              '&[aria-invalid=true]': {
                borderColor: 'var(--chakra-colors-red-500)',
                boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
              },
            }}
            {...inputProps}
          />
          {rightElement}
        </Group>

        {helperText && !isInvalid && (
          <Field.HelperText id={helperId} fontSize="sm" color="gray.600">
            {helperText}
          </Field.HelperText>
        )}

        {isInvalid && (
          <Field.ErrorText id={errorId} fontSize="sm">
            {error}
          </Field.ErrorText>
        )}
      </Field.Root>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

export default AccessibleInput
