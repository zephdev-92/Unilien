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
// AccessibleButton available via '@/components/ui' if needed
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { NewShiftModal } from './NewShiftModal'
import { ShiftDetailModal } from './ShiftDetailModal'
import { RepeatShiftModal } from './RepeatShiftModal'
import { AbsenceRequestModal } from './AbsenceRequestModal'
import { AbsenceDetailModal } from './AbsenceDetailModal'
// PlanningSidebar remplacé par des dropdowns inline
import { PlanningStatsBar, NextShiftChip } from './PlanningStatsBar'
import { getShifts } from '@/services/shiftService'
import { getAbsencesForEmployee, getAbsencesForEmployer } from '@/services/absenceService'
import { getCaregiver, getShiftsForCaregiver } from '@/services/caregiverService'
import { logger } from '@/lib/logger'
import { toaster } from '@/lib/toaster'
import {
  getPlanningExportData,
  getPlanningExportDataForEmployee,
  generatePlanningPdf,
  generatePlanningExcel,
  generatePlanningIcal,
  downloadExport,
} from '@/lib/export'
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

  // Menu télécharger
  const [isDlMenuOpen, setIsDlMenuOpen] = useState(false)

  // Filtres sidebar
  const [statusFilter] = useState<ShiftStatusFilter>('all')
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

  const isEmployee = profile?.role === 'employee'
  const isEmployer = profile?.role === 'employer' || profile?.role === 'caregiver'

  // Extract unique employees for dropdown filter
  const employees = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shifts) {
      if (s.employeeId && s.employeeName) {
        map.set(s.employeeId, s.employeeName)
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [shifts])

  // Télécharger le planning
  const handleDownload = useCallback(async (fmt: 'pdf' | 'excel' | 'ical') => {
    if (!profile) return
    setIsDlMenuOpen(false)
    try {
      const options = { month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }
      const data = isEmployee
        ? await getPlanningExportDataForEmployee(profile.id, options)
        : await getPlanningExportData(profile.id, options)

      if (!data) return

      const result = fmt === 'pdf'
        ? generatePlanningPdf(data)
        : fmt === 'excel'
        ? generatePlanningExcel(data)
        : generatePlanningIcal(data)

      downloadExport(result)
      toaster.success({ title: `Planning exporté en ${fmt.toUpperCase()}` })
    } catch (error) {
      logger.error('Erreur export planning:', error)
      toaster.error({ title: 'Erreur lors de l\'export du planning' })
    }
  }, [profile, currentDate, isEmployee])

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

  // Header actions — proto: topbar-right = toggle + actions
  const btnRadius = '6px'

  const topbarRight = (
    <Flex align="center" gap={2}>
      {/* Vue toggle — proto: view-toggle (section 34) */}
      <Flex
        display={{ base: 'none', md: 'flex' }}
        gap="2px"
        bg="bg.muted"
        borderWidth="1.5px"
        borderColor="border.default"
        borderRadius="10px"
        p="3px"
      >
        <Box
          as="button"
          px={{ base: 2, lg: 4 }}
          py="5px"
          borderRadius="6px"
          fontSize="14px"
          fontWeight="600"
          bg={viewMode === 'week' ? 'brand.solid' : 'transparent'}
          color={viewMode === 'week' ? 'white' : 'text.inactive'}
          boxShadow={viewMode === 'week' ? 'sm' : 'none'}
          transition="background 0.15s, color 0.15s"
          cursor="pointer"
          onClick={() => setViewMode('week')}
        >
          Semaine
        </Box>
        <Box
          as="button"
          px={{ base: 2, lg: 4 }}
          py="5px"
          borderRadius="6px"
          fontSize="14px"
          fontWeight="600"
          bg={viewMode === 'month' ? 'brand.solid' : 'transparent'}
          color={viewMode === 'month' ? 'white' : 'text.inactive'}
          boxShadow={viewMode === 'month' ? 'sm' : 'none'}
          transition="background 0.15s, color 0.15s"
          cursor="pointer"
          onClick={() => setViewMode('month')}
        >
          Mois
        </Box>
      </Flex>

      {/* Bouton Télécharger — hidden on mobile */}
      <Box position="relative" display={{ base: 'none', md: 'block' }}>
        <Flex
          as="button"
          align="center"
          gap={1}
          px={3} py="5px"
          borderWidth="1.5px" borderColor="border.strong"
          borderRadius={btnRadius}
          fontSize="13px" fontWeight="600" color="brand.fg"
          bg="transparent"
          _hover={{ bg: 'bg.page' }}
          onClick={() => setIsDlMenuOpen(!isDlMenuOpen)}
          aria-haspopup="true"
          aria-expanded={isDlMenuOpen}
          aria-label="Télécharger le planning"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <Box as="span" display={{ base: 'none', sm: 'inline' }}>Télécharger</Box>
        </Flex>
        {isDlMenuOpen && (
          <>
            <Box position="fixed" inset={0} zIndex={99} onClick={() => setIsDlMenuOpen(false)} />
            <Box
              position="absolute"
              top="calc(100% + 4px)"
              right={0}
              zIndex={100}
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="8px"
              boxShadow="md"
              py={1}
              minW="200px"
            >
              <Text fontSize="xs" fontWeight="700" color="text.muted" px={3} py={1.5} textTransform="uppercase" letterSpacing="0.05em">
                Format d&apos;export
              </Text>
              {[
                { key: 'pdf' as const, label: 'PDF', sub: 'Calendrier mensuel imprimable' },
                { key: 'excel' as const, label: 'Excel', sub: 'Tableau des interventions' },
                { key: 'ical' as const, label: 'iCal', sub: 'Synchronisation calendrier' },
              ].map((item) => (
                <Flex
                  key={item.key}
                  as="button"
                  w="100%"
                  align="center"
                  gap={3}
                  px={3} py={2}
                  _hover={{ bg: 'bg.page' }}
                  onClick={() => handleDownload(item.key)}
                  role="menuitem"
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="text.default">{item.label}</Text>
                    <Text fontSize="xs" color="text.muted">{item.sub}</Text>
                  </Box>
                </Flex>
              ))}
            </Box>
          </>
        )}
      </Box>

      {isEmployee && (
        <Flex
          as="button"
          align="center"
          gap={1}
          px={4} py="6px"
          bg="brand.500" color="white"
          borderRadius={btnRadius}
          fontSize="13px" fontWeight="700"
          _hover={{ bg: 'brand.600' }}
          onClick={() => setIsAbsenceRequestModalOpen(true)}
        >
          +<Box as="span" display={{ base: 'none', sm: 'inline' }}> Absence</Box>
        </Flex>
      )}
      {canEditPlanning && (
        <Flex
          as="button"
          align="center"
          gap={1}
          px={4} py="6px"
          bg="brand.500" color="white"
          borderRadius={btnRadius}
          fontSize="13px" fontWeight="700"
          _hover={{ bg: 'brand.600' }}
          onClick={() => setIsNewShiftModalOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={14} height={14} aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <Box as="span" display={{ base: 'none', sm: 'inline' }}>Intervention</Box>
        </Flex>
      )}
    </Flex>
  )

  return (
    <DashboardLayout title="Planning" topbarRight={topbarRight} fillHeight>
      <Flex direction="column" flex={1} minH={0}>
          {/* Stats bar (employee + caregiver views — proto align) */}
          {(isEmployee || profile.role === 'caregiver') && (
            <Box mb={4} flexShrink={0}>
              <PlanningStatsBar
                shifts={shifts}
                absences={absences}
                role={profile.role as 'employee' | 'caregiver'}
                employeeId={profile.role === 'employee' ? profile.id : undefined}
                pchMonthlyHours={profile.pchMonthlyHours}
              />
            </Box>
          )}

          {/* Navigation — date + arrows + today + filters */}
          <Flex
            justify="space-between"
            align="center"
            mb={3}
            flexWrap="wrap"
            flexShrink={0}
            gap={3}
          >
            <Flex align="center" gap={3}>
              <Flex
                as="button" align="center" justify="center"
                px="7px" py="7px"
                borderRadius="6px"
                borderWidth="1.5px" borderColor="border.strong"
                bg="transparent" color="brand.fg"
                _hover={{ borderColor: 'brand.solid', color: 'brand.solid', bg: 'brand.subtle' }}
                onClick={goToPrevious}
                aria-label={viewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              </Flex>
              <Text fontSize="16px" fontWeight="700" color="text.default" textTransform="capitalize">
                {dateLabel}
              </Text>
              <Flex
                as="button" align="center" justify="center"
                px="7px" py="7px"
                borderRadius="6px"
                borderWidth="1.5px" borderColor="border.strong"
                bg="transparent" color="brand.fg"
                _hover={{ borderColor: 'brand.solid', color: 'brand.solid', bg: 'brand.subtle' }}
                onClick={goToNext}
                aria-label={viewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </Flex>
              <Flex
                as="button"
                px={4} py="7px"
                borderWidth="1.5px" borderColor="border.strong" borderRadius="6px"
                fontSize="13px" fontWeight="600" color="brand.fg"
                bg="transparent"
                _hover={{ borderColor: 'brand.solid', color: 'brand.solid', bg: 'brand.subtle' }}
                onClick={goToToday}
              >
                Aujourd&apos;hui
              </Flex>
              {isEmployee && <NextShiftChip shifts={shifts} />}
            </Flex>

            {/* Dropdown filters (employer/caregiver) */}
            {isEmployer && (
              <Flex gap={3} align="center">
                <Box
                  as="select"
                  px={3} py="7px"
                  borderWidth="1.5px" borderColor="border.strong" borderRadius="10px"
                  fontSize="14px" fontWeight="500" color="text.default"
                  bg="bg.surface" cursor="pointer"
                  _hover={{ borderColor: 'brand.solid' }}
                  value={employeeFilter ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEmployeeFilter(e.target.value || null)
                  }
                >
                  <option value="">Tous les employés</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </Box>
                <Box
                  as="select"
                  px={3} py="7px"
                  borderWidth="1.5px" borderColor="border.strong" borderRadius="10px"
                  fontSize="14px" fontWeight="500" color="text.default"
                  bg="bg.surface" cursor="pointer"
                  _hover={{ borderColor: 'brand.solid' }}
                  value={typeFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTypeFilter(e.target.value as ShiftTypeFilter)
                  }
                >
                  <option value="all">Tous les types</option>
                  <option value="effective">Travail effectif</option>
                  <option value="presence_day">Présence jour</option>
                  <option value="presence_night">Présence nuit</option>
                  <option value="guard_24h">Garde 24h</option>
                </Box>
              </Flex>
            )}
          </Flex>


          {/* Vue planning — remplit l'espace restant */}
          <Box flex={1} minH={0}>
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
