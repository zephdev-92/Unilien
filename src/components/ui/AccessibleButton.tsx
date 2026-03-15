import { forwardRef } from 'react'
import {
  Button,
  type ButtonProps,
  Spinner,
  VisuallyHidden,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface AccessibleButtonProps extends ButtonProps {
  /** Texte accessible pour les lecteurs d'écran (si différent du contenu visible) */
  accessibleLabel?: string
  /** Afficher un spinner de chargement */
  loading?: boolean
  /** Texte à afficher pendant le chargement */
  loadingText?: string
  /** Icône à gauche */
  leftIcon?: ReactNode
  /** Icône à droite */
  rightIcon?: ReactNode
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      accessibleLabel,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      ...buttonProps
    },
    ref
  ) => {
    // Gestion du contenu pendant le chargement
    const displayContent = loading && loadingText ? loadingText : children

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        aria-label={accessibleLabel}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        size="lg"

        px={5}
        fontWeight="bold"
        borderRadius="10px"
        letterSpacing="0.01em"
        fontSize="sm"
        css={{
          // Focus visible — double anneau comme le prototype
          '&:focus-visible': {
            boxShadow: '0 0 0 2px #fff',
            outline: '2px solid var(--chakra-colors-brand-500)',
            outlineOffset: '2px',
          },
          // Hover avec elevation
          '&:hover:not(:disabled)': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px rgba(78,100,120,.12)',
          },
          '&:active:not(:disabled)': {
            transform: 'translateY(0)',
          },
          // Disabled
          '&:disabled, &[aria-disabled=true]': {
            opacity: 0.45,
            cursor: 'not-allowed',
          },
          transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            transform: 'none !important',
          },
        }}
        {...buttonProps}
      >
        {/* Spinner de chargement */}
        {loading && (
          <Spinner
            size="sm"
            mr={loadingText ? 2 : 0}
            aria-hidden="true"
          />
        )}

        {/* Icône gauche */}
        {!loading && leftIcon && (
          <span aria-hidden="true" style={{ marginRight: '8px' }}>
            {leftIcon}
          </span>
        )}

        {/* Contenu principal */}
        {displayContent}

        {/* Texte accessible caché si différent */}
        {accessibleLabel && (
          <VisuallyHidden>{accessibleLabel}</VisuallyHidden>
        )}

        {/* Icône droite */}
        {!loading && rightIcon && (
          <span aria-hidden="true" style={{ marginLeft: '8px' }}>
            {rightIcon}
          </span>
        )}

        {/* Annonce du chargement pour lecteurs d'écran */}
        {loading && (
          <VisuallyHidden role="status" aria-live="polite">
            Chargement en cours...
          </VisuallyHidden>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

export default AccessibleButton
