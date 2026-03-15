import { Box, Stack, Flex, Text, Checkbox } from '@chakra-ui/react'
import { AccessibleInput, AccessibleSelect } from '@/components/ui'
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
    <Box>
      {/* Toggle row — proto: repeat-toggle-row */}
      <Flex
        align="center"
        gap={3}
        p={3}
        borderWidth="1px"
        borderColor="border.default"
        borderRadius={isRepeatEnabled ? '8px 8px 0 0' : '8px'}
        cursor="pointer"
        userSelect="none"
        onClick={() => setIsRepeatEnabled(!isRepeatEnabled)}
      >
        <Checkbox.Root
          checked={isRepeatEnabled}
          onCheckedChange={(e) => setIsRepeatEnabled(!!e.checked)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="14px" fontWeight="500" color="text.default">
            Répéter cette intervention
          </Checkbox.Label>
        </Checkbox.Root>
      </Flex>

      {/* Body — proto: repeat-body */}
      {isRepeatEnabled && (
        <Box
          borderWidth="1px"
          borderTopWidth={0}
          borderColor="border.default"
          borderRadius="0 0 8px 8px"
          p={4}
        >
          <Stack gap={4}>
            <AccessibleSelect
              label="Fréquence"
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'weekly' | 'custom')}
            />

            {frequency === 'weekly' && (
              <Box>
                <Text fontSize="12px" fontWeight="500" color="text.muted" mb={2}>
                  Jours de la semaine
                </Text>
                <Flex gap={2} flexWrap="wrap">
                  {DAYS_LABELS.map((label, idx) => {
                    const isActive = daysOfWeek.includes(idx)
                    return (
                      <Flex
                        key={idx}
                        as="button"
                        type="button"
                        align="center"
                        justify="center"
                        py="4px"
                        px="12px"
                        borderWidth="1.5px"
                        borderColor={isActive ? '#3D5166' : 'border.default'}
                        borderRadius="6px"
                        bg={isActive ? '#3D5166' : 'transparent'}
                        color={isActive ? 'white' : '#3D5166'}
                        fontSize="12px"
                        fontWeight="600"
                        cursor="pointer"
                        transition="background 0.15s, border-color 0.15s, color 0.15s"
                        _hover={isActive ? {} : { borderColor: '#3D5166', color: '#3D5166' }}
                        onClick={() => toggleDayOfWeek(idx)}
                        aria-label={`${isActive ? 'Désélectionner' : 'Sélectionner'} ${label}`}
                        aria-pressed={isActive}
                      >
                        {label}
                      </Flex>
                    )
                  })}
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
                    label="Nombre de répétitions"
                    type="number"
                    value={repeatCount ?? ''}
                    onChange={(e) => setRepeatCount(parseInt(e.target.value) || undefined)}
                  />
                </Box>
              )}
            </Flex>

            {/* Preview — proto: repeat-preview */}
            {generatedDates.length > 0 && (
              <Box p={3} bg="#F3F6F9" borderRadius="8px" borderWidth="1px" borderColor="border.default">
                <Text fontSize="13px" fontWeight="600" color="#3D5166">
                  {summary}
                </Text>
                {generatedDates.length <= 5 && (
                  <Text fontSize="12px" color="text.muted" mt={1}>
                    {generatedDates.map((d) => format(d, 'EEE d MMM', { locale: fr })).join(' · ')}
                  </Text>
                )}
                {generatedDates.length > 5 && baseDate && (
                  <Text fontSize="12px" color="text.muted" mt={1}>
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
        </Box>
      )}
    </Box>
  )
}

function buildSummary(dates: Date[]): string {
  if (dates.length === 0) return ''
  if (dates.length === 1) return '1 répétition générée'
  return `${dates.length} répétitions générées`
}
