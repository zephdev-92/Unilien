import { Box, Flex, Text } from '@chakra-ui/react'

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
      bg="blue.50"
      borderRadius={isView ? 'md' : 'lg'}
      borderWidth="1px"
      borderColor="blue.200"
    >
      <Text
        fontSize={isView ? 'sm' : undefined}
        fontWeight="medium"
        color="blue.800"
        mb={2}
      >
        {isView ? 'Conversion présence responsable' : 'Présence responsable de jour'}
      </Text>
      {!isView && (
        <Text fontSize="sm" color="blue.700" mb={3}>
          L'auxiliaire reste vigilant mais peut vaquer à des occupations personnelles.
          Les heures sont converties en travail effectif au coefficient 2/3 (Art. 137.1 IDCC 3239).
        </Text>
      )}
      {isView ? (
        <>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.600">Présence</Text>
            <Text fontSize="sm">{durationHours.toFixed(1)}h</Text>
          </Flex>
          <Flex justify="space-between" align="center" mt={1}>
            <Text fontSize="sm" color="gray.600">Équivalent travail (×2/3)</Text>
            <Text fontSize="sm" fontWeight="bold" color="blue.700">
              {effectiveHoursComputed != null
                ? `${effectiveHoursComputed.toFixed(1)}h`
                : `${(durationHours * (2 / 3)).toFixed(1)}h`
              }
            </Text>
          </Flex>
        </>
      ) : (
        <Box p={3} bg="white" borderRadius="md">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.600">Présence responsable</Text>
            <Text fontSize="sm" fontWeight="medium">{durationHours.toFixed(1)}h</Text>
          </Flex>
          <Flex justify="space-between" align="center" mt={1}>
            <Text fontSize="sm" color="gray.600">Équivalent travail effectif (×2/3)</Text>
            <Text fontSize="sm" fontWeight="bold" color="blue.700">
              {effectiveHoursComputed != null ? `${effectiveHoursComputed.toFixed(1)}h` : '—h'}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  )
}
