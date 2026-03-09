import { useState, useEffect } from 'react'
import { Box, Flex, Text, Badge, Table } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift, UserRole } from '@/types'
import { formatTime, formatHours } from './clockInUtils'

interface TodayTableProps {
  plannedShifts: Shift[]
  completedShifts: Shift[]
  activeShiftId?: string | null
  clockInTime?: string | null
  userRole: UserRole
  onClockIn: (shift: Shift) => void
  onValidate?: (shift: Shift) => void
  onModify?: (shift: Shift) => void
}

function ElapsedDuration({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState('')

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
    <Text fontFamily="mono" fontSize="sm" aria-live="polite">
      {elapsed}
    </Text>
  )
}

export function TodayTable({
  plannedShifts,
  completedShifts,
  activeShiftId,
  clockInTime,
  userRole,
  onClockIn,
  onValidate,
  onModify,
}: TodayTableProps) {
  const isEmployer = userRole === 'employer'

  const allShifts = [
    ...completedShifts.map((s) => ({ ...s, _status: 'completed' as const })),
    ...plannedShifts.map((s) => ({
      ...s,
      _status: (s.id === activeShiftId ? 'active' : 'planned') as 'active' | 'planned',
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (allShifts.length === 0) {
    return (
      <Box
        bg="white"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.200"
        p={6}
        boxShadow="sm"
        textAlign="center"
      >
        <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
          Heures d'aujourd'hui
        </Text>
        <Text fontSize="3xl" mb={2} aria-hidden="true">📭</Text>
        <Text color="gray.500">
          {isEmployer
            ? "Aucune intervention prévue aujourd'hui pour vos auxiliaires"
            : "Aucune intervention prévue aujourd'hui"}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
      overflow="hidden"
    >
      <Text fontSize="lg" fontWeight="semibold" color="gray.900" p={5} pb={0}>
        Heures d'aujourd'hui
      </Text>

      <Box overflowX="auto">
        <Table.Root size="sm" mt={3}>
          <Table.Header>
            <Table.Row>
              {isEmployer && (
                <Table.ColumnHeader pl={5}>Auxiliaire</Table.ColumnHeader>
              )}
              <Table.ColumnHeader pl={isEmployer ? undefined : 5}>Début</Table.ColumnHeader>
              <Table.ColumnHeader>Fin</Table.ColumnHeader>
              <Table.ColumnHeader>Durée</Table.ColumnHeader>
              <Table.ColumnHeader>Statut</Table.ColumnHeader>
              <Table.ColumnHeader pr={5} textAlign="right">
                <Text srOnly>Actions</Text>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {allShifts.map((shift) => {
              const isActive = shift._status === 'active'
              const isCompleted = shift._status === 'completed'
              const durationMin = isCompleted
                ? calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
                : 0

              return (
                <Table.Row
                  key={shift.id}
                  bg={isActive ? 'blue.50' : undefined}
                >
                  {isEmployer && (
                    <Table.Cell pl={5}>
                      <Text fontSize="sm" fontWeight="medium">
                        {shift.employeeName || 'Auxiliaire'}
                      </Text>
                    </Table.Cell>
                  )}
                  <Table.Cell pl={isEmployer ? undefined : 5}>
                    <Text fontSize="sm" fontWeight="medium">
                      {formatTime(shift.startTime)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {isCompleted ? formatTime(shift.endTime) : '—'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {isActive && clockInTime ? (
                      <ElapsedDuration clockInTime={clockInTime} />
                    ) : isCompleted ? (
                      <Text fontSize="sm">{formatHours(durationMin / 60)}</Text>
                    ) : (
                      <Text fontSize="sm" color="gray.400">—</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {isActive && (
                      <Badge colorPalette="orange" size="sm">En cours</Badge>
                    )}
                    {isCompleted && isEmployer && !shift.validatedByEmployer && (
                      <Badge colorPalette="yellow" size="sm">À valider</Badge>
                    )}
                    {isCompleted && isEmployer && shift.validatedByEmployer && (
                      <Badge colorPalette="green" size="sm">Validé</Badge>
                    )}
                    {isCompleted && !isEmployer && (
                      <Badge colorPalette="green" size="sm">Terminé</Badge>
                    )}
                    {shift._status === 'planned' && (
                      <Badge colorPalette="gray" size="sm">Prévu</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell pr={5}>
                    <Flex justify="flex-end" gap={2}>
                      {/* Employee/caregiver: bouton Pointer */}
                      {!isEmployer && shift._status === 'planned' && !activeShiftId && (
                        <AccessibleButton
                          size="xs"
                          colorPalette="blue"
                          onClick={() => onClockIn(shift)}
                        >
                          Pointer
                        </AccessibleButton>
                      )}
                      {/* Employer: boutons Modifier / Valider */}
                      {isEmployer && isCompleted && !shift.validatedByEmployer && (
                        <>
                          <AccessibleButton
                            size="xs"
                            variant="outline"
                            colorPalette="blue"
                            onClick={() => onModify?.(shift)}
                          >
                            Modifier
                          </AccessibleButton>
                          <AccessibleButton
                            size="xs"
                            colorPalette="green"
                            onClick={() => onValidate?.(shift)}
                          >
                            Valider
                          </AccessibleButton>
                        </>
                      )}
                      {isEmployer && isCompleted && shift.validatedByEmployer && (
                        <AccessibleButton
                          size="xs"
                          variant="outline"
                          colorPalette="gray"
                          onClick={() => onModify?.(shift)}
                        >
                          Modifier
                        </AccessibleButton>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}
