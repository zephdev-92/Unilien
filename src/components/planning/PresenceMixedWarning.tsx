import { Box, Text } from '@chakra-ui/react'
import { formatHoursCompact } from '@/lib/formatHours'

interface PresenceMixedWarningProps {
  dayHours: number
  nightHours: number
  mode?: 'edit' | 'view'
}

/**
 * Information affichée quand une "Présence responsable" chevauche jour et nuit.
 * Le calcul de paie est splitté automatiquement (jour ×2/3 + nuit ×1/4 forfait,
 * Art. 137 & 148 IDCC 3239), donc le montant à déclarer à la CESU est juste.
 *
 * - `edit` : info pédagogique pendant la saisie.
 * - `view` : info contextualisée à la lecture du shift.
 */
export function PresenceMixedWarning({ dayHours, nightHours, mode = 'edit' }: PresenceMixedWarningProps) {
  return (
    <Box
      p={3}
      bg="brand.subtle"
      borderRadius="10px"
      borderWidth="1px"
      borderColor="brand.200"
    >
      <Text fontSize="sm" fontWeight="bold" color="brand.700" mb={1}>
        Présence à cheval jour / nuit — calcul ajusté
      </Text>
      <Text fontSize="sm" color="brand.700">
        {formatHoursCompact(dayHours)} de jour + {formatHoursCompact(nightHours)} de nuit.
        La paie est calculée sur les deux régimes :{' '}
        <Text as="strong">jour ×2/3</Text> + <Text as="strong">nuit ×1/4</Text>{' '}
        (Art. 137 & 148 IDCC 3239).
      </Text>
      <Text fontSize="xs" color="brand.600" mt={2}>
        {mode === 'view' ? (
          <>Le détail de la décomposition est visible dans la rubrique « Paie estimée ».</>
        ) : (
          <>Pas besoin de splitter en deux interventions — le montant à déclarer à la CESU est ajusté automatiquement.</>
        )}
      </Text>
    </Box>
  )
}
