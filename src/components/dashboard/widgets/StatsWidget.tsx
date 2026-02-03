import { useState, useEffect } from 'react'
import { Box, SimpleGrid, Text, Flex, Skeleton } from '@chakra-ui/react'
import type { UserRole } from '@/types'
import {
  getEmployerStats,
  getEmployeeStats,
  getCaregiverStats,
  type EmployerStats,
  type EmployeeStats,
  type CaregiverStats,
} from '@/services/statsService'

interface Stat {
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: string
}

interface StatsWidgetProps {
  userRole: UserRole
  profileId: string
  employerId?: string // Pour les aidants avec permissions avancées
}

/**
 * Formate les heures avec différence
 */
function formatHoursDiff(diff: number): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (diff === 0) {
    return { text: '= mois dernier', type: 'neutral' }
  } else if (diff > 0) {
    return { text: `+${diff}h vs mois dernier`, type: 'positive' }
  } else {
    return { text: `${diff}h vs mois dernier`, type: 'negative' }
  }
}

/**
 * Convertit les stats employeur en format affichable
 */
function formatEmployerStats(stats: EmployerStats): Stat[] {
  const hoursDiff = formatHoursDiff(stats.hoursDiff)

  return [
    {
      label: 'Heures ce mois',
      value: `${stats.hoursThisMonth}h`,
      change: hoursDiff.text,
      changeType: hoursDiff.type,
      icon: '⏱️',
    },
    {
      label: 'Coût mensuel',
      value: `${stats.monthlyCost} €`,
      change: 'Estimation charges incluses',
      changeType: 'neutral',
      icon: '💰',
    },
    {
      label: 'Interventions',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} à venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      icon: '📊',
    },
    {
      label: 'Auxiliaires',
      value: stats.activeAuxiliaries.toString(),
      change: 'Actifs',
      changeType: stats.activeAuxiliaries > 0 ? 'positive' : 'neutral',
      icon: '👥',
    },
  ]
}

/**
 * Convertit les stats employé en format affichable
 */
function formatEmployeeStats(stats: EmployeeStats): Stat[] {
  const hoursDiff = formatHoursDiff(stats.hoursDiff)

  return [
    {
      label: 'Heures ce mois',
      value: `${stats.hoursThisMonth}h`,
      change: hoursDiff.text,
      changeType: hoursDiff.type,
      icon: '⏱️',
    },
    {
      label: 'Revenus estimés',
      value: `${stats.estimatedRevenue} €`,
      change: 'Brut',
      changeType: 'neutral',
      icon: '💰',
    },
    {
      label: 'Employeurs',
      value: stats.activeEmployers.toString(),
      change: 'Actifs',
      changeType: stats.activeEmployers > 0 ? 'positive' : 'neutral',
      icon: '🏠',
    },
    {
      label: 'Interventions',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} à venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      icon: '📊',
    },
  ]
}

/**
 * Convertit les stats aidant en format affichable
 */
function formatCaregiverStats(stats: CaregiverStats): Stat[] {
  return [
    {
      label: 'Interventions',
      value: stats.shiftsThisMonth.toString(),
      change: stats.upcomingShifts > 0 ? `${stats.upcomingShifts} à venir` : 'Ce mois',
      changeType: stats.upcomingShifts > 0 ? 'positive' : 'neutral',
      icon: '📊',
    },
    {
      label: 'Notes cahier',
      value: stats.logEntriesThisWeek.toString(),
      change: stats.unreadLogs > 0 ? `${stats.unreadLogs} non lue${stats.unreadLogs > 1 ? 's' : ''}` : 'Cette semaine',
      changeType: stats.unreadLogs > 0 ? 'negative' : 'neutral',
      icon: '📝',
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
        console.error('Erreur chargement stats:', err)
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
              textAlign="center"
            >
              <Flex justify="center" mb={2}>
                <Skeleton height="32px" width="32px" borderRadius="md" />
              </Flex>
              <Skeleton height="32px" width="60%" mx="auto" mb={2} />
              <Skeleton height="16px" width="80%" mx="auto" mb={1} />
              <Skeleton height="12px" width="70%" mx="auto" />
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
            textAlign="center"
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
            <Flex justify="center" mb={2}>
              <Text fontSize="2xl" aria-hidden="true">
                {stat.icon}
              </Text>
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
