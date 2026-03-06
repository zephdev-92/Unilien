import { Box, Stack, Flex, Text, Checkbox } from '@chakra-ui/react'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import type { RepeatConfigState } from '@/hooks/useRepeatConfig'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const DAYS_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Hebdomadaire (mêmes jours de la semaine)' },
  { value: 'custom', label: 'Personnalisée (intervalle fixe)' },
]

interface RepeatConfigSectionProps extends RepeatConfigState {
  baseDate?: Date
}

export function RepeatConfigSection({
  isRepeatEnabled,
  frequency,
  daysOfWeek,
  intervalDays,
  repeatCount,
  endDate,
  generatedDates,
  setIsRepeatEnabled,
  setFrequency,
  toggleDayOfWeek,
  setIntervalDays,
  setRepeatCount,
  setEndDate,
  baseDate,
}: RepeatConfigSectionProps) {
  const summary = buildSummary(generatedDates)

  return (
    <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
      <Flex align="center" gap={3} mb={isRepeatEnabled ? 4 : 0}>
        <Checkbox.Root
          checked={isRepeatEnabled}
          onCheckedChange={(e) => setIsRepeatEnabled(!!e.checked)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontWeight="medium">Répéter cette intervention</Checkbox.Label>
        </Checkbox.Root>
      </Flex>

      {isRepeatEnabled && (
        <Stack gap={4}>
          <AccessibleSelect
            label="Fréquence"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'weekly' | 'custom')}
          />

          {frequency === 'weekly' && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Jours de la semaine
              </Text>
              <Flex gap={2} flexWrap="wrap">
                {DAYS_LABELS.map((label, idx) => (
                  <AccessibleButton
                    key={idx}
                    size="sm"
                    variant={daysOfWeek.includes(idx) ? 'solid' : 'outline'}
                    colorPalette={daysOfWeek.includes(idx) ? 'blue' : 'gray'}
                    onClick={() => toggleDayOfWeek(idx)}
                    accessibleLabel={`${daysOfWeek.includes(idx) ? 'Désélectionner' : 'Sélectionner'} ${label}`}
                  >
                    {label}
                  </AccessibleButton>
                ))}
              </Flex>
            </Box>
          )}

          {frequency === 'custom' && (
            <AccessibleInput
              label="Tous les (jours)"
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
            />
          )}

          <Flex gap={4}>
            <Box flex={1}>
              <AccessibleInput
                label="Date de fin (optionnel)"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  if (e.target.value) setRepeatCount(undefined)
                }}
                helperText="Prioritaire sur le nombre"
              />
            </Box>
            {!endDate && (
              <Box flex={1}>
                <AccessibleInput
                  label="Nombre d'occurrences"
                  type="number"
                  value={repeatCount ?? ''}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value) || undefined)}
                />
              </Box>
            )}
          </Flex>

          {generatedDates.length > 0 && (
            <Box p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" color="blue.700">
                {summary}
              </Text>
              {generatedDates.length <= 5 && (
                <Text fontSize="xs" color="blue.600" mt={1}>
                  {generatedDates.map((d) => format(d, 'EEE d MMM', { locale: fr })).join(' · ')}
                </Text>
              )}
              {generatedDates.length > 5 && baseDate && (
                <Text fontSize="xs" color="blue.600" mt={1}>
                  Du {format(generatedDates[0], 'd MMM', { locale: fr })} au{' '}
                  {format(generatedDates[generatedDates.length - 1], 'd MMM yyyy', { locale: fr })}
                </Text>
              )}
            </Box>
          )}

          {generatedDates.length === 0 && (
            <Text fontSize="sm" color="orange.600">
              Aucune occurrence générée — vérifiez la configuration.
            </Text>
          )}
        </Stack>
      )}
    </Box>
  )
}

function buildSummary(dates: Date[]): string {
  if (dates.length === 0) return ''
  if (dates.length === 1) return '1 répétition générée'
  return `${dates.length} répétitions générées`
}
