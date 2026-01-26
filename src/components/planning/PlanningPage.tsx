import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Flex, Text, Center, Spinner } from '@chakra-ui/react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard'
import { AccessibleButton } from '@/components/ui'
import { WeekView } from './WeekView'
import { NewShiftModal } from './NewShiftModal'
import { ShiftDetailModal } from './ShiftDetailModal'
import { getShifts } from '@/services/shiftService'
import type { Shift } from '@/types'

export function PlanningPage() {
  const { profile, isAuthenticated, isLoading, isInitialized } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)

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
      const data = await getShifts(profile.id, profile.role, weekStart, weekEnd)
      setShifts(data)
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

        {/* Vue semaine */}
        {isLoadingShifts ? (
          <Center py={12}>
            <Spinner size="lg" color="brand.500" />
          </Center>
        ) : (
          <WeekView
            weekStart={weekStart}
            shifts={shifts}
            userRole={profile.role}
            onShiftClick={(shift) => setSelectedShift(shift)}
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
    </DashboardLayout>
  )
}

export default PlanningPage
