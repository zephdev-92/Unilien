import { forwardRef, useId } from 'react'
import {
  Box,
  Field,
  Input,
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
          fontWeight="semibold"
          fontSize="sm"
          color="text.default"
          srOnly={hideLabel}
        >
          {label}
        </Field.Label>

        <Box position="relative" w="100%">
          {leftElement && (
            <Box position="absolute" left="10px" top="50%" transform="translateY(-50%)" zIndex={1} display="flex" alignItems="center">
              {leftElement}
            </Box>
          )}
          <Input
            ref={ref}
            id={inputId}
            size="lg"
            minH="44px"
            fontSize="sm"
            borderWidth="1.5px"
            borderColor="border.default"
            bg="bg.page"
            borderRadius="10px"
            readOnly={readOnly}
            aria-describedby={ariaDescribedBy}
            w="100%"
            pr={rightElement ? '40px' : undefined}
            pl={leftElement ? '40px' : undefined}
            css={{
              '&:focus': {
                borderColor: 'var(--chakra-colors-brand-500)',
                boxShadow: '0 0 0 3px rgba(78,100,120,.12)',
                background: 'var(--chakra-colors-bg-surface, #fff)',
              },
              '&[aria-invalid=true]': {
                borderColor: 'var(--chakra-colors-danger-500, #991B1B)',
                boxShadow: '0 0 0 3px rgba(220,38,38,.12)',
              },
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            {...inputProps}
          />
          {rightElement && (
            <Box position="absolute" right="10px" top="50%" transform="translateY(-50%)" zIndex={1} display="flex" alignItems="center">
              {rightElement}
            </Box>
          )}
        </Box>

        {helperText && !isInvalid && (
          <Field.HelperText id={helperId} fontSize="xs" color="text.muted">
            {helperText}
          </Field.HelperText>
        )}

        {isInvalid && (
          <Field.ErrorText id={errorId} fontSize="xs" fontWeight="semibold">
            {error}
          </Field.ErrorText>
        )}
      </Field.Root>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

export default AccessibleInput
