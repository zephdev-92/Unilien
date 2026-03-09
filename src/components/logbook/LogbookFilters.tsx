import { Box, Flex, Checkbox, Input } from '@chakra-ui/react'
import { AccessibleSelect, AccessibleButton } from '@/components/ui'
import type { LogEntryFilters } from '@/services/logbookService'
import type { LogEntry, UserRole } from '@/types'

interface LogbookFiltersProps {
  filters: LogEntryFilters
  searchQuery: string
  onSearchChange: (query: string) => void
  onFiltersChange: (filters: LogEntryFilters) => void
}

const categoryPills: { value: LogEntry['type']; label: string; palette: string }[] = [
  { value: 'info', label: 'Observation', palette: 'blue' },
  { value: 'incident', label: 'Incident', palette: 'red' },
  { value: 'alert', label: 'Alerte', palette: 'orange' },
  { value: 'instruction', label: 'Instruction', palette: 'purple' },
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

export function LogbookFilters({ filters, searchQuery, onSearchChange, onFiltersChange }: LogbookFiltersProps) {
  const handleCategoryToggle = (type: LogEntry['type']) => {
    const current = filters.type || []
    const isActive = current.includes(type)
    const newTypes = isActive
      ? current.filter((t) => t !== type)
      : [...current, type]
    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
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
    onSearchChange('')
  }

  const hasActiveFilters =
    filters.type ||
    filters.importance ||
    filters.authorRole ||
    filters.unreadOnly ||
    searchQuery

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={4}
      mb={4}
    >
      {/* Search input */}
      <Box position="relative" mb={4}>
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          color="gray.400"
          pointerEvents="none"
          zIndex={1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Box>
        <Input
          placeholder="Rechercher dans le journal..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          pl={9}
          size="sm"
          borderRadius="md"
          aria-label="Rechercher dans le journal"
        />
      </Box>

      {/* Category pills */}
      <Flex gap={2} mb={4} flexWrap="wrap">
        {categoryPills.map(({ value, label, palette }) => {
          const isActive = filters.type?.includes(value)
          return (
            <AccessibleButton
              key={value}
              size="sm"
              variant={isActive ? 'solid' : 'outline'}
              colorPalette={isActive ? palette : 'gray'}
              onClick={() => handleCategoryToggle(value)}
              minH="32px"
            >
              {label}
            </AccessibleButton>
          )
        })}
      </Flex>

      {/* Secondary filters */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        gap={4}
        align={{ base: 'stretch', md: 'flex-end' }}
        wrap="wrap"
      >
        <Box flex="1" minW="150px">
          <AccessibleSelect
            label="Importance"
            options={importanceOptions}
            value={filters.importance || ''}
            onChange={handleImportanceChange}
          />
        </Box>

        <Box flex="1" minW="150px">
          <AccessibleSelect
            label="Auteur"
            options={authorRoleOptions}
            value={filters.authorRole || ''}
            onChange={handleAuthorRoleChange}
          />
        </Box>

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

        {hasActiveFilters && (
          <AccessibleButton
            variant="outline"
            size="sm"
            onClick={handleReset}
            accessibleLabel="Reinitialiser les filtres"
          >
            Reinitialiser
          </AccessibleButton>
        )}
      </Flex>
    </Box>
  )
}

export default LogbookFilters
