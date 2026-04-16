import { Box, Flex, Text } from '@chakra-ui/react'
import { formatHoursCompact } from '@/lib/formatHours'

interface EditProps {
  mode?: 'edit'
  durationHours: number
  effectiveHoursComputed: number | null
}

interface ViewProps {
  mode: 'view'
  durationHours: number
  effectiveHoursComputed: number | null
}

type Props = EditProps | ViewProps

/**
 * Affiche le panneau de présence responsable de jour (Art. 137.1 IDCC 3239).
 * - Mode `edit` : panneau complet avec texte explicatif (NewShiftModal, ShiftDetailModal édition)
 * - Mode `view` : affichage compact sans texte explicatif (ShiftDetailModal lecture)
 *
 * Le rendu est nul si `durationHours <= 0`.
 */
export function PresenceResponsibleDaySection({ mode = 'edit', durationHours, effectiveHoursComputed }: Props) {
  if (durationHours <= 0) return null

  const isView = mode === 'view'

  return (
    <Box
      p={isView ? 3 : 4}
      bg="brand.subtle"
      borderRadius={isView ? 'md' : 'lg'}
      borderWidth="1px"
      borderColor="brand.200"
    >
      <Text
        fontSize={isView ? 'sm' : undefined}
        fontWeight="medium"
        color="brand.700"
        mb={2}
      >
        {isView ? 'Conversion présence responsable' : 'Présence responsable de jour'}
      </Text>
      {!isView && (
        <Text fontSize="sm" color="brand.700" mb={3}>
          L'auxiliaire reste vigilant mais peut vaquer à des occupations personnelles.
          Les heures sont converties en travail effectif au coefficient 2/3 (Art. 137.1 IDCC 3239).
        </Text>
      )}
      {isView ? (
        <>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="text.muted">Présence</Text>
            <Text fontSize="sm">{formatHoursCompact(durationHours)}</Text>
          </Flex>
          <Flex justify="space-between" align="center" mt={1}>
            <Text fontSize="sm" color="text.muted">Équivalent travail (×2/3)</Text>
            <Text fontSize="sm" fontWeight="bold" color="brand.700">
              {effectiveHoursComputed != null
                ? formatHoursCompact(effectiveHoursComputed)
                : formatHoursCompact(durationHours * (2 / 3))
              }
            </Text>
          </Flex>
        </>
      ) : (
        <Box p={3} bg="bg.surface" borderRadius="10px">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="text.muted">Présence responsable</Text>
            <Text fontSize="sm" fontWeight="medium">{formatHoursCompact(durationHours)}</Text>
          </Flex>
          <Flex justify="space-between" align="center" mt={1}>
            <Text fontSize="sm" color="text.muted">Équivalent travail effectif (×2/3)</Text>
            <Text fontSize="sm" fontWeight="bold" color="brand.700">
              {effectiveHoursComputed != null ? formatHoursCompact(effectiveHoursComputed) : '—'}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  )
}
