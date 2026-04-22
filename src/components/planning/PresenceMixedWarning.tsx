import { Box, Text } from '@chakra-ui/react'
import { formatHoursCompact } from '@/lib/formatHours'

interface PresenceMixedWarningProps {
  dayHours: number
  nightHours: number
}

/**
 * Avertissement affiché quand une intervention "Présence responsable" chevauche
 * le jour et la nuit. Les régimes de paie sont radicalement différents
 * (jour : équivalent ×2/3 — nuit : indemnité ×1/4, Art. 137 & 148 IDCC 3239),
 * donc un seul type ne peut refléter fidèlement la rémunération.
 */
export function PresenceMixedWarning({ dayHours, nightHours }: PresenceMixedWarningProps) {
  return (
    <Box
      p={3}
      bg="warm.50"
      borderRadius="10px"
      borderWidth="1px"
      borderColor="warm.300"
    >
      <Text fontSize="sm" fontWeight="bold" color="warm.800" mb={1}>
        Présence à cheval entre jour et nuit
      </Text>
      <Text fontSize="sm" color="warm.800">
        {formatHoursCompact(dayHours)} de jour + {formatHoursCompact(nightHours)} de nuit.
        Les régimes de paie diffèrent (×2/3 jour vs ×1/4 nuit, Art. 137 & 148 IDCC 3239).
      </Text>
      <Text fontSize="xs" color="warm.700" mt={2}>
        Pour un calcul juste, créez plutôt <Text as="strong">deux interventions</Text>{' '}
        (une jour, une nuit) ou utilisez une <Text as="strong">garde 24h</Text> qui
        gère les segments jour/nuit automatiquement.
      </Text>
    </Box>
  )
}
