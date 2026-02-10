/**
 * Page de pointage pour les auxiliaires de vie
 * Permet de démarrer et terminer une intervention rapidement
 */

import { useState, useMemo, useRef } from 'react'
import {
  Box,
  Stack,
  Flex,
  Text,
  Center,
  Spinner,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { updateShift } from '@/services/shiftService'
import { calculateNightHours } from '@/lib/compliance'
import { validateShift as checkCompliance } from '@/lib/compliance/complianceChecker'
import type { ShiftForValidation } from '@/lib/compliance/types'
import { logger } from '@/lib/logger'
import type { Shift } from '@/types'
import { useClockInShifts } from './useClockInShifts'
import { ActiveShiftPanel } from './ActiveShiftPanel'
import { ShiftCard } from './ShiftCard'
import { HistorySection } from './HistorySection'
import type { ClockInStep } from './types'

export function ClockInPage() {
  const { profile } = useAuth()

  const {
    todayShifts,
    historyShifts,
    plannedShifts,
    completedShifts,
    historyByDay,
    historyStats,
    isLoadingShifts,
    isLoadingHistory,
    historyDays,
    setHistoryDays,
    loadError,
    loadAllShifts,
  } = useClockInShifts(profile?.id)

  const inProgressRef = useRef<HTMLDivElement>(null)
  const idleSectionRef = useRef<HTMLDivElement>(null)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [step, setStep] = useState<ClockInStep>('idle')
  const [hasNightAction, setHasNightAction] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeShift = useMemo(
    () => todayShifts.find((s) => s.id === activeShiftId),
    [todayShifts, activeShiftId]
  )

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

  const handleClockIn = (shift: Shift) => {
    setActiveShiftId(shift.id)
    setClockInTime(format(new Date(), 'HH:mm'))
    setStep('in-progress')
    setError(null)
    setSuccessMessage(null)
    setHasNightAction(shift.hasNightAction ?? false)
    setTimeout(() => inProgressRef.current?.focus(), 100)
  }

  const handleClockOut = async () => {
    if (!activeShift || !clockInTime) {
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
          employeeId: profile!.id,
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
          employeeId: profile!.id,
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

      await loadAllShifts()

      setActiveShiftId(null)
      setClockInTime(null)
      setStep('idle')
      setHasNightAction(false)
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

  const handleCancel = () => {
    setActiveShiftId(null)
    setClockInTime(null)
    setStep('idle')
    setHasNightAction(false)
    setError(null)
    setTimeout(() => idleSectionRef.current?.focus(), 100)
  }

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
            <Text fontSize="2xl">⏱️</Text>
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
        {(error || loadError) && (
          <Box role="alert" p={4} bg="red.50" borderRadius="lg" borderWidth="1px" borderColor="red.200">
            <Text color="red.700">{error || loadError}</Text>
          </Box>
        )}

        {/* Chargement */}
        {isLoadingShifts && (
          <Center py={8} role="status" aria-label="Chargement des interventions">
            <Spinner size="lg" />
          </Center>
        )}

        {/* Intervention en cours */}
        {step === 'in-progress' && activeShift && clockInTime && (
          <ActiveShiftPanel
            shift={activeShift}
            clockInTime={clockInTime}
            nightHours={nightHoursForActive}
            hasNightAction={hasNightAction}
            onNightActionChange={setHasNightAction}
            onClockOut={handleClockOut}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            panelRef={inProgressRef}
          />
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
                <Text fontSize="3xl" mb={2}>📭</Text>
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

export default ClockInPage
