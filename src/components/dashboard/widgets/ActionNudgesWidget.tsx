import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '@/lib/logger'

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
  orange: { bg: 'orange.50', border: 'orange.200', icon: 'orange.600', text: 'orange.800', sub: 'orange.600' },
  blue: { bg: 'blue.50', border: 'blue.200', icon: 'blue.600', text: 'blue.800', sub: 'blue.600' },
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
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        const monthLabel = format(now, 'MMMM yyyy', { locale: fr })
        const weekLabel = format(weekStart, "'Semaine du' d MMMM", { locale: fr })

        // 1. Shifts completed but not validated by employer this week
        const { count: unvalidatedCount } = await supabase
          .from('shifts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .eq('validated_by_employer', false)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])
          .in(
            'contract_id',
            (await supabase.from('contracts').select('id').eq('employer_id', employerId).eq('status', 'active')).data?.map((c) => c.id) ?? []
          )

        if (unvalidatedCount && unvalidatedCount > 0) {
          result.push({
            id: 'validate-hours',
            title: `Valider les heures de la semaine`,
            subtitle: `${weekLabel} — ${unvalidatedCount}h à confirmer`,
            href: '/planning',
            color: 'blue',
            icon: ClockIcon,
          })
        }

        // 2. Active employees without payslip for current month
        const { data: activeContracts } = await supabase
          .from('contracts')
          .select('id, employees!inner(profiles!inner(first_name, last_name))')
          .eq('employer_id', employerId)
          .eq('status', 'active')

        if (activeContracts && activeContracts.length > 0) {
          const contractIds = activeContracts.map((c) => c.id)

          const { data: existingPayslips } = await supabase
            .from('payslips')
            .select('contract_id')
            .in('contract_id', contractIds)
            .gte('period_start', monthStart.toISOString().split('T')[0])
            .lte('period_start', monthEnd.toISOString().split('T')[0])

          const payslipContractIds = new Set(existingPayslips?.map((p) => p.contract_id) ?? [])
          const missing = activeContracts.filter((c) => !payslipContractIds.has(c.id))

          if (missing.length > 0) {
            const names = missing
              .slice(0, 2)
              .map((c) => {
                const emp = c.employees as unknown as { profiles: { first_name: string; last_name: string } }
                return `${emp.profiles.first_name} ${emp.profiles.last_name.charAt(0)}.`
              })
            const nameStr = names.join(', ') + (missing.length > 2 ? ` +${missing.length - 2}` : '')

            result.push({
              id: 'generate-payslips',
              title: `${missing.length} bulletin${missing.length > 1 ? 's' : ''} de paie à générer`,
              subtitle: `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} — ${nameStr}`,
              href: '/documents',
              color: 'orange',
              icon: DocumentIcon,
            })
          }
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
        <Skeleton flex="1" minW="240px" height="64px" borderRadius="md" />
        <Skeleton flex="1" minW="240px" height="64px" borderRadius="md" />
      </Flex>
    )
  }

  if (nudges.length === 0) {
    return null
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
            borderRadius="md"
            textDecoration="none"
            transition="all 0.2s"
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
              borderRadius="md"
              bg={`${nudge.color}.100`}
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
