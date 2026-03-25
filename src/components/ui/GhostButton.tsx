import { forwardRef } from 'react'
import { AccessibleButton, type AccessibleButtonProps } from './AccessibleButton'

/**
 * Bouton ghost — style prototype (btn-ghost)
 * Fond transparent, bordure grise 1.5px, hover → bordure brand + texte brand + fond brand soft
 */
export const GhostButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  function GhostButton(props, ref) {
    return (
      <AccessibleButton
        ref={ref}
        variant="outline"
        bg="transparent"
        color="brand.fg"
        borderWidth="1.5px"
        borderColor="border.strong"
        _hover={{ borderColor: 'brand.solid', color: 'brand.solid', bg: 'brand.subtle' }}
        {...props}
      />
    )
  }
)
