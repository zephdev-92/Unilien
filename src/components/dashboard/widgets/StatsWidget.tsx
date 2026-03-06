import { useState, useEffect } from 'react'
import { Box, SimpleGrid, Text, Flex, Skeleton } from '@chakra-ui/react'
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

type StatIconType = 'clock' | 'money' | 'calendar' | 'users' | 'home' | 'notebook'
type StatIconColor = 'blue' | 'green' | 'orange'

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

const ICON_BG_COLORS: Record<StatIconColor, { bg: string; color: string }> = {
  blue: { bg: 'blue.50', color: 'blue.500' },
  green: { bg: 'green.50', color: 'green.500' },
  orange: { bg: 'orange.50', color: 'orange.500' },
}

function StatIcon({ type, color }: { type: StatIconType; color: StatIconColor }) {
  const colors = ICON_BG_COLORS[color]
  const paths: Record<StatIconType, string> = {
    clock: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z',
    money: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.96-3.12 3.19z',
    calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
    users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    notebook: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z',
  }

  return (
    <Flex
      align="center"
      justify="center"
      w={10}
      h={10}
      borderRadius="lg"
      bg={colors.bg}
      flexShrink={0}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ color: `var(--chakra-colors-${colors.color.replace('.', '-')})` }}>
        <path d={paths[type]} />
      </svg>
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
      label: 'Revenus estim\u00e9s',
      value: `${stats.estimatedRevenue} \u20ac`,
      change: 'Brut',
      changeType: 'neutral',
      iconType: 'money',
      iconColor: 'green',
    },
    {
      label: 'Employeurs',
      value: stats.activeEmployers.toString(),
      change: stats.activeEmployers > 0 ? `${stats.activeEmployers} actif${stats.activeEmployers > 1 ? 's' : ''}` : 'Aucun',
      changeType: stats.activeEmployers > 0 ? 'positive' : 'neutral',
      iconType: 'home',
      iconColor: 'orange',
    },
    {
      label: 'Interventions',
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
      label: 'Interventions',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} \u00e0 venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      iconType: 'calendar',
      iconColor: 'green',
    },
    {
      label: 'Notes cahier',
      value: stats.logEntriesThisWeek.toString(),
      change: stats.unreadLogs > 0 ? `${stats.unreadLogs} non lue${stats.unreadLogs > 1 ? 's' : ''}` : 'Cette semaine',
      changeType: stats.unreadLogs > 0 ? 'negative' : 'neutral',
      iconType: 'notebook',
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
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
        boxShadow="sm"
      >
        <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
          Résumé
        </Text>

        <SimpleGrid columns={{ base: 2, md: skeletonCount }} gap={4}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Box
              key={index}
              p={4}
              bg="gray.50"
              borderRadius="lg"
            >
              <Flex align="center" gap={3} mb={3}>
                <Skeleton height="40px" width="40px" borderRadius="lg" />
              </Flex>
              <Skeleton height="28px" width="50%" mb={2} />
              <Skeleton height="14px" width="80%" mb={1} />
              <Skeleton height="12px" width="60%" />
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    )
  }

  // Message d'erreur
  if (error) {
    return (
      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
        boxShadow="sm"
      >
        <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
          Résumé
        </Text>
        <Text color="gray.500" textAlign="center" py={4}>
          {error}
        </Text>
      </Box>
    )
  }

  if (stats.length === 0) {
    return null
  }

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
        Résumé
      </Text>

      <SimpleGrid columns={{ base: 2, md: stats.length }} gap={4}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            p={4}
            bg="gray.50"
            borderRadius="lg"
            transition="all 0.2s"
            _hover={{
              bg: 'brand.50',
              transform: 'translateY(-2px)',
              boxShadow: 'sm',
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
            <Text fontSize="2xl" fontWeight="bold" color="brand.600">
              {stat.value}
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {stat.label}
            </Text>
            {stat.change && (
              <Text
                fontSize="xs"
                fontWeight="medium"
                color={
                  stat.changeType === 'positive'
                    ? 'green.600'
                    : stat.changeType === 'negative'
                      ? 'red.600'
                      : 'gray.500'
                }
                mt={1}
              >
                {stat.change}
              </Text>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export default StatsWidget
