import React, { useEffect, useMemo, useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { format, isToday, isFuture } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getShiftDurationMinutes } from '@/lib/compliance'
import { formatHoursCompact } from '@/lib/formatHours'
import { supabase } from '@/lib/supabase/client'
import type { Shift, Absence } from '@/types'

// --- Icônes SVG inline (même que proto) ---

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const FileIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

// --- Couleurs icônes (proto: blue, green, warn) ---

const iconColors = {
  blue: { bg: 'brand.subtle', color: 'brand.500' },
  green: { bg: 'accent.subtle', color: 'green.600' },
  warn: { bg: 'orange.50', color: 'orange.500' },
} as const

type IconColor = keyof typeof iconColors

// --- Composant stat unitaire (proto align) ---

function StatIcon({ color, children }: { color: IconColor; children: React.ReactNode }) {
  return (
    <Flex
      align="center"
      justify="center"
      w="36px"
      h="36px"
      borderRadius="8px"
      flexShrink={0}
      bg={iconColors[color].bg}
      color={iconColors[color].color}
    >
      {children}
    </Flex>
  )
}

function StatItem({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode
  iconColor: IconColor
  value: string
  label: string
}) {
  return (
    <Flex
      align="center"
      gap={3}
      py={2}
      px={3}
      flex="1"
      minW="0"
    >
      <StatIcon color={iconColor}>{icon}</StatIcon>
      <Box minW="0">
        <Text
          fontFamily="heading"
          fontSize={{ base: '16px', sm: '18px' }}
          fontWeight="800"
          color="text.default"
          lineHeight="1.1"
        >
          {value}
        </Text>
        <Text
          fontSize="11px"
          color="text.muted"
          fontWeight="500"
          mt="1px"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {label}
        </Text>
      </Box>
    </Flex>
  )
}

// --- Séparateur vertical (desktop only) ---

function StatDivider() {
  return (
    <Box
      display={{ base: 'none', sm: 'block' }}
      w="1px"
      alignSelf="stretch"
      bg="border.default"
    />
  )
}

// --- Stats Bar Employé ---

interface PlanningStatsBarProps {
  shifts: Shift[]
  absences: Absence[]
  role: 'employee' | 'employer' | 'caregiver'
  pchMonthlyHours?: number
  employeeId?: string
}

export function PlanningStatsBar({ shifts, role, pchMonthlyHours, employeeId }: PlanningStatsBarProps) {
  const [acquiredDays, setAcquiredDays] = useState<number | null>(null)
  const [weeklyHours, setWeeklyHours] = useState<number>(0)

  // Charger solde congés + heures contractuelles depuis Supabase
  useEffect(() => {
    if (role !== 'employee' || !employeeId) return
    let cancelled = false

    async function loadEmployeeData() {
      const [balancesRes, contractsRes] = await Promise.all([
        supabase
          .from('leave_balances')
          .select('acquired_days, taken_days, adjustment_days')
          .eq('employee_id', employeeId!),
        supabase
          .from('contracts')
          .select('id, start_date, weekly_hours')
          .eq('employee_id', employeeId!)
          .eq('status', 'active'),
      ])

      if (cancelled) return

      // Heures contractuelles hebdo (proto: affiche weekly_hours brut)
      const contracts = contractsRes.data || []
      const totalWeekly = contracts.reduce((sum, c) => sum + (c.weekly_hours || 0), 0)
      setWeeklyHours(totalWeekly)

      // Congés acquis
      const balances = balancesRes.data || []
      if (balances.length > 0) {
        const days = balances.reduce(
          (sum, b) => sum + (b.acquired_days || 0) - (b.taken_days || 0) + (b.adjustment_days || 0),
          0
        )
        setAcquiredDays(Math.round(days * 10) / 10)
      } else {
        // Fallback : calcul depuis ancienneté (2.5j / mois, IDCC 3239)
        const now = new Date()
        let totalMonths = 0
        for (const c of contracts) {
          const start = new Date(c.start_date)
          const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
          totalMonths += Math.max(0, months)
        }
        setAcquiredDays(Math.round(totalMonths * 2.5 * 10) / 10)
      }
    }

    loadEmployeeData()
    return () => { cancelled = true }
  }, [role, employeeId])

  const stats = useMemo(() => {
    const completed = shifts.filter((s) => s.status === 'completed')
    const totalMinutes = completed.reduce(
      (acc, s) => acc + getShiftDurationMinutes(s),
      0
    )
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10
    const shiftCount = shifts.length

    return { totalHours, weeklyHours, shiftCount, acquiredDays: acquiredDays ?? 0 }
  }, [shifts, weeklyHours, acquiredDays])

  const items = role === 'caregiver'
    ? getCaregiverItems(stats, pchMonthlyHours)
    : getEmployeeItems(stats)

  return (
    <Flex
      bg="bg.page"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="12px"
      p={{ base: 3, sm: '12px 20px' }}
      gap={{ base: 2, sm: 3 }}
      flexWrap="wrap"
      role="region"
      aria-label={role === 'caregiver' ? 'Récapitulatif mensuel PCH' : 'Récapitulatif mensuel'}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <StatDivider />}
          <Box flex={{ base: '1 0 calc(50% - 8px)', sm: '1' }} minW="0">
            <StatItem
              icon={item.icon}
              iconColor={item.iconColor}
              value={item.value}
              label={item.label}
            />
          </Box>
        </React.Fragment>
      ))}
    </Flex>
  )
}

// --- Config stats par rôle ---

function getEmployeeItems(stats: { totalHours: number; weeklyHours: number; shiftCount: number; acquiredDays: number }) {
  return [
    {
      icon: <ClockIcon />,
      iconColor: 'blue' as IconColor,
      value: formatHoursCompact(stats.totalHours),
      label: 'Heures effectuées',
    },
    {
      icon: <ActivityIcon />,
      iconColor: 'green' as IconColor,
      value: stats.weeklyHours > 0 ? formatHoursCompact(stats.weeklyHours) : '—',
      label: 'Heures contractuelles',
    },
    {
      icon: <CalendarIcon />,
      iconColor: 'blue' as IconColor,
      value: String(stats.shiftCount),
      label: 'Interventions ce mois',
    },
    {
      icon: <FileIcon />,
      iconColor: 'warn' as IconColor,
      value: `${stats.acquiredDays}j`,
      label: 'Congés payés acquis',
    },
  ]
}

function getCaregiverItems(
  stats: { totalHours: number; shiftCount: number },
  pchMonthlyHours?: number
) {
  const quota = pchMonthlyHours || 0
  const remaining = Math.max(0, quota - stats.totalHours)

  return [
    {
      icon: <ClockIcon />,
      iconColor: 'blue' as IconColor,
      value: formatHoursCompact(stats.totalHours),
      label: 'Heures effectuées',
    },
    {
      icon: <ShieldIcon />,
      iconColor: 'warn' as IconColor,
      value: quota > 0 ? formatHoursCompact(quota) : '—',
      label: 'Quota PCH mensuel',
    },
    {
      icon: <ActivityIcon />,
      iconColor: 'green' as IconColor,
      value: quota > 0 ? formatHoursCompact(remaining) : '—',
      label: 'Restant ce mois',
    },
    {
      icon: <CalendarIcon />,
      iconColor: 'blue' as IconColor,
      value: String(stats.shiftCount),
      label: "Temps d'aide ce mois",
    },
  ]
}

/** Chip "Prochaine intervention" pour la barre de navigation */
export function NextShiftChip({ shifts }: { shifts: Shift[] }) {
  const nextShift = useMemo(() => {
    const now = new Date()
    const upcoming = shifts
      .filter((s) => s.status === 'planned')
      .filter((s) => {
        const shiftDate = new Date(s.date)
        if (isFuture(shiftDate)) return true
        if (isToday(shiftDate)) {
          const [h, m] = s.startTime.split(':').map(Number)
          const startTime = new Date(shiftDate)
          startTime.setHours(h, m, 0, 0)
          return startTime > now
        }
        return false
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (dateA !== dateB) return dateA - dateB
        return a.startTime.localeCompare(b.startTime)
      })

    return upcoming[0] || null
  }, [shifts])

  if (!nextShift) return null

  const shiftDate = new Date(nextShift.date)
  const dateLabel = isToday(shiftDate)
    ? "Aujourd'hui"
    : format(shiftDate, 'EEE d', { locale: fr })

  return (
    <Flex
      align="center"
      gap={2}
      px={3}
      py={1.5}
      bg="brand.subtle"
      borderRadius="full"
      borderWidth="1px"
      borderColor="brand.200"
    >
      <Text fontSize="xs" color="brand.600" fontWeight="medium">
        Prochaine : {dateLabel} à {nextShift.startTime.slice(0, 5)}
      </Text>
    </Flex>
  )
}
