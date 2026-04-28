import { Box, Stack, Flex, Text, Separator } from '@chakra-ui/react'
import { calculateShiftDuration, calculateNightHours } from '@/lib/compliance'
import { formatHoursCompact } from '@/lib/formatHours'
import type { GuardSegment } from '@/types'

interface Guard24hRecapProps {
  guardSegments: GuardSegment[]
  effectiveHoursComputed: number | null | undefined
  nightInterventionsCount: number | null | undefined
  isRequalified: boolean | null | undefined
}

const SEG_COLORS: Record<GuardSegment['type'], string> = {
  effective: '#93B4D1',
  presence_day: '#B3D4A0',
  presence_night: '#C4B5E0',
}

const SEG_LABELS: Record<GuardSegment['type'], string> = {
  effective: 'Travail effectif',
  presence_day: 'Présence responsable',
  presence_night: 'Présence responsable',
}

interface SegmentInfo {
  startTime: string
  endTime: string
  type: GuardSegment['type']
  durationH: number
  nightH: number
}

function buildSegmentInfos(segments: GuardSegment[]): SegmentInfo[] {
  const ref = new Date()
  return segments.map((seg, i) => {
    const endTime = segments[i + 1]?.startTime ?? segments[0].startTime
    const durationH = calculateShiftDuration(seg.startTime, endTime, 0) / 60
    const nightH = calculateNightHours(ref, seg.startTime, endTime)
    return { startTime: seg.startTime, endTime, type: seg.type, durationH, nightH }
  })
}

export function Guard24hRecap({
  guardSegments,
  effectiveHoursComputed,
  nightInterventionsCount,
  isRequalified,
}: Guard24hRecapProps) {
  if (!guardSegments || guardSegments.length === 0) return null

  const infos = buildSegmentInfos(guardSegments)

  let presenceDayH = 0
  let presenceNightH = 0
  for (const info of infos) {
    if (info.type !== 'presence_day' && info.type !== 'presence_night') continue
    presenceDayH += Math.max(0, info.durationH - info.nightH)
    presenceNightH += info.nightH
  }
  const totalAstreinteH = presenceDayH + presenceNightH

  const effectiveH = effectiveHoursComputed ?? 0
  const nightHoursOnEffective = infos
    .filter(s => s.type === 'effective')
    .reduce((sum, s) => sum + s.nightH, 0)

  const nightEquivCoef = isRequalified ? 1 : 1 / 4
  const presenceDayEquiv = presenceDayH * (2 / 3)
  const presenceNightEquiv = presenceNightH * nightEquivCoef

  return (
    <Box
      p={4}
      bg="bg.page"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
    >
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

      <Flex gap="2px" mb={3} borderRadius="full" overflow="hidden" h="10px">
        {infos.map((info, i) => (
          <Box
            key={i}
            flex={Math.max(info.durationH * 60, 30)}
            bg={SEG_COLORS[info.type]}
            h="100%"
            borderRadius="3px"
          />
        ))}
      </Flex>

      <Stack gap={1.5} mb={3}>
        {infos.map((info, i) => (
          <Flex key={i} justify="space-between" align="center" fontSize="13px">
            <Flex align="center" gap={2} minW={0}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={SEG_COLORS[info.type]}
                flexShrink={0}
              />
              <Text color="text.muted">
                {info.startTime} → {info.endTime}
              </Text>
              <Text color="text.default">{SEG_LABELS[info.type]}</Text>
            </Flex>
            <Text fontWeight="600" color="text.default">
              {formatHoursCompact(info.durationH)}
            </Text>
          </Flex>
        ))}
      </Stack>

      <Separator my={2} />

      <Stack gap={1} fontSize="13px">
        <Flex justify="space-between" align="center">
          <Text color="text.default" fontWeight="600">Travail effectif</Text>
          <Flex align="center" gap={2}>
            <Text fontWeight="700" color={effectiveH > 12 ? '#DC2626' : 'text.default'}>
              {formatHoursCompact(effectiveH)}
            </Text>
            <Text color="text.muted" fontSize="12px">/ 12h max</Text>
          </Flex>
        </Flex>

        {presenceDayH > 0 && (
          <Flex justify="space-between" align="center">
            <Text color="text.muted">Présence responsable (jour)</Text>
            <Flex align="center" gap={2}>
              <Text fontWeight="600">{formatHoursCompact(presenceDayH)}</Text>
              <Text color="text.muted" fontSize="12px">
                ×2/3 = {formatHoursCompact(presenceDayEquiv)} équiv.
              </Text>
            </Flex>
          </Flex>
        )}

        {presenceNightH > 0 && (
          <Flex justify="space-between" align="center">
            <Text color="text.muted">Présence responsable (nuit)</Text>
            <Flex align="center" gap={2}>
              <Text fontWeight="600">{formatHoursCompact(presenceNightH)}</Text>
              <Text color="text.muted" fontSize="12px">
                {isRequalified
                  ? `requalifiée = ${formatHoursCompact(presenceNightEquiv)} effectif`
                  : `×1/4 = ${formatHoursCompact(presenceNightEquiv)} équiv.`}
              </Text>
            </Flex>
          </Flex>
        )}

        {totalAstreinteH > 0 && (
          <Flex justify="space-between" align="center" pt={1}>
            <Text color="text.default" fontWeight="600">Total astreinte</Text>
            <Text fontWeight="700" color="text.default">
              {formatHoursCompact(totalAstreinteH)}
            </Text>
          </Flex>
        )}

        {nightHoursOnEffective > 0 && (
          <Flex justify="space-between" align="center">
            <Text color="text.muted">Heures de nuit majorées (+20%)</Text>
            <Text fontWeight="600" color="text.default">
              {formatHoursCompact(nightHoursOnEffective)}
            </Text>
          </Flex>
        )}

        {nightInterventionsCount != null && nightInterventionsCount > 0 && (
          <Flex justify="space-between" align="center">
            <Text color="text.muted">Interventions nocturnes</Text>
            <Text fontWeight="600" color={isRequalified ? 'orange.700' : 'text.default'}>
              {nightInterventionsCount}
              {isRequalified && ' · requalifiée'}
            </Text>
          </Flex>
        )}
      </Stack>
    </Box>
  )
}
