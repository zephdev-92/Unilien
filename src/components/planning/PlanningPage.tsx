import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Box, Flex, Text, Center, Spinner } from '@chakra-ui/react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { WeekView } from './WeekView'
import { NewShiftModal } from './NewShiftModal'
import { ShiftDetailModal } from './ShiftDetailModal'
import { AbsenceRequestModal } from './AbsenceRequestModal'
import { AbsenceDetailModal } from './AbsenceDetailModal'
import { getShifts } from '@/services/shiftService'
import { getAbsencesForEmployee, getAbsencesForEmployer } from '@/services/absenceService'
import type { Shift, Absence } from '@/types'

export function PlanningPage() {
  const { profile, isAuthenticated, isLoading, isInitialized } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false)
  const [isAbsenceRequestModalOpen, setIsAbsenceRequestModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null)

  // Ouvrir le modal absence si ?action=absence dans l'URL
  useEffect(() => {
    if (searchParams.get('action') === 'absence' && profile?.role === 'employee') {
      setIsAbsenceRequestModalOpen(true)
      setSearchParams({}) // Nettoyer l'URL
    }
  }, [searchParams, profile?.role, setSearchParams])

  const weekStart = useMemo(
    () => startOfWeek(currentWeek, { weekStartsOn: 1 }),
    [currentWeek]
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentWeek, { weekStartsOn: 1 }),
    [currentWeek]
  )

  const loadShifts = useCallback(async () => {
    if (!profile) return

    setIsLoadingShifts(true)
    try {
      const [shiftsData, absencesData] = await Promise.all([
        getShifts(profile.id, profile.role, weekStart, weekEnd),
        profile.role === 'employee'
          ? getAbsencesForEmployee(profile.id)
          : profile.role === 'employer'
            ? getAbsencesForEmployer(profile.id)
            : Promise.resolve([]),
      ])
      setShifts(shiftsData)
      // Filtrer les absences pour la semaine actuelle
      const weekAbsences = absencesData.filter((absence) => {
        const start = new Date(absence.startDate)
        const end = new Date(absence.endDate)
        return start <= weekEnd && end >= weekStart
      })
      setAbsences(weekAbsences)
    } catch (error) {
      console.error('Erreur chargement planning:', error)
    } finally {
      setIsLoadingShifts(false)
    }
  }, [profile, weekStart, weekEnd])

  useEffect(() => {
    if (profile && isInitialized) {
      loadShifts()
    }
  }, [profile, isInitialized, loadShifts])

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const goToToday = () => setCurrentWeek(new Date())

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <Center minH="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
          <Text fontSize="lg" color="gray.600">Chargement...</Text>
        </Box>
      </Center>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />
  }

  const weekLabel = `${format(weekStart, 'd', { locale: fr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`

  return (
    <DashboardLayout title="Planning">
      <Box>
        {/* Navigation semaine */}
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
              onClick={goToPreviousWeek}
              accessibleLabel="Semaine précédente"
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
              onClick={goToNextWeek}
              accessibleLabel="Semaine suivante"
            >
              Suivant →
            </AccessibleButton>
          </Flex>

          <Text fontSize="lg" fontWeight="semibold" color="gray.800">
            {weekLabel}
          </Text>

          <Flex gap={2}>
            {profile.role === 'employee' && (
              <AccessibleButton
                colorPalette="orange"
                size="sm"
                onClick={() => setIsAbsenceRequestModalOpen(true)}
              >
                + Déclarer absence
              </AccessibleButton>
            )}
            {profile.role === 'employer' && (
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

        {/* Vue semaine */}
        {isLoadingShifts ? (
          <Center py={12}>
            <Spinner size="lg" color="brand.500" />
          </Center>
        ) : (
          <WeekView
            weekStart={weekStart}
            shifts={shifts}
            absences={absences}
            userRole={profile.role}
            onShiftClick={(shift) => setSelectedShift(shift)}
            onAbsenceClick={(absence) => setSelectedAbsence(absence)}
          />
        )}
      </Box>

      {profile.role === 'employer' && (
        <NewShiftModal
          isOpen={isNewShiftModalOpen}
          onClose={() => setIsNewShiftModalOpen(false)}
          employerId={profile.id}
          onSuccess={loadShifts}
        />
      )}

      <ShiftDetailModal
        isOpen={selectedShift !== null}
        onClose={() => setSelectedShift(null)}
        shift={selectedShift}
        userRole={profile.role}
        profileId={profile.id}
        onSuccess={() => {
          loadShifts()
          setSelectedShift(null)
        }}
      />

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
