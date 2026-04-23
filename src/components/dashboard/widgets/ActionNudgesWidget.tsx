import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '@/lib/logger'
import { getUnvalidatedShiftsCount, getMissingPayslipEmployees } from '@/services/nudgeService'

interface Nudge {
  id: string
  title: string
  subtitle: string
  href: string
  color: 'orange' | 'blue'
  icon: React.ReactNode
}

interface ActionNudgesWidgetProps {
  employerId: string
}

const DocumentIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const ClockIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const colorMap = {
  orange: { bg: 'warm.subtle', border: 'warm.200', icon: 'warm.500', text: 'warm.700', sub: 'warm.500' },
  blue: { bg: 'brand.subtle', border: 'brand.200', icon: 'brand.500', text: 'brand.700', sub: 'brand.500' },
}

export function ActionNudgesWidget({ employerId }: ActionNudgesWidgetProps) {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNudges() {
      setLoading(true)
      const result: Nudge[] = []

      try {
        const now = new Date()
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        const weekLabel = format(weekStart, "'Semaine du' d MMMM", { locale: fr })

        // 1. Shifts completed but not validated by employer this week
        const unvalidatedCount = await getUnvalidatedShiftsCount(employerId, weekStart, weekEnd)

        if (unvalidatedCount > 0) {
          result.push({
            id: 'validate-hours',
            title: `Valider les heures de la semaine`,
            subtitle: `${weekLabel} — ${unvalidatedCount}h à confirmer`,
            href: '/planning',
            color: 'blue',
            icon: ClockIcon,
          })
        }

        // 2. Active employees without payslip for last closed month (previous month)
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const checkYear = prevMonthDate.getFullYear()
        const checkMonth = prevMonthDate.getMonth() + 1

        const { count: missingCount, names: nameStr } = await getMissingPayslipEmployees(
          employerId,
          checkYear,
          checkMonth
        )

        if (missingCount > 0) {
          const prevMonthLabel = format(prevMonthDate, 'MMMM yyyy', { locale: fr })
          result.push({
            id: 'upload-payslips',
            title: `${missingCount} bulletin${missingCount > 1 ? 's' : ''} de paie à uploader`,
            subtitle: `${prevMonthLabel.charAt(0).toUpperCase() + prevMonthLabel.slice(1)} — ${nameStr}`,
            href: '/documents',
            color: 'orange',
            icon: DocumentIcon,
          })
        }
      } catch (err) {
        logger.error('Erreur chargement nudges:', err)
      } finally {
        setLoading(false)
      }

      setNudges(result)
    }

    loadNudges()
  }, [employerId])

  if (loading) {
    return (
      <Flex gap={4} flexWrap="wrap">
        <Skeleton flex="1" minW="240px" height="64px" borderRadius="12px" />
        <Skeleton flex="1" minW="240px" height="64px" borderRadius="12px" />
      </Flex>
    )
  }

  if (nudges.length === 0) {
    return <Box data-empty="" />
  }

  return (
    <Flex gap={4} flexWrap="wrap" role="region" aria-label="Actions en attente">
      {nudges.map((nudge) => {
        const colors = colorMap[nudge.color]
        return (
          <Box
            key={nudge.id}
            as={RouterLink}
            to={nudge.href}
            flex="1"
            minW="240px"
            display="flex"
            alignItems="center"
            gap={3}
            p={4}
            bg={colors.bg}
            borderWidth="1px"
            borderColor={colors.border}
            borderRadius="12px"
            textDecoration="none"
            transition="all 0.15s ease"
            _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.500',
              outlineOffset: '2px',
            }}
            css={{
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                transform: 'none !important',
              },
            }}
          >
            <Flex
              align="center"
              justify="center"
              w="36px"
              h="36px"
              borderRadius="12px"
              bg={nudge.color === 'orange' ? 'warm.100' : 'brand.100'}
              color={colors.icon}
              flexShrink={0}
            >
              {nudge.icon}
            </Flex>
            <Box flex="1" minW={0}>
              <Text fontWeight="semibold" fontSize="sm" color={colors.text} lineClamp={1}>
                {nudge.title}
              </Text>
              <Text fontSize="xs" color={colors.sub} lineClamp={1}>
                {nudge.subtitle}
              </Text>
            </Box>
            <Text color={colors.icon} aria-hidden="true" flexShrink={0}>
              →
            </Text>
          </Box>
        )
      })}
    </Flex>
  )
}

export default ActionNudgesWidget
