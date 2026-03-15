import {
  Box,
  Stack,
  Flex,
  Text,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import { calculateShiftDuration } from '@/lib/compliance/utils'
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

const SEG_TYPE_OPTIONS = [
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence responsable (jour)' },
  { value: 'presence_night', label: 'Présence (nuit)' },
]

const SEG_COLORS: Record<string, string> = {
  effective: '#93B4D1',
  presence_day: '#B3D4A0',
  presence_night: '#C4B5E0',
}

export function Guard24hSection({
  guardSegments,
  startTime,
  effectiveHoursComputed,
  nightInterventionsCount,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegmentType,
  onUpdateSegmentBreak,
  onInterventionCountChange,
}: Guard24hSectionProps) {
  return (
    <Box
      p={4}
      bg="#F3F6F9"
      borderRadius="8px"
      borderWidth="1px"
      borderColor="border.default"
    >
      {/* Titre — proto: guard-editor-title */}
      <Text
        fontSize="11px"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="0.06em"
        color="text.muted"
        mb={3}
      >
        Segments de la garde
      </Text>

      {/* Barre visuelle — proto: guard-bar (10px, full radius) */}
      <Flex gap="2px" mb={4} borderRadius="full" overflow="hidden" h="10px">
        {guardSegments.map((seg, i) => {
          const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
          const durMins = calculateShiftDuration(seg.startTime, segEnd, 0)
          return (
            <Box
              key={i}
              flex={Math.max(durMins, 30)}
              bg={SEG_COLORS[seg.type] ?? SEG_COLORS.effective}
              h="100%"
              borderRadius="3px"
            />
          )
        })}
      </Flex>

      {/* Liste des segments — proto: guard-seg-list */}
      <Stack gap={2} mb={4}>
        {guardSegments.map((seg, i) => {
          const isLast = i === guardSegments.length - 1
          const canDelete = guardSegments.length > 2

          return (
            <Flex
              key={i}
              display="grid"
              gridTemplateColumns="110px 1fr auto auto auto"
              alignItems="center"
              gap={2}
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="8px"
              px={3}
              py={2}
            >
              {/* Plage horaire */}
              <Text fontSize="14px" fontWeight="700" fontFamily="heading" color="text.default" whiteSpace="nowrap">
                {seg.startTime} – {isLast ? guardSegments[0].startTime : (
                  <Box as="span">
                    {guardSegments[i + 1]?.startTime}
                  </Box>
                )}
              </Text>

              {/* Select type — inline, pas de label */}
              <select
                value={seg.type}
                onChange={(e) => onUpdateSegmentType(i, e.target.value as GuardSegment['type'])}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 8px',
                  border: '1.5px solid #D8E3ED',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#3D5166',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {SEG_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Break — inline petit input + "min" */}
              {seg.type === 'effective' ? (
                <Flex align="center" gap={1} fontSize="12px" color="text.muted">
                  <input
                    type="number"
                    value={seg.breakMinutes ?? 0}
                    onChange={(e) => onUpdateSegmentBreak(i, Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      width: '50px',
                      padding: '4px 6px',
                      border: '1px solid #D8E3ED',
                      borderRadius: '4px',
                      fontSize: '12px',
                      textAlign: 'center',
                      background: '#F3F6F9',
                    }}
                  />
                  <Text fontSize="12px" color="text.muted">min</Text>
                </Flex>
              ) : (
                <Text fontSize="12px" color="text.muted" px={2}>—</Text>
              )}

              {/* Bouton ÷ — proto: btn-icon-sm */}
              <Flex
                as="button"
                type="button"
                w="28px"
                h="28px"
                borderRadius="6px"
                align="center"
                justify="center"
                fontSize="16px"
                fontWeight="700"
                color="text.muted"
                bg="transparent"
                borderWidth="1px"
                borderColor="border.default"
                cursor="pointer"
                flexShrink={0}
                transition="all 0.15s"
                _hover={{ bg: '#F3F6F9', color: 'text.default' }}
                onClick={() => onAddSegment(i)}
                title="Diviser ce segment"
                aria-label={`Diviser le segment ${i + 1}`}
              >
                +
              </Flex>

              {/* Bouton × — proto: btn-icon-sm danger */}
              <Flex
                as="button"
                type="button"
                w="28px"
                h="28px"
                borderRadius="6px"
                align="center"
                justify="center"
                fontSize="16px"
                fontWeight="700"
                color={canDelete ? 'text.muted' : 'gray.300'}
                bg="transparent"
                borderWidth="1px"
                borderColor={canDelete ? 'border.default' : 'gray.200'}
                cursor={canDelete ? 'pointer' : 'not-allowed'}
                flexShrink={0}
                transition="all 0.15s"
                _hover={canDelete ? { bg: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' } : {}}
                onClick={() => { if (canDelete) onRemoveSegment(i) }}
                disabled={!canDelete}
                title="Supprimer ce segment"
                aria-label={`Supprimer le segment ${i + 1}`}
              >
                ×
              </Flex>
            </Flex>
          )
        })}
      </Stack>

      {/* Footer — proto: guard-footer */}
      <Flex
        justify="space-between"
        align="center"
        pt={3}
        borderTopWidth="1px"
        borderColor="border.default"
        mb={4}
      >
        <Text fontSize="14px" color="#3D5166">
          Travail effectif :{' '}
          <Text as="span" fontWeight="bold" color={(effectiveHoursComputed ?? 0) > 12 ? '#DC2626' : '#3D5166'}>
            {(effectiveHoursComputed ?? 0).toFixed(1)}h
          </Text>
          {' '}/ 12h max
        </Text>
        <AccessibleButton
          variant="outline"
          size="sm"
          bg="transparent"
          color="#3D5166"
          borderWidth="1.5px"
          borderColor="border.default"
          _hover={{ borderColor: '#3D5166', bg: '#EDF1F5' }}
          onClick={() => onAddSegment(guardSegments.length - 1)}
          accessibleLabel="Ajouter un segment"
        >
          + Ajouter un segment
        </AccessibleButton>
      </Flex>

      {/* Nombre d'interventions nocturnes */}
      <Box mb={nightInterventionsCount >= REQUALIFICATION_THRESHOLD ? 3 : 0}>
        <AccessibleInput
          label="Interventions pendant la présence de nuit"
          type="number"
          helperText="Chaque acte effectué pendant la présence de nuit (Art. 148 IDCC 3239)."
          value={nightInterventionsCount}
          onChange={(e) => onInterventionCountChange(Math.max(0, parseInt(e.target.value) || 0))}
        />
      </Box>

      {/* Alerte requalification */}
      {nightInterventionsCount >= REQUALIFICATION_THRESHOLD && (
        <Box
          p={3}
          bg="orange.100"
          borderRadius="8px"
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

      {startTime && <input type="hidden" value={startTime} readOnly />}
    </Box>
  )
}
