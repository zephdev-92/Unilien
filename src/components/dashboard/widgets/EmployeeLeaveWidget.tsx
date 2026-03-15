import { useState, useEffect } from 'react'
import { Box, Flex, Text, SimpleGrid, Skeleton } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { AccessibleButton } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface EmployeeLeaveWidgetProps {
  employeeId: string
}

interface LeaveData {
  acquiredDays: number
  daysToTakeBefore: number
  deadlineLabel: string
  pendingRequests: number
}

export function EmployeeLeaveWidget({ employeeId }: EmployeeLeaveWidgetProps) {
  const [data, setData] = useState<LeaveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false

    async function load() {
      try {
        // Fetch contrats, soldes congés et absences en parallèle
        const [contractsRes, balancesRes, pendingRes] = await Promise.all([
          supabase
            .from('contracts')
            .select('id, start_date')
            .eq('employee_id', employeeId)
            .eq('status', 'active'),
          supabase
            .from('leave_balances')
            .select('acquired_days, taken_days, adjustment_days')
            .eq('employee_id', employeeId),
          supabase
            .from('absences')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('status', 'pending'),
        ])

        let acquiredDays: number
        const balances = balancesRes.data || []

        if (balances.length > 0) {
          // Soldes en base
          acquiredDays = balances.reduce(
            (sum, b) => sum + (b.acquired_days || 0) - (b.taken_days || 0) + (b.adjustment_days || 0),
            0,
          )
        } else {
          // Fallback : calcul depuis l'ancienneté (2.5j / mois travaillé, IDCC 3239)
          const contracts = contractsRes.data || []
          const now = new Date()
          let totalMonths = 0
          for (const c of contracts) {
            const start = new Date(c.start_date)
            const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
            totalMonths += Math.max(0, months)
          }
          acquiredDays = Math.round(totalMonths * 2.5 * 10) / 10
        }

        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const deadlineLabel = `fin ${endOfMonth.toLocaleDateString('fr-FR', { month: 'long' })}`

        if (!cancelled) {
          setData({
            acquiredDays: Math.round(acquiredDays * 10) / 10,
            daysToTakeBefore: Math.max(0, Math.round(acquiredDays * 0.4)),
            deadlineLabel,
            pendingRequests: pendingRes.data?.length ?? 0,
          })
        }
      } catch (err) {
        logger.error('Erreur chargement congés:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  if (isLoading) {
    return (
      <Box
        bg="bg.surface"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="border.default"
        boxShadow="sm"
        p={4}
      >
        <Skeleton height="16px" width="60%" mb={4} />
        <SimpleGrid columns={3} gap={3}>
          {[1, 2, 3].map((i) => (
            <Box key={i} textAlign="center">
              <Skeleton height="28px" width="40px" mx="auto" mb={1} />
              <Skeleton height="12px" width="80%" mx="auto" />
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    )
  }

  if (!data) return null

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align="center"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="border.default"
      >
        <Text fontSize="15px" fontWeight="700" color="text.default">
          Mes congés & absences
        </Text>
        <AccessibleButton
          variant="outline"
          size="sm"
          asChild
          accessibleLabel="Demander un congé"
          color="text.secondary"
          borderColor="border.default"
          borderRadius="6px"
          px="16px"
          py="7px"
          _hover={{ borderColor: 'brand.500', color: 'brand.500', bg: 'brand.50' }}
        >
          <RouterLink to="/conges/demande">
            <Box as="span" display={{ base: 'none', md: 'inline' }}>Demander un congé</Box>
            <Box as="span" display={{ base: 'inline', md: 'none' }} fontSize="16px" lineHeight="1">+</Box>
          </RouterLink>
        </AccessibleButton>
      </Flex>

      <SimpleGrid columns={3} gap="12px" p={4}>
        <Box textAlign="center" bg="bg.page" p="12px" borderRadius="10px">
          <Text fontSize="22px" fontWeight="800" color="accent.700">
            {data.acquiredDays}j
          </Text>
          <Text fontSize="xs" color="text.muted" fontWeight="500" mt="3px">
            Congés payés acquis
          </Text>
        </Box>

        <Box textAlign="center" bg="bg.page" p="12px" borderRadius="10px">
          <Text fontSize="22px" fontWeight="800" color="warm.500">
            {data.daysToTakeBefore}j
          </Text>
          <Text fontSize="xs" color="text.muted" fontWeight="500" mt="3px">
            À poser avant {data.deadlineLabel}
          </Text>
        </Box>

        <Box textAlign="center" bg="bg.page" p="12px" borderRadius="10px">
          <Text fontSize="22px" fontWeight="800" color="brand.500">
            {data.pendingRequests}
          </Text>
          <Text fontSize="xs" color="text.muted" fontWeight="500" mt="3px">
            Demande{data.pendingRequests !== 1 ? 's' : ''} en attente
          </Text>
        </Box>
      </SimpleGrid>

    </Box>
  )
}
