import { useState, useEffect, useRef } from 'react'
import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Shift } from '@/types'
import { formatTime } from './clockInUtils'

interface EmployeeClockWidgetProps {
  step: 'idle' | 'in-progress' | 'completing'
  activeShift?: Shift
  clockInTime?: string | null
  plannedShifts: Shift[]
  isSubmitting: boolean
  profileName?: string
  onClockIn: (shift: Shift) => void
  onClockOut: () => void
  onCancel: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function ElapsedTimer({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    const compute = () => {
      const [h, m] = clockInTime.split(':').map(Number)
      const start = new Date()
      start.setHours(h, m, 0, 0)
      const diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000))
      const hours = Math.floor(diff / 3600)
      const mins = Math.floor((diff % 3600) / 60)
      const secs = diff % 60
      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      )
    }
    compute()
    const interval = setInterval(compute, 1000)
    return () => clearInterval(interval)
  }, [clockInTime])

  return (
    <Text
      fontFamily="heading"
      fontSize="42px"
      fontWeight="800"
      color="#9BB23B"
      letterSpacing="-0.02em"
      lineHeight="1"
      aria-live="polite"
      aria-label="Durée écoulée"
    >
      {elapsed}
    </Text>
  )
}

export function EmployeeClockWidget({
  step,
  activeShift,
  clockInTime,
  plannedShifts,
  isSubmitting,
  profileName,
  onClockIn,
  onClockOut,
  onCancel,
  containerRef,
}: EmployeeClockWidgetProps) {
  const [now, setNow] = useState(new Date())
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const date = format(now, 'EEEE d MMMM yyyy', { locale: fr })

  const nextShift = plannedShifts
    .filter((s) => s.status === 'planned' && s.id !== activeShift?.id)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

  const initials = profileName
    ? profileName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  const isIdle = step === 'idle'
  const isRunning = step === 'in-progress' || step === 'completing'

  const firstPlannedShift = plannedShifts
    .filter((s) => s.status === 'planned')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

  return (
    <Box
      ref={containerRef}
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      p={6}
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      textAlign="center"
      aria-label="Suivi des heures"
    >
      {/* Clock face */}
      <Box mb={4}>
        <Text
          fontSize="56px"
          fontWeight="900"
          color="text.default"
          fontFamily="heading"
          letterSpacing="-0.03em"
          lineHeight="1"
          mb={1}
          aria-live="polite"
          aria-atomic="true"
        >
          {time}
        </Text>
        <Text fontSize="sm" color="text.muted" fontWeight="500" textTransform="capitalize">
          {date}
        </Text>
      </Box>

      {/* Idle state */}
      {isIdle && (
        <Flex direction="column" align="center" gap={4}>
          {nextShift && (
            <Flex
              align="center"
              gap={2}
              px={4}
              py={2.5}
              bg="#EDF1F5"
              borderRadius="md"
              fontSize="sm"
              color="#3D5166"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <Text as="span" fontSize="sm">
                Prochaine intervention : <Text as="strong" fontWeight="700">{formatTime(nextShift.startTime)} – {formatTime(nextShift.endTime)}</Text>
                {nextShift.employeeName && ` chez ${nextShift.employeeName}`}
              </Text>
            </Flex>
          )}

          <Text fontSize="sm" color="text.muted" fontWeight="500">
            Aucune intervention en cours
          </Text>

          {firstPlannedShift && (
            <Button
              onClick={() => onClockIn(firstPlannedShift)}
              bg="#9BB23B"
              color="white"
              borderRadius="full"
              px={10}
              py={3.5}
              fontFamily="heading"
              fontSize="md"
              fontWeight="800"
              boxShadow="md"
              _hover={{ transform: 'scale(1.03)', boxShadow: 'lg' }}
              transition="transform 0.2s, box-shadow 0.2s"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22} aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Démarrer
            </Button>
          )}
        </Flex>
      )}

      {/* Running state */}
      {isRunning && activeShift && clockInTime && (
        <Flex direction="column" align="center" gap={4}>
          <Flex
            align="center"
            gap={3}
            bg="#F7F8FA"
            px={5}
            py={3}
            borderRadius="full"
            borderWidth="1px"
            borderColor="border.default"
          >
            <Flex
              w="36px" h="36px" borderRadius="full"
              bg="#9BB23B" color="white"
              align="center" justify="center"
              fontSize="13px" fontWeight="700"
              flexShrink={0}
              aria-hidden="true"
            >
              {initials}
            </Flex>
            <Box textAlign="left">
              <Text fontSize="base" fontWeight="700">{profileName || 'Mon intervention'}</Text>
              <Text fontSize="xs" color="text.muted">Démarrée à {clockInTime}</Text>
            </Box>
          </Flex>

          <ElapsedTimer clockInTime={clockInTime} />

          <Box w="100%" maxW="320px" mt={1}>
            <Text as="label" htmlFor="shift-note" fontSize="sm" fontWeight="500" display="block" textAlign="left" mb={1}>
              Remarque (optionnel)
            </Text>
            <Box
              as="textarea"
              ref={noteRef}
              id="shift-note"
              rows={2}
              placeholder="Ex : Aide au repas, toilette complète…"
              w="100%"
              px={3}
              py={2}
              fontSize="sm"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="md"
              resize="vertical"
              _focus={{ borderColor: '#3D5166', boxShadow: '0 0 0 3px rgba(61,81,102,.12)' }}
              css={{ minHeight: '60px' }}
            />
          </Box>

          <Button
            onClick={onClockOut}
            loading={isSubmitting}
            bg="#991B1B"
            color="white"
            borderRadius="full"
            px={10}
            py={3.5}
            fontFamily="heading"
            fontSize="md"
            fontWeight="800"
            boxShadow="md"
            _hover={{ transform: 'scale(1.03)', boxShadow: 'lg' }}
            transition="transform 0.2s, box-shadow 0.2s"
            mt={1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Terminer
          </Button>

          <Button
            variant="ghost"
            size="sm"
            color="text.muted"
            fontWeight="500"
            onClick={onCancel}
            disabled={isSubmitting}
            _hover={{ color: '#3D5166' }}
          >
            Annuler
          </Button>
        </Flex>
      )}
    </Box>
  )
}
