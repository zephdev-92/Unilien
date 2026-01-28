import { useMemo } from 'react'
import { Box, SimpleGrid, Text, Flex } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import type { UserRole, CaregiverPermissions } from '@/types'

interface QuickAction {
  label: string
  icon: string
  href: string
  description: string
  permissionKey?: keyof CaregiverPermissions
}

const actionsByRole: Record<UserRole, QuickAction[]> = {
  employer: [
    {
      label: 'Nouvelle note',
      icon: '✏️',
      href: '/logbook/new',
      description: 'Ajouter une entrée au cahier',
    },
    {
      label: 'Voir planning',
      icon: '📅',
      href: '/planning',
      description: 'Consulter les interventions',
    },
    {
      label: 'Mes auxiliaires',
      icon: '👥',
      href: '/team',
      description: 'Gérer mon équipe',
    },
    {
      label: 'Documents',
      icon: '📄',
      href: '/documents',
      description: 'Export CESU/PAJEMPLOI',
    },
  ],
  employee: [
    {
      label: 'Pointer',
      icon: '⏱️',
      href: '/clock-in',
      description: 'Début/fin d\'intervention',
    },
    {
      label: 'Nouvelle note',
      icon: '✏️',
      href: '/logbook/new',
      description: 'Ajouter au cahier de liaison',
    },
    {
      label: 'Mon planning',
      icon: '📅',
      href: '/planning',
      description: 'Voir mes interventions',
    },
    {
      label: 'Déclarer absence',
      icon: '🏥',
      href: '/planning?action=absence',
      description: 'Signaler une indisponibilité',
    },
  ],
  caregiver: [
    {
      label: 'Cahier de liaison',
      icon: '📖',
      href: '/logbook',
      description: 'Lire les dernières notes',
      permissionKey: 'canViewLiaison',
    },
    {
      label: 'Planning',
      icon: '📅',
      href: '/planning',
      description: 'Voir les interventions',
      permissionKey: 'canViewPlanning',
    },
    {
      label: 'Ajouter une note',
      icon: '✏️',
      href: '/logbook/new',
      description: 'Écrire dans le cahier',
      permissionKey: 'canWriteLiaison',
    },
    {
      label: 'Mon profil',
      icon: '👤',
      href: '/profile',
      description: 'Mes informations',
    },
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
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      boxShadow="sm"
    >
      <Text fontSize="lg" fontWeight="semibold" color="gray.900" mb={4}>
        Actions rapides
      </Text>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
        {actions.map((action) => (
          <RouterLink key={action.href} to={action.href}>
            <Flex
              direction="column"
              align="center"
              justify="center"
              p={4}
              bg="gray.50"
              borderRadius="lg"
              minH="100px"
              textAlign="center"
              transition="all 0.2s"
              _hover={{
                bg: 'brand.50',
                transform: 'translateY(-2px)',
                boxShadow: 'sm',
              }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'brand.500',
                outlineOffset: '2px',
              }}
              css={{
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  transform: 'none !important',
                },
              }}
            >
              <Text fontSize="2xl" mb={2} aria-hidden="true">
                {action.icon}
              </Text>
              <Text fontWeight="medium" fontSize="sm" color="gray.800">
                {action.label}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {action.description}
              </Text>
            </Flex>
          </RouterLink>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export default QuickActionsWidget
