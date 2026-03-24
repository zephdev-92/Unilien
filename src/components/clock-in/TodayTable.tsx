import { useState, useEffect, useMemo } from 'react'
import { Box, Flex, Text, Table, Button, NativeSelect } from '@chakra-ui/react'
import { GhostButton, PrimaryButton } from '@/components/ui'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calculateShiftDuration } from '@/lib/compliance'
import type { Shift, UserRole } from '@/types'
import { formatTime, formatHours } from './clockInUtils'

interface TodayTableProps {
  plannedShifts: Shift[]
  completedShifts: Shift[]
  activeShiftId?: string | null
  clockInTime?: string | null
  userRole: UserRole
  employerName?: string
  selectedDate?: Date
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
  employerName,
  selectedDate,
  onClockIn,
  onValidate,
  onModify,
}: TodayTableProps) {
  const isEmployer = userRole === 'employer'
  const isPastDate = !!selectedDate
  const [filterEmployee, setFilterEmployee] = useState('')

  const allShifts = [
    ...completedShifts.map((s) => ({ ...s, _status: 'completed' as const })),
    ...plannedShifts.map((s) => ({
      ...s,
      _status: (s.id === activeShiftId ? 'active' : 'planned') as 'active' | 'planned',
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))

  const employeeNames = useMemo(() => {
    const names = new Set<string>()
    for (const s of allShifts) {
      if (s.employeeName) names.add(s.employeeName)
    }
    return Array.from(names).sort()
  }, [allShifts])

  const filteredShifts = filterEmployee
    ? allShifts.filter((s) => s.employeeName === filterEmployee)
    : allShifts

  const tableTitle = isPastDate
    ? (isEmployer ? `Heures du ${format(selectedDate, 'EEEE d MMMM', { locale: fr })}` : `Mes heures du ${format(selectedDate, 'EEEE d MMMM', { locale: fr })}`)
    : (isEmployer ? "Heures d'aujourd'hui" : "Mes heures d'aujourd'hui")

  const sectionHeader = (
    <Flex align="center" justify="space-between" gap={3} mb={4} flexWrap="wrap">
      <Text id="today-heading" fontFamily="heading" fontSize="lg" fontWeight="700">
        {tableTitle}
      </Text>
      {isEmployer && employeeNames.length > 1 && (
        <Box minW="200px">
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              aria-label="Filtrer par employé"
            >
              <option value="">Tous les employés</option>
              {employeeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      )}
    </Flex>
  )

  if (allShifts.length === 0) {
    return (
      <section aria-labelledby="today-heading">
        {sectionHeader}
        <Box
          bg="bg.surface"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.default"
          boxShadow="0 2px 8px rgba(78,100,120,.09)"
          p={6}
          textAlign="center"
        >
          <Text color="text.muted">
            {isEmployer
              ? "Aucune intervention prévue aujourd'hui pour vos auxiliaires"
              : "Aucune intervention prévue aujourd'hui"}
          </Text>
        </Box>
      </section>
    )
  }

  return (
    <section aria-labelledby="today-heading">
      {sectionHeader}

      <Box
        bg="bg.surface"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.default"
        boxShadow="0 2px 8px rgba(78,100,120,.09)"
        overflow="hidden"
      >
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row css={{ background: 'var(--chakra-colors-bg-page)' }}>
                {isEmployer && (
                  <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500">Employé</Table.ColumnHeader>
                )}
                <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500">Début</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500">Fin</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500">Durée</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500">Statut</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py="10px" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" color="brand.500" textAlign="right">
                  <Text srOnly>Actions</Text>
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredShifts.map((shift) => {
                const isActive = shift._status === 'active'
                const isCompleted = shift._status === 'completed'
                const durationMin = isCompleted
                  ? calculateShiftDuration(shift.startTime, shift.endTime, shift.breakDuration)
                  : 0

                return (
                  <Table.Row
                    key={shift.id}
                    css={{ '&:hover': { background: 'var(--chakra-colors-bg-page)' }, '&:last-child td': { borderBottom: 'none' } }}
                  >
                    {isEmployer && (
                      <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                        <Flex align="center" gap={2}>
                          {shift.employeeAvatarUrl ? (
                            <Box
                              as="img"
                              src={shift.employeeAvatarUrl}
                              alt={shift.employeeName || 'Avatar'}
                              w="28px" h="28px" borderRadius="full"
                              objectFit="cover" flexShrink={0}
                            />
                          ) : (
                            <Flex
                              w="28px" h="28px" borderRadius="full"
                              bg="brand.500" color="white"
                              align="center" justify="center"
                              fontSize="xs" fontWeight="700" flexShrink={0}
                              aria-hidden="true"
                            >
                              {(shift.employeeName || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </Flex>
                          )}
                          <Text fontSize="sm" fontWeight="500" color="text.default">{shift.employeeName || 'Auxiliaire'}</Text>
                        </Flex>
                      </Table.Cell>
                    )}
                    <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                      <Text fontSize="sm" color="text.default">{formatTime(shift.startTime)}</Text>
                    </Table.Cell>
                    <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                      <Text fontSize="sm" color="text.default">{isCompleted ? formatTime(shift.endTime) : '—'}</Text>
                    </Table.Cell>
                    <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                      {isActive && clockInTime ? (
                        <ElapsedDuration clockInTime={clockInTime} />
                      ) : isCompleted ? (
                        <Text fontSize="sm" color="text.default">{formatHours(durationMin / 60)}</Text>
                      ) : (
                        <Text fontSize="sm" color="brand.500">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                      {isActive && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="warm.50" color="warm.600">En cours</Flex>
                      )}
                      {isCompleted && isEmployer && !shift.validatedByEmployer && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="warm.50" color="warm.600">À valider</Flex>
                      )}
                      {isCompleted && isEmployer && shift.validatedByEmployer && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="accent.50" color="accent.700">Validé</Flex>
                      )}
                      {isCompleted && !isEmployer && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="accent.50" color="accent.700">Terminé</Flex>
                      )}
                      {shift._status === 'planned' && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="brand.50" color="brand.500">Prévu</Flex>
                      )}
                      {shift.lateEntry && (
                        <Flex as="span" display="inline-flex" px="10px" py="3px" borderRadius="full" fontSize="xs" fontWeight="700" bg="warning.100" color="warning.800" ml={1}>Rétroactif</Flex>
                      )}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
                      <Flex justify="flex-end" gap={2}>
                        {!isEmployer && !isPastDate && shift._status === 'planned' && !activeShiftId && (
                          <PrimaryButton size="xs" onClick={() => onClockIn(shift)}>
                            Pointer
                          </PrimaryButton>
                        )}
                        <GhostButton size="xs" onClick={() => onModify?.(shift)}>
                          Modifier
                        </GhostButton>
                        {isEmployer && isCompleted && !shift.validatedByEmployer && (
                          <Button size="xs" bg="accent.500" color="white" borderRadius="md" fontWeight="600" _hover={{ bg: 'accent.600' }} onClick={() => onValidate?.(shift)}>
                            Valider
                          </Button>
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

      {!isEmployer && (
        <Text fontSize="sm" color="text.muted" mt={3}>
          Une erreur dans vos heures ?{' '}
          <Text
            as="a"
            href="/liaison?to=general"
            color="brand.500"
            fontWeight="600"
            _hover={{ textDecoration: 'underline' }}
          >
            Contacter {employerName || 'votre employeur'} →
          </Text>
        </Text>
      )}
    </section>
  )
}
