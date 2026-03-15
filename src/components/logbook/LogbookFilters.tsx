import { Box, Flex, Input } from '@chakra-ui/react'
import type { LogEntryFilters } from '@/services/logbookService'
import type { LogEntry, UserRole } from '@/types'

interface LogbookFiltersProps {
  filters: LogEntryFilters
  searchQuery: string
  onSearchChange: (query: string) => void
  onFiltersChange: (filters: LogEntryFilters) => void
}

const categoryOptions: { value: string; label: string }[] = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'info', label: 'Observation' },
  { value: 'incident', label: 'Incident' },
  { value: 'alert', label: 'Alerte' },
  { value: 'instruction', label: 'Instruction' },
]

const authorRoleOptions: { value: string; label: string }[] = [
  { value: '', label: 'Tous les auteurs' },
  { value: 'employer', label: 'Employeur' },
  { value: 'employee', label: 'Auxiliaire' },
  { value: 'caregiver', label: 'Aidant' },
]

export function LogbookFilters({ filters, searchQuery, onSearchChange, onFiltersChange }: LogbookFiltersProps) {
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      type: value ? [value as LogEntry['type']] : undefined,
    })
  }

  const handleAuthorRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      authorRole: value ? (value as UserRole) : undefined,
    })
  }

  return (
    <Flex
      justify="space-between"
      align="center"
      mb={4}
      gap={3}
      flexWrap="wrap"
    >
      {/* Search — proto: toolbar-left > search-wrap */}
      <Box position="relative" w={{ base: '100%', md: 'auto' }} minW="220px">
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          color="text.muted"
          pointerEvents="none"
          zIndex={1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Box>
        <Input
          placeholder="Rechercher dans le journal…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          pl="calc(12px + 20px)"
          py="8px"
          size="sm"
          borderRadius="full"
          borderWidth="1.5px"
          borderColor="border.default"
          bg="bg.surface"
          fontSize="sm"
          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(78,100,120,.1)' }}
          aria-label="Rechercher dans le journal"
        />
      </Box>

      {/* Dropdowns — proto: toolbar-right > 2 selects */}
      <Flex gap={3} align="center">
        <Box
          as="select"
          px={3} py="7px"
          borderWidth="1.5px" borderColor="border.default" borderRadius="10px"
          fontSize="14px" fontWeight="500" color="brand.500"
          bg="bg.surface" cursor="pointer"
          _hover={{ borderColor: 'brand.100' }}
          value={filters.authorRole || ''}
          onChange={handleAuthorRoleChange}
          aria-label="Filtrer par auteur"
        >
          {authorRoleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Box>
        <Box
          as="select"
          px={3} py="7px"
          borderWidth="1.5px" borderColor="border.default" borderRadius="10px"
          fontSize="14px" fontWeight="500" color="brand.500"
          bg="bg.surface" cursor="pointer"
          _hover={{ borderColor: 'brand.100' }}
          value={filters.type?.[0] || ''}
          onChange={handleCategoryChange}
          aria-label="Filtrer par catégorie"
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Box>
      </Flex>
    </Flex>
  )
}

export default LogbookFilters
