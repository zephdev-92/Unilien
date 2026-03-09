import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text, Center, Spinner } from '@chakra-ui/react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  parseISO,
  isValid,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { NewShiftModal } from './NewShiftModal'
import { ShiftDetailModal } from './ShiftDetailModal'
import { RepeatShiftModal } from './RepeatShiftModal'
import { AbsenceRequestModal } from './AbsenceRequestModal'
import { AbsenceDetailModal } from './AbsenceDetailModal'
import { PlanningSidebar } from './PlanningSidebar'
import { PlanningStatsBar, NextShiftChip } from './PlanningStatsBar'
import { getShifts } from '@/services/shiftService'
import { getAbsencesForEmployee, getAbsencesForEmployer } from '@/services/absenceService'
import { getCaregiver, getShiftsForCaregiver } from '@/services/caregiverService'
import { logger } from '@/lib/logger'
import type { Shift, Absence, Caregiver, ShiftType } from '@/types'

type ViewMode = 'week' | 'month'
type ShiftStatusFilter = 'all' | 'planned' | 'completed' | 'cancelled'
type ShiftTypeFilter = 'all' | ShiftType

export function PlanningPage() {
  const { profile, isInitialized } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false)
  const [isAbsenceRequestModalOpen, setIsAbsenceRequestModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [repeatShift, setRepeatShift] = useState<Shift | null>(null)
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null)
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)

  // Filtres sidebar
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<ShiftTypeFilter>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)

  // Charger les données de l'aidant si c'est un caregiver
  useEffect(() => {
    async function loadCaregiverData() {
      if (profile?.role === 'caregiver') {
        try {
          const caregiverData = await getCaregiver(profile.id)
          setCaregiver(caregiverData)
        } catch (error) {
          logger.error('Erreur chargement données aidant:', error)
        }
      }
    }
    loadCaregiverData()
  }, [profile])

  // Vérifier si l'utilisateur peut éditer le planning
  const canEditPlanning = profile?.role === 'employer' ||
    (profile?.role === 'caregiver' && caregiver?.permissions?.canEditPlanning)

  // ID de l'employeur pour créer des interventions
  const employerIdForShifts = profile?.role === 'employer'
    ? profile.id
    : caregiver?.employerId

  // Gérer les paramètres d'URL
  useEffect(() => {
    // Naviguer vers une date spécifique si ?date=YYYY-MM-DD dans l'URL
    const dateParam = searchParams.get('date')
    if (dateParam) {
      const parsedDate = parseISO(dateParam)
      if (isValid(parsedDate)) {
        setCurrentDate(parsedDate)
      }
      // Nettoyer le paramètre date de l'URL après navigation
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('date')
      setSearchParams(newParams, { replace: true })
    }

    // Ouvrir le modal absence si ?action=absence dans l'URL
    if (searchParams.get('action') === 'absence' && profile?.role === 'employee') {
      setIsAbsenceRequestModalOpen(true)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('action')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, profile?.role, setSearchParams])

  // Calcul des dates selon le mode de vue
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )
  const monthStart = useMemo(
    () => startOfMonth(currentDate),
    [currentDate]
  )
  const monthEnd = useMemo(
    () => endOfMonth(currentDate),
    [currentDate]
  )

  // Dates de chargement selon le mode
  const rangeStart = viewMode === 'week' ? weekStart : monthStart
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd

  const loadShifts = useCallback(async () => {
    if (!profile) return

    setIsLoadingShifts(true)
    try {
      // Pour les aidants, utiliser getShiftsForCaregiver
      let shiftsPromise: Promise<Shift[]>
      if (profile.role === 'caregiver') {
        shiftsPromise = getShiftsForCaregiver(profile.id, rangeStart, rangeEnd)
      } else {
        shiftsPromise = getShifts(profile.id, profile.role, rangeStart, rangeEnd)
      }

      // Charger les absences selon le rôle
      let absencesPromise: Promise<Absence[]>
      if (profile.role === 'employee') {
        absencesPromise = getAbsencesForEmployee(profile.id)
      } else if (profile.role === 'employer') {
        absencesPromise = getAbsencesForEmployer(profile.id)
      } else if (profile.role === 'caregiver' && caregiver?.employerId) {
        absencesPromise = getAbsencesForEmployer(caregiver.employerId)
      } else {
        absencesPromise = Promise.resolve([])
      }

      const [shiftsData, absencesData] = await Promise.all([
        shiftsPromise,
        absencesPromise,
      ])
      setShifts(shiftsData)
      // Filtrer les absences pour la période actuelle
      const periodAbsences = absencesData.filter((absence) => {
        const start = new Date(absence.startDate)
        const end = new Date(absence.endDate)
        return start <= rangeEnd && end >= rangeStart
      })
      setAbsences(periodAbsences)
    } catch (error) {
      logger.error('Erreur chargement planning:', error)
    } finally {
      setIsLoadingShifts(false)
    }
  }, [profile, rangeStart, rangeEnd, caregiver])

  useEffect(() => {
    if (profile && isInitialized) {
      loadShifts()
    }
  }, [profile, isInitialized, loadShifts])

  // Appliquer les filtres sur les shifts
  const filteredShifts = useMemo(() => {
    let result = shifts
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      result = result.filter((s) => s.shiftType === typeFilter)
    }
    if (employeeFilter) {
      result = result.filter((s) => s.employeeId === employeeFilter)
    }
    return result
  }, [shifts, statusFilter, typeFilter, employeeFilter])

  // Navigation selon le mode
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }
  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }
  const goToToday = () => setCurrentDate(new Date())

  // Profile not loaded yet
  if (!profile) {
    return (
      <DashboardLayout title="Planning">
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  const dateLabel = viewMode === 'week'
    ? `${format(weekStart, 'd', { locale: fr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr })

  const isEmployee = profile.role === 'employee'
  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || employeeFilter !== null

  return (
    <DashboardLayout title="Planning">
      <Flex gap={6} direction={{ base: 'column', xl: 'row' }} align="flex-start">
        {/* Colonne principale */}
        <Box flex={1} minW={0}>
          {/* Stats bar (employee view) */}
          {isEmployee && (
            <Box mb={4}>
              <PlanningStatsBar
                shifts={shifts}
                absences={absences}
              />
            </Box>
          )}

          {/* Navigation */}
          <Flex
            justify="space-between"
            align="center"
            mb={6}
            p={4}
            bg="white"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.200"
            flexWrap="wrap"
            gap={3}
          >
            <Flex gap={2}>
              <AccessibleButton
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                accessibleLabel={viewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
              >
                ← Précédent
              </AccessibleButton>
              <AccessibleButton
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Aujourd'hui
              </AccessibleButton>
              <AccessibleButton
                variant="outline"
                size="sm"
                onClick={goToNext}
                accessibleLabel={viewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
              >
                Suivant →
              </AccessibleButton>
            </Flex>

            {/* Sélecteur de vue */}
            <Flex gap={1} bg="gray.100" p={1} borderRadius="md">
              <AccessibleButton
                size="sm"
                variant={viewMode === 'week' ? 'solid' : 'ghost'}
                colorPalette={viewMode === 'week' ? 'blue' : undefined}
                onClick={() => setViewMode('week')}
              >
                Semaine
              </AccessibleButton>
              <AccessibleButton
                size="sm"
                variant={viewMode === 'month' ? 'solid' : 'ghost'}
                colorPalette={viewMode === 'month' ? 'blue' : undefined}
                onClick={() => setViewMode('month')}
              >
                Mois
              </AccessibleButton>
            </Flex>

            <Flex align="center" gap={3}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800" textTransform="capitalize">
                {dateLabel}
              </Text>
              {/* Chip prochaine intervention (employee) */}
              {isEmployee && <NextShiftChip shifts={shifts} />}
            </Flex>

            <Flex gap={2}>
              {isEmployee && (
                <AccessibleButton
                  colorPalette="orange"
                  size="sm"
                  onClick={() => setIsAbsenceRequestModalOpen(true)}
                >
                  + Déclarer absence
                </AccessibleButton>
              )}
              {canEditPlanning && (
                <AccessibleButton
                  colorPalette="blue"
                  size="sm"
                  onClick={() => setIsNewShiftModalOpen(true)}
                >
                  + Nouvelle intervention
                </AccessibleButton>
              )}
            </Flex>
          </Flex>

          {/* Indicateur filtres actifs */}
          {hasActiveFilters && (
            <Flex mb={3} gap={2} align="center">
              <Text fontSize="sm" color="gray.500">
                {filteredShifts.length} intervention{filteredShifts.length !== 1 ? 's' : ''} affichée{filteredShifts.length !== 1 ? 's' : ''}
              </Text>
              <Box
                as="button"
                type="button"
                fontSize="xs"
                color="blue.600"
                cursor="pointer"
                _hover={{ textDecoration: 'underline' }}
                onClick={() => {
                  setStatusFilter('all')
                  setTypeFilter('all')
                  setEmployeeFilter(null)
                }}
              >
                Effacer les filtres
              </Box>
            </Flex>
          )}

          {/* Vue planning */}
          {isLoadingShifts ? (
            <Center py={12}>
              <Spinner size="lg" color="brand.500" />
            </Center>
          ) : viewMode === 'week' ? (
            <WeekView
              weekStart={weekStart}
              shifts={filteredShifts}
              absences={absences}
              userRole={profile.role}
              onShiftClick={(shift) => setSelectedShift(shift)}
              onAbsenceClick={(absence) => setSelectedAbsence(absence)}
            />
          ) : (
            <MonthView
              currentDate={currentDate}
              shifts={filteredShifts}
              absences={absences}
              userRole={profile.role}
              onShiftClick={(shift) => setSelectedShift(shift)}
              onAbsenceClick={(absence) => setSelectedAbsence(absence)}
            />
          )}
        </Box>

        {/* Sidebar filtres */}
        <Box
          w={{ base: '100%', xl: '260px' }}
          flexShrink={0}
          display={{ base: 'none', xl: 'block' }}
        >
          <PlanningSidebar
            shifts={shifts}
            userRole={profile.role}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            employeeFilter={employeeFilter}
            onStatusFilterChange={setStatusFilter}
            onTypeFilterChange={setTypeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
          />
        </Box>
      </Flex>

      {canEditPlanning && employerIdForShifts && (
        <NewShiftModal
          isOpen={isNewShiftModalOpen}
          onClose={() => setIsNewShiftModalOpen(false)}
          employerId={employerIdForShifts}
          onSuccess={loadShifts}
        />
      )}

      <ShiftDetailModal
        isOpen={selectedShift !== null}
        onClose={() => setSelectedShift(null)}
        shift={selectedShift}
        userRole={profile.role}
        profileId={profile.id}
        caregiverCanEdit={caregiver?.permissions?.canEditPlanning}
        onRepeat={canEditPlanning && employerIdForShifts ? (shift) => {
          setSelectedShift(null)
          setRepeatShift(shift)
        } : undefined}
        onSuccess={() => {
          loadShifts()
          setSelectedShift(null)
        }}
      />

      {repeatShift && employerIdForShifts && (
        <RepeatShiftModal
          isOpen={true}
          onClose={() => setRepeatShift(null)}
          shift={repeatShift}
          employerId={employerIdForShifts}
          existingShifts={shifts.map((s) => ({
            id: s.id,
            contractId: s.contractId,
            employeeId: s.employeeId ?? '',
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            breakDuration: s.breakDuration,
            shiftType: s.shiftType,
          }))}
          approvedAbsences={[]}
          onSuccess={() => {
            loadShifts()
            setRepeatShift(null)
          }}
        />
      )}

      {profile.role === 'employee' && (
        <AbsenceRequestModal
          isOpen={isAbsenceRequestModalOpen}
          onClose={() => setIsAbsenceRequestModalOpen(false)}
          employeeId={profile.id}
          onSuccess={loadShifts}
        />
      )}

      <AbsenceDetailModal
        isOpen={selectedAbsence !== null}
        onClose={() => setSelectedAbsence(null)}
        absence={selectedAbsence}
        userRole={profile.role}
        userId={profile.id}
        onSuccess={() => {
          loadShifts()
          setSelectedAbsence(null)
        }}
      />
    </DashboardLayout>
  )
}

export default PlanningPage
