import { useMemo } from 'react'
import { Box, Stack, Flex, Text, Avatar } from '@chakra-ui/react'
import type { Shift, UserRole, ShiftType } from '@/types'

type ShiftStatusFilter = 'all' | 'planned' | 'completed' | 'cancelled'
type ShiftTypeFilter = 'all' | ShiftType

interface PlanningSidebarProps {
  shifts: Shift[]
  userRole: UserRole
  statusFilter: ShiftStatusFilter
  typeFilter: ShiftTypeFilter
  employeeFilter: string | null
  onStatusFilterChange: (filter: ShiftStatusFilter) => void
  onTypeFilterChange: (filter: ShiftTypeFilter) => void
  onEmployeeFilterChange: (employeeId: string | null) => void
}

const STATUS_OPTIONS: { value: ShiftStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'planned', label: 'Prévus' },
  { value: 'completed', label: 'Terminés' },
  { value: 'cancelled', label: 'Annulés' },
]

const TYPE_OPTIONS: { value: ShiftTypeFilter; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'effective', label: 'Travail effectif' },
  { value: 'presence_day', label: 'Présence jour' },
  { value: 'presence_night', label: 'Présence nuit' },
  { value: 'guard_24h', label: 'Garde 24h' },
]

export function PlanningSidebar({
  shifts,
  userRole,
  statusFilter,
  typeFilter,
  employeeFilter,
  onStatusFilterChange,
  onTypeFilterChange,
  onEmployeeFilterChange,
}: PlanningSidebarProps) {
  // Extraire la liste unique des employés depuis les shifts
  const employees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; shiftCount: number }>()
    for (const shift of shifts) {
      if (shift.employeeId) {
        const existing = map.get(shift.employeeId)
        if (existing) {
          existing.shiftCount++
        } else {
          map.set(shift.employeeId, {
            id: shift.employeeId,
            name: shift.employeeName || 'Auxiliaire',
            shiftCount: 1,
          })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [shifts])

  const isEmployer = userRole === 'employer' || userRole === 'caregiver'

  return (
    <Stack gap={5}>
      {/* Filtre par statut */}
      <Box
        bg="bg.surface"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border.default"
        p={4}
        boxShadow="0 2px 8px rgba(78,100,120,.09)"
      >
        <Text fontSize="sm" fontWeight="semibold" color="text.secondary" mb={3}>
          Statut
        </Text>
        <Flex gap={2} flexWrap="wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Box
              key={opt.value}
              as="button"
              type="button"
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="xs"
              fontWeight="medium"
              bg={statusFilter === opt.value ? 'blue.500' : 'gray.100'}
              color={statusFilter === opt.value ? 'white' : 'gray.700'}
              cursor="pointer"
              _hover={{ bg: statusFilter === opt.value ? 'blue.600' : 'gray.200' }}
              onClick={() => onStatusFilterChange(opt.value)}
            >
              {opt.label}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Filtre par type */}
      <Box
        bg="bg.surface"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border.default"
        p={4}
        boxShadow="0 2px 8px rgba(78,100,120,.09)"
      >
        <Text fontSize="sm" fontWeight="semibold" color="text.secondary" mb={3}>
          Type d'intervention
        </Text>
        <Stack gap={1.5}>
          {TYPE_OPTIONS.map((opt) => (
            <Box
              key={opt.value}
              as="button"
              type="button"
              px={3}
              py={2}
              borderRadius="10px"
              fontSize="xs"
              fontWeight="medium"
              textAlign="left"
              bg={typeFilter === opt.value ? 'blue.50' : 'transparent'}
              color={typeFilter === opt.value ? 'blue.700' : 'gray.600'}
              cursor="pointer"
              _hover={{ bg: typeFilter === opt.value ? 'blue.100' : 'gray.50' }}
              onClick={() => onTypeFilterChange(opt.value)}
            >
              {opt.label}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Liste des employés (employer/caregiver uniquement) */}
      {isEmployer && employees.length > 0 && (
        <Box
          bg="bg.surface"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border.default"
          p={4}
          boxShadow="0 2px 8px rgba(78,100,120,.09)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="text.secondary" mb={3}>
            Auxiliaires
          </Text>
          <Stack gap={1}>
            <Box
              as="button"
              type="button"
              px={3}
              py={2}
              borderRadius="10px"
              fontSize="xs"
              fontWeight="medium"
              textAlign="left"
              bg={employeeFilter === null ? 'blue.50' : 'transparent'}
              color={employeeFilter === null ? 'blue.700' : 'gray.600'}
              cursor="pointer"
              _hover={{ bg: employeeFilter === null ? 'blue.100' : 'gray.50' }}
              onClick={() => onEmployeeFilterChange(null)}
            >
              Tous ({shifts.length})
            </Box>
            {employees.map((emp) => (
              <Flex
                key={emp.id}
                as="button"
                type="button"
                align="center"
                gap={2}
                px={3}
                py={2}
                borderRadius="10px"
                bg={employeeFilter === emp.id ? 'blue.50' : 'transparent'}
                cursor="pointer"
                _hover={{ bg: employeeFilter === emp.id ? 'blue.100' : 'gray.50' }}
                onClick={() => onEmployeeFilterChange(emp.id)}
              >
                <Avatar.Root size="xs">
                  <Avatar.Fallback name={emp.name} />
                </Avatar.Root>
                <Text
                  fontSize="xs"
                  fontWeight={employeeFilter === emp.id ? 'semibold' : 'medium'}
                  color={employeeFilter === emp.id ? 'blue.700' : 'gray.700'}
                  flex={1}
                  textAlign="left"
                >
                  {emp.name}
                </Text>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  px="8px"
                  py="2px"
                  borderRadius="8px"
                  bg="#F3F6F9"
                  color="#6B7A8D"
                >
                  {emp.shiftCount}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
