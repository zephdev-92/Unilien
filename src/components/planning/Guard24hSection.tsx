import {
  Box,
  Stack,
  Flex,
  Text,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { calculateShiftDuration } from '@/lib/compliance/utils'
import { getMinBreakForSegment } from '@/hooks/useGuardSegments'
import { REQUALIFICATION_THRESHOLD } from '@/hooks/useShiftRequalification'
import type { GuardSegment } from '@/types'

interface Guard24hSectionProps {
  guardSegments: GuardSegment[]
  startTime: string | undefined
  effectiveHoursComputed: number | null | undefined
  nightInterventionsCount: number
  onAddSegment: (afterIndex: number) => void
  onRemoveSegment: (index: number) => void
  onUpdateSegmentEnd: (index: number, endTime: string) => void
  onUpdateSegmentType: (index: number, type: GuardSegment['type']) => void
  onUpdateSegmentBreak: (index: number, minutes: number) => void
  onInterventionCountChange: (count: number) => void
}

export function Guard24hSection({
  guardSegments,
  startTime,
  effectiveHoursComputed,
  nightInterventionsCount,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegmentEnd,
  onUpdateSegmentType,
  onUpdateSegmentBreak,
  onInterventionCountChange,
}: Guard24hSectionProps) {
  return (
    <Box
      p={4}
      bg="teal.50"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="teal.200"
    >
      <Text fontWeight="medium" color="teal.800" mb={4}>
        Garde 24h — N segments libres
      </Text>

      {/* Barre visuelle colorée (lecture seule) */}
      <Flex gap={1} mb={4} borderRadius="md" overflow="hidden" h="32px">
        {guardSegments.map((seg, i) => {
          const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
          const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)
          const bg = seg.type === 'effective'
            ? 'blue.200'
            : seg.type === 'presence_day'
              ? 'cyan.200'
              : 'purple.200'
          const color = seg.type === 'effective'
            ? 'blue.800'
            : seg.type === 'presence_day'
              ? 'cyan.800'
              : 'purple.800'
          return (
            <Flex
              key={i}
              flex={Math.max(durMins, 30)}
              bg={bg}
              minW="32px"
              align="center"
              justify="center"
            >
              <Text fontSize="xs" color={color} fontWeight="medium">
                {(durMins / 60).toFixed(1)}h
              </Text>
            </Flex>
          )
        })}
      </Flex>

      {/* Liste de segments */}
      <Stack gap={3} mb={4}>
        {guardSegments.map((seg, i) => {
          const isLast = i === guardSegments.length - 1
          const canDelete = guardSegments.length > 2
          const minBreakRequired = getMinBreakForSegment(i, guardSegments)
          return (
            <Box
              key={i}
              p={3}
              bg="white"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
            >
              {/* En-tête : plage horaire + boutons actions */}
              <Flex align="center" gap={2} mb={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="45px">
                  {seg.startTime}
                </Text>
                <Text fontSize="xs" color="gray.400">→</Text>
                {isLast ? (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    {guardSegments[0].startTime} +1j
                  </Text>
                ) : (
                  <input
                    type="time"
                    value={guardSegments[i + 1].startTime}
                    onChange={(e) => onUpdateSegmentEnd(i, e.target.value)}
                    style={{
                      fontSize: '0.875rem',
                      border: '1px solid #CBD5E0',
                      borderRadius: '4px',
                      padding: '2px 6px',
                    }}
                  />
                )}
                <Box flex={1} />
                <AccessibleButton
                  size="sm"
                  variant="ghost"
                  accessibleLabel={`Diviser le segment ${i + 1}`}
                  title="Diviser ce segment en deux"
                  onClick={() => onAddSegment(i)}
                >
                  ÷
                </AccessibleButton>
                <AccessibleButton
                  size="sm"
                  variant="ghost"
                  accessibleLabel={`Supprimer le segment ${i + 1}`}
                  title="Supprimer ce segment"
                  disabled={!canDelete}
                  onClick={() => { if (canDelete) onRemoveSegment(i) }}
                >
                  ×
                </AccessibleButton>
              </Flex>

              {/* Type de segment */}
              <Box mb={seg.type === 'effective' ? 2 : 0}>
                <AccessibleSelect
                  label="Type de segment"
                  options={[
                    { value: 'effective', label: 'Travail effectif' },
                    { value: 'presence_day', label: 'Présence responsable (jour)' },
                    { value: 'presence_night', label: 'Présence de nuit' },
                  ]}
                  value={seg.type}
                  onChange={(e) => onUpdateSegmentType(i, e.target.value as GuardSegment['type'])}
                />
              </Box>

              {/* Pause — uniquement pour les segments travail effectif */}
              {seg.type === 'effective' && (
                <AccessibleInput
                  label="Pause (minutes)"
                  type="number"
                  helperText={minBreakRequired > 0
                    ? '20 min minimum légal (segment effectif > 6h — Art. L3121-16)'
                    : undefined}
                  value={seg.breakMinutes ?? 0}
                  onChange={(e) => onUpdateSegmentBreak(i, Math.max(0, parseInt(e.target.value) || 0))}
                />
              )}
            </Box>
          )
        })}
      </Stack>

      {/* Bouton ajouter un segment */}
      <Box mb={4}>
        <AccessibleButton
          size="sm"
          variant="outline"
          accessibleLabel="Ajouter un segment"
          onClick={() => onAddSegment(guardSegments.length - 1)}
        >
          + Ajouter un segment
        </AccessibleButton>
      </Box>

      {/* Compteur total travail effectif */}
      <Box p={3} bg="white" borderRadius="md" mb={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">Total travail effectif</Text>
          <Text
            fontSize="sm"
            fontWeight="bold"
            color={(effectiveHoursComputed ?? 0) > 12 ? 'red.600' : 'green.700'}
          >
            {(effectiveHoursComputed ?? 0).toFixed(1)}h / 12h max
          </Text>
        </Flex>
      </Box>

      {/* Nombre d'interventions nocturnes */}
      <Box mb={nightInterventionsCount >= REQUALIFICATION_THRESHOLD ? 3 : 0}>
        <AccessibleInput
          label="Interventions pendant la présence de nuit"
          type="number"
          helperText={`Chaque intervention (change, aide, urgence…) doit être comptée. Si ≥ ${REQUALIFICATION_THRESHOLD} : requalification en travail effectif (Art. 148 IDCC 3239)`}
          value={nightInterventionsCount}
          onChange={(e) => onInterventionCountChange(Math.max(0, parseInt(e.target.value) || 0))}
        />
      </Box>

      {/* Alerte requalification */}
      {nightInterventionsCount >= REQUALIFICATION_THRESHOLD && (
        <Box
          p={3}
          bg="orange.100"
          borderRadius="md"
          borderWidth="1px"
          borderColor="orange.300"
        >
          <Text fontWeight="bold" color="orange.800" fontSize="sm">
            Requalification de la présence de nuit
          </Text>
          <Text fontSize="xs" color="orange.700" mt={1}>
            {nightInterventionsCount} interventions (seuil : {REQUALIFICATION_THRESHOLD}).
            Les segments présence de nuit sont requalifiés en travail effectif rémunéré à 100%
            (Art. 148 IDCC 3239).
          </Text>
        </Box>
      )}

      {/* Hidden input pour sync startTime guard_24h (géré par le parent via setValue) */}
      {startTime && <input type="hidden" value={startTime} readOnly />}
    </Box>
  )
}
