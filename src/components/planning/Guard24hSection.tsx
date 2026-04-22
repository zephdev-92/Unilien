import {
  Box,
  Stack,
  Flex,
  Text,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleButton } from '@/components/ui'
import { REQUALIFICATION_THRESHOLD } from '@/hooks/useShiftRequalification'
import type { GuardSegment } from '@/types'
import { formatHoursCompact } from '@/lib/formatHours'
import { detectPresenceType } from '@/lib/presence/detectPresenceType'

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
  { value: 'presence', label: 'Présence responsable' },
]

const SEG_COLORS: Record<string, string> = {
  effective: '#93B4D1',
  presence_day: '#B3D4A0',
  presence_night: '#C4B5E0',
}

/** Map DB type to select value */
function toSelectValue(type: GuardSegment['type']): string {
  return type === 'presence_day' || type === 'presence_night' ? 'presence' : type
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
      bg="bg.page"
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
        Découpage des 24h
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
              <Flex align="center" gap={1} fontSize="14px" fontWeight="700" fontFamily="heading" color="text.default" whiteSpace="nowrap">
                <Text as="span">{seg.startTime}</Text>
                <Text as="span">–</Text>
                <input
                  type="time"
                  value={isLast ? guardSegments[0].startTime : (guardSegments[i + 1]?.startTime ?? '')}
                  onChange={(e) => onUpdateSegmentEnd(i, e.target.value)}
                  disabled={isLast}
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '2px 4px',
                    border: isLast ? 'none' : '1.5px solid var(--chakra-colors-border-default)',
                    borderRadius: '4px',
                    background: isLast ? 'transparent' : 'white',
                    color: 'var(--chakra-colors-brand-500)',
                    width: '80px',
                    cursor: isLast ? 'default' : 'pointer',
                  }}
                />
              </Flex>

              {/* Select type — inline, pas de label */}
              <select
                value={toSelectValue(seg.type)}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'presence') {
                    const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
                    onUpdateSegmentType(i, detectPresenceType(seg.startTime, segEnd))
                  } else {
                    onUpdateSegmentType(i, val as GuardSegment['type'])
                  }
                }}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 8px',
                  border: '1.5px solid var(--chakra-colors-border-default)',
                  borderRadius: '6px',
                  background: 'white',
                  color: 'var(--chakra-colors-brand-500)',
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
                  <Text fontSize="12px" color="text.muted">Pause</Text>
                  <input
                    type="number"
                    value={seg.breakMinutes ?? 0}
                    onChange={(e) => onUpdateSegmentBreak(i, Math.max(0, parseInt(e.target.value) || 0))}
                    aria-label="Pause en minutes"
                    style={{
                      width: '50px',
                      padding: '4px 6px',
                      border: '1px solid var(--chakra-colors-border-default)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      textAlign: 'center',
                      background: 'var(--chakra-colors-bg-page)',
                    }}
                  />
                  <Text fontSize="12px" color="text.muted">min</Text>
                </Flex>
              ) : (() => {
                const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
                const totalMins = calculateShiftDuration(seg.startTime, segEnd, 0)
                const totalH = totalMins / 60
                const nightH = calculateNightHours(new Date(), seg.startTime, segEnd)
                const dayH = Math.max(0, totalH - nightH)
                return (
                  <Text fontSize="12px" color="text.muted" px={2} whiteSpace="nowrap">
                    {dayH > 0 && `${formatHoursCompact(dayH)} jour`}
                    {dayH > 0 && nightH > 0 && ' · '}
                    {nightH > 0 && `${formatHoursCompact(nightH)} nuit`}
                    {dayH === 0 && nightH === 0 && '—'}
                  </Text>
                )
              })()}

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
                _hover={{ bg: 'bg.page', color: 'text.default' }}
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
                _hover={canDelete ? { bg: 'danger.subtle', color: '#DC2626', borderColor: 'danger.100' } : {}}
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
      {(() => {
        let presenceDayH = 0
        let presenceNightH = 0
        guardSegments.forEach((seg, i) => {
          if (seg.type !== 'presence_day' && seg.type !== 'presence_night') return
          const segEnd = guardSegments[i + 1]?.startTime ?? guardSegments[0].startTime
          const totalH = calculateShiftDuration(seg.startTime, segEnd, 0) / 60
          const nightH = calculateNightHours(new Date(), seg.startTime, segEnd)
          presenceDayH += Math.max(0, totalH - nightH)
          presenceNightH += nightH
        })
        const effective = effectiveHoursComputed ?? 0
        const totalCumul = effective + presenceDayH + presenceNightH
        const hasPresence = presenceDayH > 0 || presenceNightH > 0

        return (
          <Stack
            gap={1.5}
            pt={3}
            borderTopWidth="1px"
            borderColor="border.default"
            mb={4}
          >
            <Flex justify="space-between" align="center" gap={3}>
              <Text fontSize="14px" color="brand.500">
                Travail effectif :{' '}
                <Text as="span" fontWeight="bold" color={effective > 12 ? '#DC2626' : 'brand.500'}>
                  {formatHoursCompact(effective)}
                </Text>
                {' '}/ 12h max
              </Text>
              <AccessibleButton
                variant="outline"
                size="sm"
                bg="transparent"
                color="brand.500"
                borderWidth="1.5px"
                borderColor="border.default"
                _hover={{ borderColor: 'brand.500', bg: 'brand.subtle' }}
                onClick={() => onAddSegment(guardSegments.length - 1)}
                accessibleLabel="Ajouter une plage"
              >
                + Ajouter une plage
              </AccessibleButton>
            </Flex>

            {hasPresence && (
              <Stack gap={0.5} fontSize="13px" color="text.muted">
                {presenceDayH > 0 && (
                  <Flex gap={2}>
                    <Text minW="220px">Présence responsable (jour) :</Text>
                    <Text fontWeight="600" color="text.default">
                      {formatHoursCompact(presenceDayH)}
                    </Text>
                  </Flex>
                )}
                {presenceNightH > 0 && (
                  <Flex gap={2}>
                    <Text minW="220px">Présence responsable (nuit) :</Text>
                    <Text fontWeight="600" color="text.default">
                      {formatHoursCompact(presenceNightH)}
                    </Text>
                  </Flex>
                )}
              </Stack>
            )}

            <Text fontSize="13px" color="text.default" fontWeight="600">
              Total cumulé :{' '}
              <Text as="span" color={totalCumul > 24 ? '#DC2626' : 'text.default'}>
                {formatHoursCompact(totalCumul)}
              </Text>
              {' '}/ 24h
            </Text>
          </Stack>
        )
      })()}

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
