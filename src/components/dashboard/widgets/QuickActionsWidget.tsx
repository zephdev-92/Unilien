import { useMemo } from 'react'
import { Box, SimpleGrid, Text, Flex } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { NavIcon } from '@/components/ui'
import type { UserRole, CaregiverPermissions } from '@/types'

interface QuickAction {
  label: string
  icon: string
  href: string
  permissionKey?: keyof CaregiverPermissions
}

const actionsByRole: Record<UserRole, QuickAction[]> = {
  employer: [
    { label: 'Intervention', icon: 'plus', href: '/planning' },
    { label: 'Employé', icon: 'user-plus', href: '/equipe' },
    { label: 'Bulletin', icon: 'monitor', href: '/documents' },
    { label: 'Exporter', icon: 'download', href: '/documents' },
  ],
  employee: [
    { label: 'Pointer', icon: 'clock', href: '/suivi-des-heures' },
    { label: 'Planning', icon: 'calendar', href: '/planning' },
    { label: 'Cahier', icon: 'book', href: '/logbook/new' },
    { label: 'Absence', icon: 'calendar', href: '/planning?action=absence' },
  ],
  caregiver: [
    { label: 'Cahier', icon: 'book', href: '/cahier-de-liaison', permissionKey: 'canViewLiaison' },
    { label: 'Planning', icon: 'calendar', href: '/planning', permissionKey: 'canViewPlanning' },
    { label: 'Note', icon: 'book', href: '/logbook/new', permissionKey: 'canWriteLiaison' },
    { label: 'Profil', icon: 'user', href: '/profile' },
  ],
}

interface QuickActionsWidgetProps {
  userRole: UserRole
  permissions?: CaregiverPermissions
}

export function QuickActionsWidget({ userRole, permissions }: QuickActionsWidgetProps) {
  // Filtrer les actions selon les permissions pour les aidants
  const actions = useMemo(() => {
    const roleActions = actionsByRole[userRole]

    if (userRole !== 'caregiver' || !permissions) {
      return roleActions
    }

    // Filtrer les actions qui nécessitent une permission
    return roleActions.filter((action) => {
      if (!action.permissionKey) return true
      return permissions[action.permissionKey]
    })
  }, [userRole, permissions])

  if (actions.length === 0) {
    return null
  }

  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      borderWidth="1.5px"
      borderColor="border.default"
      boxShadow="sm"
      overflow="hidden"
    >
      {/* card-header */}
      <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <Text fontSize="15px" fontWeight="700" color="text.default">
          Actions rapides
        </Text>
      </Box>

      {/* card-body — grid 2 colonnes */}
      <SimpleGrid columns={2} gap={2} p={4}>
        {actions.map((action) => (
          <Flex
            key={action.label}
            as={RouterLink}
            to={action.href}
            direction="column"
            align="center"
            justify="center"
            h="64px"
            gap="5px"
            borderRadius="10px"
            borderWidth="1.5px"
            borderColor="border.default"
            bg="bg.surface"
            color="text.secondary"
            fontSize="sm"
            fontWeight="500"
            textDecoration="none"
            transition="all 0.15s ease"
            _hover={{
              bg: 'bg.page',
              color: 'text.default',
            }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.500',
              outlineOffset: '2px',
            }}
            css={{
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
              },
            }}
          >
            <NavIcon name={action.icon} size={18} />
            {action.label}
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export default QuickActionsWidget
