/**
 * Page de pointage pour les auxiliaires de vie
 * Permet de démarrer et terminer une intervention rapidement
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Badge,
  Separator,
  Switch,
  Center,
  Spinner,
} from '@chakra-ui/react'
import { format, subDays, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { getShifts, updateShift } from '@/services/shiftService'
import { calculateNightHours, calculateShiftDuration } from '@/lib/compliance'
import { validateShift as checkCompliance } from '@/lib/compliance/complianceChecker'
import type { ShiftForValidation } from '@/lib/compliance/types'
import { sanitizeText } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import type { Shift } from '@/types'

type ClockInStep = 'idle' | 'in-progress' | 'completing'

export function ClockInPage() {
  const { profile } = useAuth()
  const inProgressRef = useRef<HTMLDivElement>(null)
  const idleSectionRef = useRef<HTMLDivElement>(null)
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [step, setStep] = useState<ClockInStep>('idle')
  const [hasNightAction, setHasNightAction] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [historyShifts, setHistoryShifts] = useState<Shift[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyDays, setHistoryDays] = useState(7)

  // Charger les shifts du jour + historique
  const loadAllShifts = useCallback(async () => {
    if (!profile) return

    setIsLoadingShifts(true)
    setIsLoadingHistory(true)
    try {
      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const historyStart = startOfDay(subDays(today, historyDays))

      const shifts = await getShifts(profile.id, 'employee', historyStart, endOfDay(tomorrow))

      // Shifts d'aujourd'hui
      const todayStr = format(today, 'yyyy-MM-dd')
      setTodayShifts(
        shifts.filter((s) => format(new Date(s.date), 'yyyy-MM-dd') === todayStr)
      )

      // Historique = shifts terminés des jours précédents
      setHistoryShifts(
        shifts.filter(
          (s) =>
            format(new Date(s.date), 'yyyy-MM-dd') !== todayStr &&
            s.status === 'completed'
        )
      )
    } catch (err) {
      logger.error('Erreur chargement shifts:', err)
      setError('Impossible de charger les interventions')
    } finally {
      setIsLoadingShifts(false)
      setIsLoadingHistory(false)
    }
  }, [profile, historyDays])

  useEffect(() => {
    loadAllShifts()
  }, [loadAllShifts])

  // Shifts planifiés et terminés
  const plannedShifts = useMemo(
    () => todayShifts.filter((s) => s.status === 'planned'),
    [todayShifts]
  )
  const completedShifts = useMemo(
    () => todayShifts.filter((s) => s.status === 'completed'),
    [todayShifts]
  )

  // Historique groupé par jour (du plus récent au plus ancien)
  const historyByDay = useMemo(() => {
    const grouped = new Map<string, Shift[]>()
    for (const shift of historyShifts) {
      const dayKey = format(new Date(shift.date), 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, [])
      }
      grouped.get(dayKey)!.push(shift)
    }
    // Trier les jours du plus récent au plus ancien
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, shifts]) => ({
        date: new Date(dateStr),
        dateStr,
        shifts: shifts.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
  }, [historyShifts])

  // Stats récapitulatives
  const historyStats = useMemo(() => {
    let totalMinutes = 0
    let totalNightHours = 0
    let totalNightActionHours = 0
    let shiftCount = 0

    for (const shift of historyShifts) {
      const durationMin = calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
      totalMinutes += durationMin
      shiftCount++

      const nightH = calculateNightHours(new Date(shift.date), shift.startTime, shift.endTime)
      if (nightH > 0) {
        totalNightHours += nightH
        if (shift.hasNightAction) {
          totalNightActionHours += nightH
        }
      }
    }

    return {
      totalHours: totalMinutes / 60,
      totalNightHours,
      totalNightActionHours,
      shiftCount,
    }
  }, [historyShifts])

  // Shift actif (en cours de pointage)
  const activeShift = useMemo(
    () => todayShifts.find((s) => s.id === activeShiftId),
    [todayShifts, activeShiftId]
  )

  // Heures de nuit pour le shift actif
  const nightHoursForActive = useMemo(() => {
    if (!activeShift) return 0
    try {
      return calculateNightHours(
        new Date(activeShift.date),
        activeShift.startTime,
        activeShift.endTime
      )
    } catch {
      return 0
    }
  }, [activeShift])

  const hasNightHours = nightHoursForActive > 0

  // Démarrer une intervention
  const handleClockIn = (shift: Shift) => {
    setActiveShiftId(shift.id)
    setClockInTime(format(new Date(), 'HH:mm'))
    setStep('in-progress')
    setError(null)
    setSuccessMessage(null)
    setHasNightAction(shift.hasNightAction ?? false)
    // Déplacer le focus vers la section en cours après le render
    setTimeout(() => inProgressRef.current?.focus(), 100)
  }

  // Terminer une intervention
  const handleClockOut = async () => {
    if (!activeShift) return

    if (!clockInTime) {
      setError('Heure de début non enregistrée. Veuillez annuler et recommencer le pointage.')
      return
    }

    setStep('completing')
    setIsSubmitting(true)
    setError(null)

    try {
      const clockOutTime = format(new Date(), 'HH:mm')

      await updateShift(activeShift.id, {
        status: 'completed',
        startTime: clockInTime,
        endTime: clockOutTime,
        hasNightAction: hasNightHours ? hasNightAction : false,
      })

      // C-01 : Validation conformité post clock-out
      let complianceWarnings = ''
      try {
        const completedShift: ShiftForValidation = {
          id: activeShift.id,
          contractId: activeShift.contractId,
          employeeId: profile.id,
          date: new Date(activeShift.date),
          startTime: clockInTime,
          endTime: clockOutTime,
          breakDuration: activeShift.breakDuration,
          hasNightAction: hasNightHours ? hasNightAction : false,
        }
        const otherShifts: ShiftForValidation[] = [
          ...todayShifts.filter((s) => s.id !== activeShift.id),
          ...historyShifts,
        ].map((s) => ({
          id: s.id,
          contractId: s.contractId,
          employeeId: profile.id,
          date: new Date(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
          breakDuration: s.breakDuration,
          hasNightAction: s.hasNightAction,
        }))

        const result = checkCompliance(completedShift, otherShifts)
        if (result.warnings.length > 0) {
          complianceWarnings = ' ' + result.warnings.map((w) => w.message).join(' ')
        }
      } catch (err) {
        logger.error('Erreur validation conformité post clock-out:', err)
      }

      setSuccessMessage(
        `Intervention terminée à ${clockOutTime}. Durée effective enregistrée.${complianceWarnings}`
      )

      // Recharger tous les shifts
      await loadAllShifts()

      // Reset
      setActiveShiftId(null)
      setClockInTime(null)
      setStep('idle')
      setHasNightAction(false)
      // Déplacer le focus vers la liste des interventions
      setTimeout(() => idleSectionRef.current?.focus(), 100)
    } catch (err) {
      logger.error('Erreur clock-out:', err)
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la fin de l\'intervention'
      )
      setStep('in-progress')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Annuler le pointage
  const handleCancel = () => {
    setActiveShiftId(null)
    setClockInTime(null)
    setStep('idle')
    setHasNightAction(false)
    setError(null)
    setTimeout(() => idleSectionRef.current?.focus(), 100)
  }

  // Profile not loaded yet
  if (!profile) {
    return (
      <DashboardLayout title="Pointage">
        <Center minH="50vh" role="status" aria-label="Chargement en cours">
          <Spinner size="xl" />
        </Center>
      </DashboardLayout>
    )
  }

  const todayFormatted = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <DashboardLayout title="Pointage">
      <Stack gap={6} maxW="600px" mx="auto">
        {/* En-tête */}
        <Box
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.200"
          p={6}
          boxShadow="sm"
        >
          <Flex align="center" gap={3} mb={2}>
            <Text fontSize="2xl" aria-hidden="true">⏱️</Text>
            <Box>
              <Text fontSize="xl" fontWeight="bold" color="gray.900">
                Pointage
              </Text>
              <Text fontSize="sm" color="gray.500" textTransform="capitalize">
                {todayFormatted}
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* Message de succès */}
        {successMessage && (
          <Box role="status" aria-live="polite" p={4} bg="green.50" borderRadius="lg" borderWidth="1px" borderColor="green.200">
            <Text color="green.700" fontWeight="medium">{successMessage}</Text>
          </Box>
        )}

        {/* Message d'erreur */}
        {error && (
          <Box role="alert" p={4} bg="red.50" borderRadius="lg" borderWidth="1px" borderColor="red.200">
            <Text color="red.700">{error}</Text>
          </Box>
        )}

        {/* Chargement */}
        {isLoadingShifts && (
          <Center py={8} role="status" aria-label="Chargement des interventions">
            <Spinner size="lg" />
          </Center>
        )}

        {/* Intervention en cours */}
        {step === 'in-progress' && activeShift && (
          <Box
            ref={inProgressRef}
            tabIndex={-1}
            bg="white"
            borderRadius="xl"
            borderWidth="2px"
            borderColor="blue.400"
            p={6}
            boxShadow="md"
            _focus={{ outline: '2px solid', outlineColor: 'blue.400', outlineOffset: '2px' }}
          >
            <Flex role="status" aria-live="polite" align="center" gap={2} mb={4}>
              <Box
                aria-hidden="true"
                w="12px"
                h="12px"
                borderRadius="full"
                bg="green.500"
                css={{
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                  },
                }}
              />
              <Text fontWeight="bold" color="blue.700" fontSize="lg">
                Intervention en cours
              </Text>
            </Flex>

            <Stack gap={3}>
              <Flex justify="space-between" align="center">
                <Text color="gray.600">Début prévu</Text>
                <Text fontWeight="semibold">{formatTime(activeShift.startTime)}</Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text color="gray.600">Fin prévue</Text>
                <Text fontWeight="semibold">{formatTime(activeShift.endTime)}</Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text color="gray.600">Pointé à</Text>
                <Badge colorPalette="green" size="lg">{clockInTime}</Badge>
              </Flex>

              {activeShift.tasks.length > 0 && (
                <>
                  <Separator />
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={2}>
                      Tâches prévues
                    </Text>
                    <Stack gap={1}>
                      {activeShift.tasks.map((task, i) => (
                        <Flex key={i} align="center" gap={2}>
                          <Box w="5px" h="5px" borderRadius="full" bg="blue.400" />
                          <Text fontSize="sm">{sanitizeText(task)}</Text>
                        </Flex>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {/* Toggle action de nuit */}
              {hasNightHours && (
                <>
                  <Separator />
                  <Box
                    p={4}
                    bg="purple.50"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="purple.200"
                  >
                    <Text fontWeight="medium" color="purple.800" mb={1}>
                      <span aria-hidden="true">🌙 </span>
                      Heures de nuit : {nightHoursForActive.toFixed(1)}h
                    </Text>
                    <Text fontSize="sm" color="purple.600" mb={3}>
                      La majoration +20% s'applique uniquement si vous effectuez un acte
                      (soin, aide...) pendant la nuit.
                    </Text>
                    <Flex
                      as="label"
                      htmlFor="night-action-switch"
                      justify="space-between"
                      align="center"
                      p={3}
                      bg="white"
                      borderRadius="md"
                      cursor="pointer"
                    >
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        J'effectue un acte cette nuit
                      </Text>
                      <Switch.Root
                        checked={hasNightAction}
                        onCheckedChange={(e) => setHasNightAction(e.checked)}
                      >
                        <Switch.HiddenInput id="night-action-switch" />
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Root>
                    </Flex>
                    <Text
                      aria-live="polite"
                      fontSize="xs"
                      color={hasNightAction ? 'green.600' : 'gray.500'}
                      mt={2}
                    >
                      {hasNightAction
                        ? 'Majoration nuit appliquée : +20%'
                        : 'Pas de majoration nuit'}
                    </Text>
                  </Box>
                </>
              )}

              <Separator />

              <Flex gap={3}>
                <AccessibleButton
                  colorPalette="red"
                  flex={1}
                  onClick={handleClockOut}
                  loading={isSubmitting}
                >
                  Terminer l'intervention
                </AccessibleButton>
                <AccessibleButton
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  accessibleLabel="Annuler le pointage en cours"
                >
                  Annuler
                </AccessibleButton>
              </Flex>
            </Stack>
          </Box>
        )}

        {/* Interventions planifiées */}
        {step === 'idle' && !isLoadingShifts && (
          <Box
            ref={idleSectionRef}
            tabIndex={-1}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            p={6}
            boxShadow="sm"
            _focus={{ outline: '2px solid', outlineColor: 'blue.400', outlineOffset: '2px' }}
          >
            <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
              Interventions du jour
            </Text>

            {plannedShifts.length === 0 && completedShifts.length === 0 && (
              <Box p={6} textAlign="center">
                <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
                <Text color="gray.500">
                  Aucune intervention prévue aujourd'hui
                </Text>
              </Box>
            )}

            {plannedShifts.length > 0 && (
              <Stack gap={3}>
                <Text fontSize="sm" fontWeight="medium" color="gray.500" textTransform="uppercase">
                  À venir
                </Text>
                {plannedShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClockIn={() => handleClockIn(shift)}
                  />
                ))}
              </Stack>
            )}

            {completedShifts.length > 0 && (
              <Stack gap={3} mt={plannedShifts.length > 0 ? 6 : 0}>
                <Text fontSize="sm" fontWeight="medium" color="gray.500" textTransform="uppercase">
                  Terminées
                </Text>
                {completedShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} completed />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Historique des heures */}
        <HistorySection
          historyByDay={historyByDay}
          historyStats={historyStats}
          historyDays={historyDays}
          setHistoryDays={setHistoryDays}
          isLoading={isLoadingHistory}
        />
      </Stack>
    </DashboardLayout>
  )
}

/** Supprime les secondes d'un horaire DB ("16:26:00" → "16:26") */
function formatTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * Formater la date d'un jour en label lisible
 */
function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui"
  if (isYesterday(date)) return 'Hier'
  return format(date, 'EEEE d MMMM', { locale: fr })
}

/**
 * Formater un nombre d'heures en "Xh XXmin"
 */
function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, '0')}min`
}

/**
 * Section historique des heures
 */
function HistorySection({
  historyByDay,
  historyStats,
  historyDays,
  setHistoryDays,
  isLoading,
}: {
  historyByDay: { date: Date; dateStr: string; shifts: Shift[] }[]
  historyStats: {
    totalHours: number
    totalNightHours: number
    totalNightActionHours: number
    shiftCount: number
  }
  historyDays: number
  setHistoryDays: (days: number) => void
  isLoading: boolean
}) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      {/* En-tête historique */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center" gap={2}>
          <Text fontSize="lg" aria-hidden="true">📊</Text>
          <Text fontSize="lg" fontWeight="semibold" color="gray.900">
            Historique des heures
          </Text>
        </Flex>
        <Flex gap={1} role="group" aria-label="Période d'historique">
          {[7, 14, 30].map((days) => (
            <AccessibleButton
              key={days}
              size="xs"
              variant={historyDays === days ? 'solid' : 'outline'}
              colorPalette={historyDays === days ? 'blue' : 'gray'}
              onClick={() => setHistoryDays(days)}
              aria-pressed={historyDays === days}
              accessibleLabel={`Afficher les ${days} derniers jours`}
            >
              {days}j
            </AccessibleButton>
          ))}
        </Flex>
      </Flex>

      {/* Récapitulatif */}
      {!isLoading && historyStats.shiftCount > 0 && (
        <Box
          p={4}
          bg="blue.50"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="blue.100"
          mb={4}
        >
          <Flex wrap="wrap" gap={4}>
            <StatItem
              label="Total heures"
              value={formatHours(historyStats.totalHours)}
              icon="⏱️"
            />
            <StatItem
              label="Interventions"
              value={String(historyStats.shiftCount)}
              icon="📋"
            />
            {historyStats.totalNightHours > 0 && (
              <StatItem
                label="Heures de nuit"
                value={formatHours(historyStats.totalNightHours)}
                icon="🌙"
              />
            )}
            {historyStats.totalNightActionHours > 0 && (
              <StatItem
                label="Nuit (acte)"
                value={formatHours(historyStats.totalNightActionHours)}
                icon="💊"
              />
            )}
          </Flex>
        </Box>
      )}

      {/* Loading */}
      {isLoading && (
        <Center py={6} role="status" aria-label="Chargement de l'historique">
          <Spinner size="md" />
        </Center>
      )}

      {/* Aucun historique */}
      {!isLoading && historyStats.shiftCount === 0 && (
        <Box p={6} textAlign="center">
          <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
          <Text color="gray.500">
            Aucune intervention terminée sur les {historyDays} derniers jours
          </Text>
        </Box>
      )}

      {/* Liste par jour */}
      {!isLoading && historyByDay.length > 0 && (
        <Stack gap={4}>
          {historyByDay.map(({ date, dateStr, shifts }) => {
            const dayTotalMin = shifts.reduce(
              (acc, s) => acc + calculateShiftDuration(s.startTime, s.endTime, s.breakDuration),
              0
            )
            return (
              <Box key={dateStr}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="gray.600"
                    textTransform="capitalize"
                  >
                    {formatDayLabel(date)}
                  </Text>
                  <Badge colorPalette="gray" size="sm">
                    {formatHours(dayTotalMin / 60)}
                  </Badge>
                </Flex>
                <Stack gap={2}>
                  {shifts.map((shift) => (
                    <HistoryShiftRow key={shift.id} shift={shift} />
                  ))}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

/**
 * Item de statistique compact
 */
function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Flex align="center" gap={2} minW="120px">
      <Text fontSize="lg" aria-hidden="true">{icon}</Text>
      <Box>
        <Text fontSize="lg" fontWeight="bold" color="blue.800" lineHeight="1.2">
          {value}
        </Text>
        <Text fontSize="xs" color="blue.600">
          {label}
        </Text>
      </Box>
    </Flex>
  )
}

/**
 * Ligne d'intervention dans l'historique
 */
function HistoryShiftRow({ shift }: { shift: Shift }) {
  const durationMin = calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
  const nightHours = useMemo(() => {
    try {
      return calculateNightHours(new Date(shift.date), shift.startTime, shift.endTime)
    } catch {
      return 0
    }
  }, [shift.date, shift.startTime, shift.endTime])

  return (
    <Flex
      p={3}
      bg="gray.50"
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.100"
      justify="space-between"
      align="center"
    >
      <Flex align="center" gap={3}>
        <Box
          w="4px"
          h="36px"
          borderRadius="full"
          bg="green.400"
          flexShrink={0}
        />
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </Text>
          <Flex align="center" gap={2} mt={0.5}>
            <Text fontSize="xs" color="gray.500">
              {formatHours(durationMin / 60)}
              {shift.breakDuration > 0 && ` (pause ${shift.breakDuration}min)`}
            </Text>
            {nightHours > 0 && (
              <Badge
                size="sm"
                colorPalette={shift.hasNightAction ? 'purple' : 'gray'}
                variant="subtle"
              >
                <span aria-hidden="true">🌙 </span>
                {nightHours.toFixed(1)}h {shift.hasNightAction ? '(acte)' : '(présence)'}
              </Badge>
            )}
          </Flex>
        </Box>
      </Flex>
      {shift.tasks.length > 0 && (
        <Text fontSize="xs" color="gray.400" maxW="120px" truncate textAlign="right">
          {shift.tasks.slice(0, 2).map(sanitizeText).join(', ')}
        </Text>
      )}
    </Flex>
  )
}

/**
 * Carte d'une intervention
 */
function ShiftCard({
  shift,
  onClockIn,
  completed = false,
}: {
  shift: Shift
  onClockIn?: () => void
  completed?: boolean
}) {
  const nightHours = useMemo(() => {
    try {
      return calculateNightHours(
        new Date(shift.date),
        shift.startTime,
        shift.endTime
      )
    } catch {
      return 0
    }
  }, [shift.date, shift.startTime, shift.endTime])

  return (
    <Box
      p={4}
      bg={completed ? 'gray.50' : 'white'}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={completed ? 'gray.200' : 'blue.200'}
      borderLeftWidth="4px"
      borderLeftColor={completed ? 'green.400' : 'blue.400'}
    >
      <Flex justify="space-between" align="start">
        <Box>
          <Text fontSize="lg" fontWeight="semibold" color={completed ? 'gray.600' : 'gray.900'}>
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </Text>
          {shift.tasks.length > 0 && (
            <Text fontSize="sm" color="gray.500" mt={1}>
              {shift.tasks.slice(0, 2).map(sanitizeText).join(', ')}
              {shift.tasks.length > 2 && ` +${shift.tasks.length - 2}`}
            </Text>
          )}
          {nightHours > 0 && (
            <Flex align="center" gap={1} mt={1}>
              <Text fontSize="xs" color="purple.600">
                <span aria-hidden="true">🌙 </span>
                {nightHours.toFixed(1)}h de nuit
                {shift.hasNightAction ? ' (acte)' : ' (présence)'}
              </Text>
            </Flex>
          )}
        </Box>
        <Flex align="center" gap={2}>
          {completed ? (
            <Badge colorPalette="green">Terminée</Badge>
          ) : (
            onClockIn && (
              <AccessibleButton
                colorPalette="blue"
                size="sm"
                onClick={onClockIn}
              >
                Pointer
              </AccessibleButton>
            )
          )}
        </Flex>
      </Flex>
    </Box>
  )
}

export default ClockInPage
