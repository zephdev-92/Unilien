import { useState } from 'react'
import { Box, Stack, Flex, Text, Input, NativeSelect, Button } from '@chakra-ui/react'
import { format } from 'date-fns'

export interface EmployeeOption {
  contractId: string
  employeeId: string
  employeeName: string
}

interface ManualEntryFormProps {
  onSubmit: (data: {
    date: string
    startTime: string
    endTime: string
    contractId?: string
  }) => Promise<void>
  employees?: EmployeeOption[]
}

export function ManualEntryForm({ onSubmit, employees }: ManualEntryFormProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedContractId, setSelectedContractId] = useState(employees?.[0]?.contractId || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsEmployee = employees && employees.length > 0
  const canSubmit =
    date &&
    startTime &&
    endTime &&
    startTime < endTime &&
    !isSubmitting &&
    (!needsEmployee || selectedContractId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        date,
        startTime,
        endTime,
        contractId: needsEmployee ? selectedContractId : undefined,
      })
      setStartTime('')
      setEndTime('')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 2px 8px rgba(78,100,120,.09)"
      overflow="hidden"
    >
      <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Text fontFamily="heading" fontSize="md" fontWeight="700">Saisie manuelle</Text>
      </Box>
      <Box p={4}>
        <form onSubmit={handleSubmit} aria-label="Saisie manuelle des heures" noValidate>
          <Stack gap={3}>
            {needsEmployee && (
              <Box>
                <Text as="label" htmlFor="manual-employee" fontSize="sm" fontWeight="500" mb={1}>
                  Employé
                </Text>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    id="manual-employee"
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                  >
                    <option value="" disabled>Choisir…</option>
                    {employees.map((emp) => (
                      <option key={emp.contractId} value={emp.contractId}>
                        {emp.employeeName}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            )}

            <Box>
              <Text as="label" htmlFor="manual-date" fontSize="sm" fontWeight="500" mb={1}>
                Date
              </Text>
              <Input
                id="manual-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                size="sm"
              />
            </Box>

            <Flex gap={3}>
              <Box flex={1}>
                <Text as="label" htmlFor="manual-start" fontSize="sm" fontWeight="500" mb={1}>
                  Début
                </Text>
                <Input
                  id="manual-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  size="sm"
                />
              </Box>
              <Box flex={1}>
                <Text as="label" htmlFor="manual-end" fontSize="sm" fontWeight="500" mb={1}>
                  Fin
                </Text>
                <Input
                  id="manual-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  size="sm"
                />
              </Box>
            </Flex>

            {error && (
              <Text fontSize="sm" color="red.600" role="alert">{error}</Text>
            )}

            <Button
              type="submit"
              size="sm"
              w="100%"
              mt={1}
              bg="#3D5166"
              color="white"
              fontWeight="600"
              borderRadius="md"
              boxShadow="sm"
              disabled={!canSubmit}
              loading={isSubmitting}
              _hover={{ bg: '#2E3F50', boxShadow: 'md', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
            >
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Box>
    </Box>
  )
}
