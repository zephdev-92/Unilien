import { useState, useEffect } from 'react'
import { Box, Flex, Text, Skeleton } from '@chakra-ui/react'
import { supabase } from '@/lib/supabase/client'
import { calculateShiftDuration } from '@/lib/compliance/utils'
import { logger } from '@/lib/logger'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface EmployeeHoursProgressProps {
  employeeId: string
}

interface HoursData {
  completed: number
  contractual: number
  remaining: number
  percent: number
  monthLabel: string
}

export function EmployeeHoursProgress({ employeeId }: EmployeeHoursProgressProps) {
  const [data, setData] = useState<HoursData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false

    async function load() {
      try {
        const now = new Date()
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

        // Get active contracts with weekly hours
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, weekly_hours')
          .eq('employee_id', employeeId)
          .eq('status', 'active')

        if (!contracts || contracts.length === 0) {
          if (!cancelled) setIsLoading(false)
          return
        }

        const contractIds = contracts.map(c => c.id)

        // Monthly contractual = sum of weekly_hours * ~4.33
        const totalWeekly = contracts.reduce((sum, c) => sum + (c.weekly_hours || 0), 0)
        const contractual = Math.round(totalWeekly * 4.33)

        // Get completed/planned shifts this month
        const { data: shifts } = await supabase
          .from('shifts')
          .select('start_time, end_time, break_duration, status')
          .in('contract_id', contractIds)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .in('status', ['completed', 'planned'])

        const totalHours = (shifts || []).reduce((sum, s) => {
          const dur = calculateShiftDuration(s.start_time, s.end_time, s.break_duration || 0)
          return sum + dur / 60
        }, 0)

        const completed = Math.round(totalHours * 10) / 10
        const remaining = Math.max(0, contractual - completed)
        const percent = contractual > 0 ? Math.min(Math.round((completed / contractual) * 100), 100) : 0

        const label = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        if (!cancelled) {
          setData({
            completed,
            contractual,
            remaining,
            percent,
            monthLabel: label.charAt(0).toUpperCase() + label.slice(1),
          })
        }
      } catch (err) {
        logger.error('Erreur chargement heures:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [employeeId])

  if (isLoading) {
    return (
      <Box bg="bg.page" borderRadius="12px" p={4}>
        <Skeleton height="14px" width="60%" mb={3} />
        <Skeleton height="8px" borderRadius="full" mb={2} />
        <Skeleton height="12px" width="80%" />
      </Box>
    )
  }

  if (!data) return null

  return (
    <Box
      bg="bg.page"
      borderRadius="12px"
      p={4}
      borderWidth="1px"
      borderColor="border.default"
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight="700" color="text.default">
          Heures contractuelles — {data.monthLabel}
        </Text>
        <Text fontSize="sm" fontWeight="700" color="text.default">
          {data.completed}h{' '}
          <Text as="span" fontWeight="400" fontSize="14px" color="text.muted">
            / {data.contractual}h
          </Text>
        </Text>
      </Flex>

      {/* Progress bar */}
      <Box
        h="8px"
        bg="border.default"
        borderRadius="full"
        overflow="hidden"
        mb={2}
        role="progressbar"
        aria-valuenow={data.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${data.completed}h sur ${data.contractual}h contractuelles`}
      >
        <Box
          h="100%"
          w={`${data.percent}%`}
          bg="brand.500"
          borderRadius="full"
          transition="width 0.5s ease"
        />
      </Box>

      <Text fontSize="11px" color="text.muted">
        {data.remaining > 0
          ? `Il vous reste ${data.remaining}h à effectuer d'ici la fin du mois`
          : 'Heures contractuelles atteintes'}
      </Text>
    </Box>
  )
}
