import { useState, useEffect } from 'react'
import { Box, SimpleGrid, Text, Flex, Skeleton } from '@chakra-ui/react'
import { NavIcon } from '@/components/ui'
import type { UserRole } from '@/types'
import { logger } from '@/lib/logger'
import {
  getEmployerStats,
  getEmployeeStats,
  getCaregiverStats,
  type EmployerStats,
  type EmployeeStats,
  type CaregiverStats,
} from '@/services/statsService'

type StatIconType = 'clock' | 'money' | 'calendar' | 'users' | 'home' | 'notebook' | 'shield' | 'file'
type StatIconColor = 'blue' | 'green' | 'orange' | 'warn'

interface Stat {
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  iconType: StatIconType
  iconColor: StatIconColor
}

interface StatsWidgetProps {
  userRole: UserRole
  profileId: string
  employerId?: string
}

const STAT_CARD_PROPS = {
  bg: 'bg.surface',
  borderRadius: '12px',
  borderWidth: '1px',
  borderColor: 'border.default',
  p: 4,
  boxShadow: 'sm',
} as const

const ICON_BG_COLORS: Record<StatIconColor, { bg: string; color: string }> = {
  blue: { bg: 'brand.50', color: 'brand.500' },
  green: { bg: 'accent.50', color: 'accent.700' },
  orange: { bg: 'warm.50', color: 'warm.500' },
  warn: { bg: '#FEF9C3', color: '#B45309' },
}

const ICON_NAV_NAMES: Record<StatIconType, string> = {
  clock: 'clock',
  money: 'barchart',
  calendar: 'calendar',
  users: 'users',
  home: 'grid',
  notebook: 'book',
  shield: 'shield',
  file: 'file',
}

function StatIcon({ type, color }: { type: StatIconType; color: StatIconColor }) {
  const colors = ICON_BG_COLORS[color]

  return (
    <Flex
      align="center"
      justify="center"
      w="42px"
      h="42px"
      borderRadius="12px"
      bg={colors.bg}
      color={colors.color}
      flexShrink={0}
    >
      <NavIcon name={ICON_NAV_NAMES[type]} size={20} />
    </Flex>
  )
}

function formatHoursDiff(diff: number): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (diff === 0) {
    return { text: '= mois dernier', type: 'neutral' }
  } else if (diff > 0) {
    return { text: `+${diff}h vs mois dernier`, type: 'positive' }
  } else {
    return { text: `${diff}h vs mois dernier`, type: 'negative' }
  }
}

function formatEmployerStats(stats: EmployerStats): Stat[] {
  const hoursDiff = formatHoursDiff(stats.hoursDiff)

  return [
    {
      label: 'Heures ce mois',
      value: `${stats.hoursThisMonth}h`,
      change: hoursDiff.type === 'positive' ? `\u2191 ${hoursDiff.text}` : hoursDiff.type === 'negative' ? `\u2193 ${hoursDiff.text}` : hoursDiff.text,
      changeType: hoursDiff.type,
      iconType: 'clock',
      iconColor: 'blue',
    },
    {
      label: 'Co\u00fbt mensuel',
      value: `${stats.monthlyCost} \u20ac`,
      change: 'Estimation charges incluses',
      changeType: 'neutral',
      iconType: 'money',
      iconColor: 'green',
    },
    {
      label: 'Interventions',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} \u00e0 venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      iconType: 'calendar',
      iconColor: 'green',
    },
    {
      label: 'Auxiliaires',
      value: stats.activeAuxiliaries.toString(),
      change: stats.activeAuxiliaries > 0 ? `\u2191 ${stats.activeAuxiliaries} actif${stats.activeAuxiliaries > 1 ? 's' : ''}` : 'Aucun',
      changeType: stats.activeAuxiliaries > 0 ? 'positive' : 'neutral',
      iconType: 'users',
      iconColor: 'blue',
    },
  ]
}

function formatEmployeeStats(stats: EmployeeStats): Stat[] {
  return [
    {
      label: 'Interventions aujourd\u2019hui',
      value: stats.shiftsToday.toString(),
      change: stats.activeShiftsNow > 0 ? `${stats.activeShiftsNow} en cours` : stats.shiftsToday > 0 ? 'Planifi\u00e9es' : 'Aucune',
      changeType: stats.activeShiftsNow > 0 ? 'positive' : 'neutral',
      iconType: 'calendar',
      iconColor: 'blue',
    },
    {
      label: 'Heures ce mois',
      value: `${stats.hoursThisMonth}h`,
      change: stats.contractualHours > 0 ? `sur ${stats.contractualHours}h contractuelles` : 'Ce mois',
      changeType: 'neutral',
      iconType: 'clock',
      iconColor: 'green',
    },
    {
      label: 'Taux de pr\u00e9sence',
      value: `${stats.presenceRate}%`,
      change: stats.presenceRate >= 95 ? 'Excellent' : stats.presenceRate >= 80 ? 'Bon' : 'À am\u00e9liorer',
      changeType: stats.presenceRate >= 80 ? 'positive' : 'negative',
      iconType: 'money',
      iconColor: 'blue',
    },
    {
      label: 'Interventions ce mois',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} \u00e0 venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      iconType: 'calendar',
      iconColor: 'green',
    },
  ]
}

function formatCaregiverStats(stats: CaregiverStats): Stat[] {
  return [
    {
      label: 'Interventions du jour',
      value: stats.shiftsToday.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} à venir` : 'Aujourd\'hui',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      iconType: 'clock',
      iconColor: 'blue',
    },
    {
      label: 'Heures ce mois',
      value: `${stats.hoursThisMonth}h`,
      change: stats.pchMonthlyHours > 0 ? `sur ${stats.pchMonthlyHours}h allouées PCH` : 'Ce mois',
      changeType: 'positive',
      iconType: 'clock',
      iconColor: 'green',
    },
    {
      label: 'Enveloppe PCH restante',
      value: `${stats.pchRemaining}h`,
      change: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      changeType: 'neutral',
      iconType: 'shield',
      iconColor: 'warn',
    },
    {
      label: 'Documents à signer',
      value: stats.documentsToSign.toString(),
      change: stats.documentsToSign > 0 ? 'Consulter →' : 'Aucun en attente',
      changeType: stats.documentsToSign > 0 ? 'positive' : 'neutral',
      iconType: 'file',
      iconColor: 'blue',
    },
  ]
}

export function StatsWidget({ userRole, profileId, employerId }: StatsWidgetProps) {
  const [stats, setStats] = useState<Stat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      if (!profileId) return

      setIsLoading(true)
      setError(null)

      try {
        let formattedStats: Stat[] = []

        if (userRole === 'employer') {
          const employerStats = await getEmployerStats(profileId)
          formattedStats = formatEmployerStats(employerStats)
        } else if (userRole === 'employee') {
          const employeeStats = await getEmployeeStats(profileId)
          formattedStats = formatEmployeeStats(employeeStats)
        } else if (userRole === 'caregiver') {
          // Si employerId fourni, utiliser les stats employeur (aidant avec permissions avancées)
          if (employerId) {
            const employerStats = await getEmployerStats(employerId)
            formattedStats = formatEmployerStats(employerStats)
          } else {
            const caregiverStats = await getCaregiverStats(profileId)
            formattedStats = formatCaregiverStats(caregiverStats)
          }
        }

        setStats(formattedStats)
      } catch (err) {
        logger.error('Erreur chargement stats:', err)
        setError('Erreur lors du chargement des statistiques')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [userRole, profileId, employerId])

  // Skeleton pour le chargement
  if (isLoading) {
    // Si aidant avec employerId (permissions avancées), afficher 4 stats comme employeur
    const skeletonCount = userRole === 'caregiver' && !employerId ? 2 : 4

    return (
      <SimpleGrid columns={{ base: 2, md: skeletonCount }} gap={4}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Box key={index} {...STAT_CARD_PROPS}>
            <Skeleton height="42px" width="42px" borderRadius="12px" mb={3} />
            <Skeleton height="28px" width="50%" mb={2} />
            <Skeleton height="14px" width="80%" mb={1} />
            <Skeleton height="12px" width="60%" />
          </Box>
        ))}
      </SimpleGrid>
    )
  }

  // Message d'erreur
  if (error) {
    return (
      <Box {...STAT_CARD_PROPS}>
        <Text color="text.muted" textAlign="center" py={4}>
          {error}
        </Text>
      </Box>
    )
  }

  if (stats.length === 0) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 2, md: stats.length }} gap={4}>
      {stats.map((stat) => (
        <Box
          key={stat.label}
          {...STAT_CARD_PROPS}
          transition="all 0.15s ease"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          css={{
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              transform: 'none !important',
            },
          }}
        >
          <Flex mb={3}>
            <StatIcon type={stat.iconType} color={stat.iconColor} />
          </Flex>
          <Text fontSize="2xl" fontWeight="bold" color="text.default">
            {stat.value}
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="text.secondary">
            {stat.label}
          </Text>
          {stat.change && (
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={
                stat.changeType === 'negative'
                  ? 'red.600'
                  : 'accent.500'
              }
              mt={1}
            >
              {stat.change}
            </Text>
          )}
        </Box>
      ))}
    </SimpleGrid>
  )
}

export default StatsWidget
