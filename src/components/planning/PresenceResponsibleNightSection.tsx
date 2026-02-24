import { Box, Flex, Text } from '@chakra-ui/react'
import { AccessibleInput } from '@/components/ui'
import { REQUALIFICATION_THRESHOLD } from '@/hooks/useShiftRequalification'

interface EditProps {
  mode: 'edit'
  durationHours: number
  nightInterventionsCount: number
  isRequalified: boolean
  onInterventionCountChange: (count: number) => void
}

interface ViewProps {
  mode: 'view'
  displayDuration: number
  nightInterventionsCount: number | null
  isRequalified: boolean | null
}

type Props = EditProps | ViewProps

/**
 * Affiche le panneau de présence responsable de nuit (Art. 148 IDCC 3239).
 * - Mode `edit` : saisie des interventions + alerte requalification + résumé indemnité
 * - Mode `view` : affichage compact lecture seule
 */
export function PresenceResponsibleNightSection(props: Props) {
  if (props.mode === 'view') {
    const { displayDuration, nightInterventionsCount, isRequalified } = props
    return (
      <Box p={3} bg="purple.50" borderRadius="md">
        <Text fontSize="sm" fontWeight="medium" color="purple.800" mb={2}>
          Présence responsable de nuit
        </Text>
        {nightInterventionsCount != null && nightInterventionsCount > 0 && (
          <Text fontSize="sm" color="gray.700" mb={1}>
            {nightInterventionsCount} intervention{nightInterventionsCount > 1 ? 's' : ''} pendant la nuit
          </Text>
        )}
        {isRequalified && (
          <Box p={2} bg="orange.100" borderRadius="md" mt={1} mb={2}>
            <Text fontSize="xs" fontWeight="bold" color="orange.800">
              Requalifié en travail effectif (Art. 148 IDCC 3239)
            </Text>
          </Box>
        )}
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">
            {isRequalified ? 'Rémunération (100%)' : 'Indemnité forfaitaire (×1/4)'}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color={isRequalified ? 'orange.700' : 'purple.700'}>
            {isRequalified
              ? `${displayDuration.toFixed(1)}h effectives`
              : `${(displayDuration * 0.25).toFixed(1)}h équiv.`
            }
          </Text>
        </Flex>
      </Box>
    )
  }

  const { durationHours, nightInterventionsCount, isRequalified, onInterventionCountChange } = props
  return (
    <Box p={4} bg="purple.50" borderRadius="lg" borderWidth="1px" borderColor="purple.200">
      <Text fontWeight="medium" color="purple.800" mb={2}>
        Présence responsable de nuit
      </Text>
      <Text fontSize="sm" color="purple.700" mb={3}>
        L'auxiliaire dort sur place et intervient si besoin.
        Indemnité forfaitaire d'au moins 1/4 du salaire horaire (Art. 148 IDCC 3239).
      </Text>
      <Box mb={3}>
        <AccessibleInput
          label="Nombre d'interventions pendant la nuit"
          type="number"
          helperText="Chaque intervention (change, aide, urgence...) doit être comptée"
          value={nightInterventionsCount}
          onChange={(e) => onInterventionCountChange(Math.max(0, parseInt(e.target.value) || 0))}
        />
      </Box>
      {isRequalified && (
        <Box p={3} bg="orange.100" borderRadius="md" borderWidth="1px" borderColor="orange.300" mb={3}>
          <Text fontWeight="bold" color="orange.800" fontSize="sm">
            Requalification en travail effectif
          </Text>
          <Text fontSize="xs" color="orange.700" mt={1}>
            {nightInterventionsCount} interventions (seuil : {REQUALIFICATION_THRESHOLD}).
            Toute la plage est requalifiée en travail effectif et rémunérée à 100%
            au lieu du forfaitaire 1/4 (Art. 148 IDCC 3239).
          </Text>
        </Box>
      )}
      {durationHours > 0 && (
        <Box p={3} bg="white" borderRadius="md">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.600">Durée de présence</Text>
            <Text fontSize="sm" fontWeight="medium">{durationHours.toFixed(1)}h</Text>
          </Flex>
          <Flex justify="space-between" align="center" mt={1}>
            <Text fontSize="sm" color="gray.600">
              {isRequalified ? 'Rémunération (100% — requalifié)' : 'Indemnité forfaitaire (×1/4)'}
            </Text>
            <Text fontSize="sm" fontWeight="bold" color={isRequalified ? 'orange.700' : 'purple.700'}>
              {isRequalified
                ? `${durationHours.toFixed(1)}h effectives`
                : `${(durationHours * 0.25).toFixed(1)}h équiv.`
              }
            </Text>
          </Flex>
          {nightInterventionsCount > 0 && !isRequalified && (
            <Text fontSize="xs" color="gray.500" mt={2}>
              {nightInterventionsCount} intervention{nightInterventionsCount > 1 ? 's' : ''} — les interventions sont rémunérées en travail effectif avec majoration nuit (+20%)
            </Text>
          )}
        </Box>
      )}
    </Box>
  )
}
