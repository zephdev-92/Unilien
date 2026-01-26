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
        minH="60px"
        minW="60px"
        px={6}
        fontWeight="semibold"
        borderRadius="md"
        css={{
          // Focus visible pour accessibilité
          '&:focus': {
            boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.6)',
            outline: '2px solid transparent',
            outlineOffset: '2px',
          },
          '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(0, 86, 224, 0.6)',
            outline: '2px solid transparent',
            outlineOffset: '2px',
          },
          // Hover avec contraste suffisant
          '&:hover:not(:disabled)': {
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          },
          // Transition respectueuse de prefers-reduced-motion
          transition: 'all 0.2s',
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
