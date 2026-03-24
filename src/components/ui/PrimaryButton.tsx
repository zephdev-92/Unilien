import { forwardRef } from 'react'
import { AccessibleButton, type AccessibleButtonProps } from './AccessibleButton'

/**
 * Bouton principal — style prototype (btn-primary)
 * Fond slate-blue, texte blanc, hover plus foncé avec élévation
 */
export const PrimaryButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  function PrimaryButton(props, ref) {
    return (
      <AccessibleButton
        ref={ref}
        bg="brand.500"
        color="white"
        _hover={{ bg: 'brand.600', transform: 'translateY(-1px)', boxShadow: 'md' }}
        _active={{ transform: 'translateY(0)' }}
        {...props}
      />
    )
  }
)
