import { Box, Flex, Text, Checkbox } from '@chakra-ui/react'
import { AccessibleSelect, AccessibleButton } from '@/components/ui'
import type { LogEntryFilters } from '@/services/logbookService'
import type { LogEntry, UserRole } from '@/types'

interface LogbookFiltersProps {
  filters: LogEntryFilters
  onFiltersChange: (filters: LogEntryFilters) => void
}

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'info', label: 'Information' },
  { value: 'alert', label: 'Alerte' },
  { value: 'incident', label: 'Incident' },
  { value: 'instruction', label: 'Instruction' },
]

const importanceOptions = [
  { value: '', label: 'Toutes' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

const authorRoleOptions = [
  { value: '', label: 'Tous les auteurs' },
  { value: 'employer', label: 'Employeur' },
  { value: 'employee', label: 'Auxiliaire' },
  { value: 'caregiver', label: 'Aidant' },
]

export function LogbookFilters({ filters, onFiltersChange }: LogbookFiltersProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      type: value ? [value as LogEntry['type']] : undefined,
    })
  }

  const handleImportanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      importance: value ? (value as LogEntry['importance']) : undefined,
    })
  }

  const handleAuthorRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      authorRole: value ? (value as UserRole) : undefined,
    })
  }

  const handleReset = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.type ||
    filters.importance ||
    filters.authorRole ||
    filters.unreadOnly

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={4}
      mb={4}
    >
      <Text fontSize="md" fontWeight="medium" mb={3}>
        Filtres
      </Text>

      <Flex
        direction={{ base: 'column', md: 'row' }}
        gap={4}
        align={{ base: 'stretch', md: 'flex-end' }}
        wrap="wrap"
      >
        {/* Type filter */}
        <Box flex="1" minW="150px">
          <AccessibleSelect
            label="Type"
            options={typeOptions}
            value={filters.type?.[0] || ''}
            onChange={handleTypeChange}
          />
        </Box>

        {/* Importance filter */}
        <Box flex="1" minW="150px">
          <AccessibleSelect
            label="Importance"
            options={importanceOptions}
            value={filters.importance || ''}
            onChange={handleImportanceChange}
          />
        </Box>

        {/* Author role filter */}
        <Box flex="1" minW="150px">
          <AccessibleSelect
            label="Auteur"
            options={authorRoleOptions}
            value={filters.authorRole || ''}
            onChange={handleAuthorRoleChange}
          />
        </Box>

        {/* Unread only checkbox */}
        <Box minW="150px" py={2}>
          <Checkbox.Root
            checked={filters.unreadOnly || false}
            onCheckedChange={(e) => {
              onFiltersChange({
                ...filters,
                unreadOnly: e.checked === true,
              })
            }}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Non lues uniquement</Checkbox.Label>
          </Checkbox.Root>
        </Box>

        {/* Reset button */}
        {hasActiveFilters && (
          <AccessibleButton
            variant="outline"
            size="sm"
            onClick={handleReset}
            accessibleLabel="Réinitialiser les filtres"
          >
            Réinitialiser
          </AccessibleButton>
        )}
      </Flex>
    </Box>
  )
}

export default LogbookFilters
