/**
 * Page de pointage
 * - Employé/aidant : pointer ses interventions
 * - Employeur : consulter, modifier et valider les heures de ses auxiliaires
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { Box, Stack, Flex, Center, Spinner, Text } from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { useClockIn } from '@/hooks/useClockIn'
import { createShift, updateShift, validateShift } from '@/services/shiftService'
import { getContractsForEmployer } from '@/services/contractService'
import { logger } from '@/lib/logger'
import type { Shift } from '@/types'
import { LiveClock } from './LiveClock'
import { ClockInProgressSection } from './ClockInProgressSection'
import { ClockInTodaySection } from './ClockInTodaySection'
import { TodayTable } from './TodayTable'
import { WeeklySummary } from './WeeklySummary'
import { AnomaliesPanel } from './AnomaliesPanel'
import { ManualEntryForm, type EmployeeOption } from './ManualEntryForm'
import { ShiftEditModal } from './ShiftEditModal'
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
    todayShifts,
    historyShifts,
    plannedShifts,
    completedShifts,
    historyByDay,
    historyStats,
    activeShift,
    activeShiftId,
    clockInTime,
    hasNightAction,
    setHasNightAction,
    hasNightHours,
    nightHoursForActive,
    handleClockIn,
    handleClockOut,
    handleCancel,
    loadAllShifts,
  } = useClockIn(inProgressRef, idleSectionRef)

  const userRole = profile?.role ?? 'employee'
  const isEmployer = userRole === 'employer'

  // Employer: charger la liste des auxiliaires pour la saisie manuelle
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])

  useEffect(() => {
    if (!profile || !isEmployer) return

    getContractsForEmployer(profile.id)
      .then((contracts) => {
        const options = contracts
          .filter((c) => c.employee)
          .map((c) => ({
            contractId: c.id,
            employeeId: c.employeeId || '',
            employeeName: c.employee
              ? `${c.employee.firstName} ${c.employee.lastName}`.trim()
              : 'Auxiliaire',
          }))
        setEmployeeOptions(options)
      })
      .catch((err) => logger.error('Erreur chargement auxiliaires:', err))
  }, [profile, isEmployer])

  // Employer: modale de modification d'un shift
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  const handleModify = useCallback((shift: Shift) => {
    setEditingShift(shift)
  }, [])

  const handleSaveModification = useCallback(async (
    shiftId: string,
    updates: { startTime: string; endTime: string }
  ) => {
    await updateShift(shiftId, updates)
    await loadAllShifts()
  }, [loadAllShifts])

  const handleValidate = useCallback(async (shift: Shift) => {
    await validateShift(shift.id, 'employer')
    await loadAllShifts()
  }, [loadAllShifts])

  const handleManualEntry = useCallback(async (data: {
    date: string
    startTime: string
    endTime: string
    contractId?: string
  }) => {
    if (!profile) return

    let contractId = data.contractId

    // Si pas de contractId fourni (mode employé), chercher dans les shifts existants
    if (!contractId) {
      const existingShift = todayShifts[0] || historyShifts[0]
      if (!existingShift) {
        throw new Error("Aucun contrat trouvé. Créez d'abord une intervention via le planning.")
      }
      contractId = existingShift.contractId
    }

    await createShift(contractId, {
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      breakDuration: 0,
      tasks: [],
      shiftType: 'effective',
    })

    await loadAllShifts()
  }, [profile, todayShifts, historyShifts, loadAllShifts])

  // Employer: déduire les employés uniques des shifts pour le résumé
  const employeeNamesFromShifts = useMemo(() => {
    const names = new Set<string>()
    for (const s of [...todayShifts, ...historyShifts]) {
      if (s.employeeName) names.add(s.employeeName)
    }
    return names.size
  }, [todayShifts, historyShifts])

  if (!profile) {
    return (
      <DashboardLayout title="Pointage">
        <Center minH="50vh" role="status" aria-label="Chargement en cours">
          <Spinner size="xl" />
        </Center>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isEmployer ? 'Heures des auxiliaires' : 'Pointage'}>
      <Flex
        gap={6}
        direction={{ base: 'column', lg: 'row' }}
        align="flex-start"
      >
        {/* Colonne principale */}
        <Stack gap={6} flex={1} minW={0}>
          {/* Horloge digitale */}
          <LiveClock />

          {/* Employer: résumé rapide */}
          {isEmployer && !isLoadingShifts && (
            <Box
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="gray.200"
              p={5}
              boxShadow="sm"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="sm" color="gray.500">Auxiliaires actifs</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                    {employeeNamesFromShifts}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">À valider</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {completedShifts.filter((s) => !s.validatedByEmployer).length}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Validées</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {completedShifts.filter((s) => s.validatedByEmployer).length}
                  </Text>
                </Box>
              </Flex>
            </Box>
          )}

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

          {/* Intervention en cours — employé/aidant uniquement */}
          {!isEmployer && step === 'in-progress' && activeShift && (
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

          {/* Tableau heures du jour */}
          {!isLoadingShifts && (
            <TodayTable
              plannedShifts={plannedShifts}
              completedShifts={completedShifts}
              activeShiftId={activeShiftId}
              clockInTime={clockInTime}
              userRole={userRole}
              onClockIn={handleClockIn}
              onValidate={handleValidate}
              onModify={handleModify}
            />
          )}

          {/* Interventions du jour (vue cards — mobile, employé uniquement) */}
          {!isEmployer && step === 'idle' && !isLoadingShifts && (
            <Box display={{ base: 'block', md: 'none' }}>
              <ClockInTodaySection
                plannedShifts={plannedShifts}
                completedShifts={completedShifts}
                onClockIn={handleClockIn}
                containerRef={idleSectionRef}
              />
            </Box>
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

        {/* Sidebar */}
        <Stack
          gap={5}
          w={{ base: '100%', lg: '300px' }}
          flexShrink={0}
        >
          {/* Résumé semaine */}
          <WeeklySummary
            todayShifts={todayShifts}
            historyShifts={historyShifts}
          />

          {/* Anomalies détectées */}
          <AnomaliesPanel
            todayShifts={todayShifts}
            historyShifts={historyShifts}
          />

          {/* Saisie manuelle */}
          <ManualEntryForm
            onSubmit={handleManualEntry}
            employees={isEmployer ? employeeOptions : undefined}
          />
        </Stack>
      </Flex>

      {/* Modale de modification */}
      {editingShift && (
        <ShiftEditModal
          shift={editingShift}
          onSave={handleSaveModification}
          onClose={() => setEditingShift(null)}
        />
      )}
    </DashboardLayout>
  )
}

export default ClockInPage
