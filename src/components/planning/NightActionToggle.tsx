import { Box, Flex, Text, Switch } from '@chakra-ui/react'

interface EditProps {
  mode: 'edit'
  nightHoursCount: number
  hasNightAction: boolean
  onToggle: (checked: boolean) => void
}

interface ViewProps {
  mode: 'view'
  nightHoursCount: number
  hasNightAction: boolean
}

type Props = EditProps | ViewProps

/**
 * Affiche le panneau heures de nuit pour le travail effectif.
 * - Mode `edit` : switch pour activer/désactiver la majoration de nuit (+20%)
 * - Mode `view` : indicateur compact lecture seule
 *
 * La condition d'affichage (`shiftType === 'effective' && hasNightHours`) est gérée par le parent.
 */
export function NightActionToggle(props: Props) {
  if (props.mode === 'view') {
    const { nightHoursCount, hasNightAction } = props
    return (
      <Box p={3} bg="purple.50" borderRadius="md">
        <Flex align="center" gap={2}>
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="purple.800">
              {nightHoursCount.toFixed(1)}h de nuit
              {hasNightAction
                ? ' — Acte effectué (majoration +20%)'
                : ' — Présence seule (pas de majoration)'
              }
            </Text>
          </Box>
        </Flex>
      </Box>
    )
  }

  const { nightHoursCount, hasNightAction, onToggle } = props
  return (
    <Box p={4} bg="purple.50" borderRadius="lg" borderWidth="1px" borderColor="purple.200">
      <Flex justify="space-between" align="center" mb={2}>
        <Box flex={1}>
          <Text fontWeight="medium" color="purple.800">
            Heures de nuit détectées ({nightHoursCount.toFixed(1)}h)
          </Text>
          <Text fontSize="sm" color="purple.600" mt={1}>
            La majoration de nuit (+20%) ne s'applique que si l'auxiliaire
            effectue un acte (soin, aide...) pendant les heures de nuit.
            La simple présence ne donne pas droit à la majoration.
          </Text>
        </Box>
      </Flex>
      <Flex justify="space-between" align="center" mt={3} p={3} bg="white" borderRadius="md">
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          Acte effectué pendant la nuit
        </Text>
        <Switch.Root
          checked={hasNightAction}
          onCheckedChange={(e) => onToggle(e.checked)}
        >
          <Switch.HiddenInput aria-label="Acte effectué pendant les heures de nuit" />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </Flex>
      {hasNightAction && (
        <Text fontSize="xs" color="green.600" mt={2}>
          Majoration de nuit appliquée : +20% sur {nightHoursCount.toFixed(1)}h
        </Text>
      )}
      {!hasNightAction && (
        <Text fontSize="xs" color="gray.500" mt={2}>
          Pas de majoration — présence de nuit uniquement
        </Text>
      )}
    </Box>
  )
}
