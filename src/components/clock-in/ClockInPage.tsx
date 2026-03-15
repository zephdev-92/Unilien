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
import { EmployeeClockWidget } from './EmployeeClockWidget'
import { ClockInProgressSection } from './ClockInProgressSection'
import { ClockInTodaySection } from './ClockInTodaySection'
import { TodayTable } from './TodayTable'
import { WeeklySummary } from './WeeklySummary'
import { AnomaliesPanel } from './AnomaliesPanel'
import { ManualEntryForm, type EmployeeOption } from './ManualEntryForm'
import { EmployeeDaySchedule } from './EmployeeDaySchedule'
import { MonthSummary } from './MonthSummary'
import { ShiftEditModal } from './ShiftEditModal'
import { DateNavigator } from './DateNavigator'
import { RetroactiveEntryForm } from './RetroactiveEntryForm'

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
    handleRetroactiveValidation,
    loadAllShifts,
    selectedDate,
    setSelectedDate,
    isSelectedDateToday,
    selectedDateShifts,
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
      <DashboardLayout title="Suivi des heures">
        <Center minH="50vh" role="status" aria-label="Chargement en cours">
          <Spinner size="xl" />
        </Center>
      </DashboardLayout>
    )
  }

  const profileName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
    : undefined

  return (
    <DashboardLayout title={isEmployer ? 'Suivi des heures' : 'Mes heures'}>
      <Flex
        gap={6}
        direction={{ base: 'column', lg: 'row' }}
        align="flex-start"
      >
        {/* Colonne principale */}
        <Stack gap={6} flex={1} minW={0}>

          {/* Employeur : horloge simple */}
          {isEmployer && <LiveClock />}

          {/* Employé : barre de navigation par date */}
          {!isEmployer && (
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              shifts={[...todayShifts, ...historyShifts, ...selectedDateShifts]}
            />
          )}

          {/* Employé : widget horloge (aujourd'hui) ou formulaire rétroactif (date passée) */}
          {!isEmployer && isSelectedDateToday && (
            <EmployeeClockWidget
              step={step}
              activeShift={activeShift}
              clockInTime={clockInTime}
              plannedShifts={plannedShifts}
              isSubmitting={isSubmitting}
              profileName={profileName}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onCancel={handleCancel}
              containerRef={inProgressRef}
            />
          )}

          {!isEmployer && !isSelectedDateToday && (
            <RetroactiveEntryForm
              shifts={selectedDateShifts}
              selectedDate={selectedDate}
              onValidate={handleRetroactiveValidation}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Employer: résumé rapide */}
          {isEmployer && !isLoadingShifts && (
            <Box
              bg="bg.surface"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.default"
              p={5}
              boxShadow="0 2px 8px rgba(78,100,120,.09)"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="sm" color="text.muted" fontWeight="500">Auxiliaires actifs</Text>
                  <Text fontSize="2xl" fontWeight="900" fontFamily="heading" color="text.default">
                    {employeeNamesFromShifts}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="text.muted" fontWeight="500">À valider</Text>
                  <Text fontSize="2xl" fontWeight="900" fontFamily="heading" color="#4A3D2B">
                    {completedShifts.filter((s) => !s.validatedByEmployer).length}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="text.muted" fontWeight="500">Validées</Text>
                  <Text fontSize="2xl" fontWeight="900" fontFamily="heading" color="#3A5210">
                    {completedShifts.filter((s) => s.validatedByEmployer).length}
                  </Text>
                </Box>
              </Flex>
            </Box>
          )}

          {/* Messages */}
          {successMessage && (
            <Flex role="status" aria-live="polite" align="center" gap={2.5} px={3} py={2.5} borderRadius="md" borderLeftWidth="3px" borderLeftColor="#9BB23B" bg="#EFF4DC" color="text.default">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3A5210" strokeWidth={2} width={16} height={16} aria-hidden="true" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <Text fontSize="sm" fontWeight="500">{successMessage}</Text>
            </Flex>
          )}

          {error && (
            <Flex role="alert" align="center" gap={2.5} px={3} py={2.5} borderRadius="md" borderLeftWidth="3px" borderLeftColor="#991B1B" bg="#FEF2F2" color="#991B1B">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} aria-hidden="true" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <Text fontSize="sm" fontWeight="500">{error}</Text>
            </Flex>
          )}

          {isLoadingShifts && (
            <Center py={8} role="status" aria-label="Chargement des interventions">
              <Spinner size="lg" />
            </Center>
          )}

          {/* Employeur : intervention en cours (section séparée) */}
          {isEmployer && step === 'in-progress' && activeShift && (
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
              selectedDate={isSelectedDateToday ? undefined : selectedDate}
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

        </Stack>

        {/* Sidebar */}
        <Stack
          gap={5}
          w={{ base: '100%', lg: '300px' }}
          flexShrink={0}
        >
          {isEmployer ? (
            <>
              <WeeklySummary
                todayShifts={todayShifts}
                historyShifts={historyShifts}
              />
              <AnomaliesPanel
                todayShifts={todayShifts}
                historyShifts={historyShifts}
              />
              <ManualEntryForm
                onSubmit={handleManualEntry}
                employees={employeeOptions}
              />
            </>
          ) : (
            <>
              <WeeklySummary
                todayShifts={todayShifts}
                historyShifts={historyShifts}
                title="Ma semaine"
                weeklyGoalHours={40}
              />
              <EmployeeDaySchedule todayShifts={todayShifts} />
              <MonthSummary
                todayShifts={todayShifts}
                historyShifts={historyShifts}
              />
            </>
          )}
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
