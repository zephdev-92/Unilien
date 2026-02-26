/**
 * Page de pointage pour les auxiliaires de vie
 * Permet de démarrer et terminer une intervention rapidement
 */

import { useRef } from 'react'
import { Box, Stack, Flex, Text, Center, Spinner } from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DashboardLayout } from '@/components/dashboard'
import { useClockIn } from '@/hooks/useClockIn'
import { ClockInProgressSection } from './ClockInProgressSection'
import { ClockInTodaySection } from './ClockInTodaySection'
import { HistorySection } from './ClockInHistorySection'

export function ClockInPage() {
  const inProgressRef = useRef<HTMLDivElement>(null)
  const idleSectionRef = useRef<HTMLDivElement>(null)

  const {
    profile,
    step,
    isLoadingShifts,
    isLoadingHistory,
    isSubmitting,
    error,
    successMessage,
    historyDays,
    setHistoryDays,
    plannedShifts,
    completedShifts,
    historyByDay,
    historyStats,
    activeShift,
    clockInTime,
    hasNightAction,
    setHasNightAction,
    hasNightHours,
    nightHoursForActive,
    handleClockIn,
    handleClockOut,
    handleCancel,
  } = useClockIn(inProgressRef, idleSectionRef)

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
          <Box
            role="status"
            aria-live="polite"
            p={4}
            bg="green.50"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="green.200"
          >
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
          <ClockInProgressSection
            activeShift={activeShift}
            clockInTime={clockInTime!}
            hasNightHours={hasNightHours}
            nightHoursForActive={nightHoursForActive}
            hasNightAction={hasNightAction}
            isSubmitting={isSubmitting}
            onNightActionChange={setHasNightAction}
            onClockOut={handleClockOut}
            onCancel={handleCancel}
            containerRef={inProgressRef}
          />
        )}

        {/* Interventions du jour */}
        {step === 'idle' && !isLoadingShifts && (
          <ClockInTodaySection
            plannedShifts={plannedShifts}
            completedShifts={completedShifts}
            onClockIn={handleClockIn}
            containerRef={idleSectionRef}
          />
        )}

        {/* Historique */}
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
