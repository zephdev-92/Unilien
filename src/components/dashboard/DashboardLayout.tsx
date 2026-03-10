import { useState, useCallback, useEffect } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Box,
  Flex,
  Stack,
  Text,
  IconButton,
  Avatar,
  Image,
  Link,
  Input,
  Separator,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { AccessibleButton, DevelopmentBanner } from '@/components/ui'
import { NotificationBell, NotificationsPanel } from '@/components/notifications'
import { getCaregiver } from '@/services/caregiverService'
import { logger } from '@/lib/logger'

import type { UserRole, CaregiverPermissions } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: string
  ariaLabel: string
  roles?: UserRole[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

// ── Navigation groupée (comme le prototype) ───────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Tableau de bord', href: '/tableau-de-bord', icon: '🏠', ariaLabel: 'Aller au tableau de bord' },
      { label: 'Planning', href: '/planning', icon: '📅', ariaLabel: 'Voir le planning' },
      { label: 'Mon équipe', href: '/equipe', icon: '👥', ariaLabel: 'Gérer mes auxiliaires', roles: ['employer'] },
      { label: 'Messagerie', href: '/messagerie', icon: '💬', ariaLabel: 'Ouvrir la messagerie en temps réel' },
      { label: 'Cahier de liaison', href: '/cahier-de-liaison', icon: '📝', ariaLabel: 'Ouvrir le cahier de liaison' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { label: 'Conformité', href: '/conformite', icon: '⚖️', ariaLabel: 'Voir la conformité', roles: ['employer'] },
      { label: 'Documents', href: '/documents', icon: '📄', ariaLabel: 'Gérer les documents', roles: ['employer'] },
      { label: 'Pointage', href: '/pointage', icon: '⏱️', ariaLabel: 'Accéder au pointage' },
      { label: 'Analytique', href: '/analytique', icon: '📊', ariaLabel: 'Voir les statistiques détaillées' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { label: 'Mon profil', href: '/profil', icon: '👤', ariaLabel: 'Voir mon profil' },
      { label: 'Paramètres', href: '/parametres', icon: '⚙️', ariaLabel: 'Accéder aux paramètres' },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  employer: 'Employeur particulier',
  employee: 'Auxiliaire de vie',
  caregiver: 'Aidant familial',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title = 'Tableau de bord' }: DashboardLayoutProps) {
  const { profile, userRole, signOut } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false)
  const [caregiverPermissions, setCaregiverPermissions] = useState<CaregiverPermissions | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const [showBanner, setShowBanner] = useState(() => {
    const isDismissed = localStorage.getItem('unilien_dev_banner_dismissed')
    return !isDismissed
  })

  // Charger les permissions de l'aidant
  useEffect(() => {
    if (profile?.id && userRole === 'caregiver') {
      getCaregiver(profile.id)
        .then((caregiver) => {
          if (caregiver?.permissions) {
            setCaregiverPermissions(caregiver.permissions)
          }
        })
        .catch((error) => {
          logger.error('Erreur chargement permissions aidant:', error)
        })
    }
  }, [profile?.id, userRole])

  // Notifications
  const {
    notifications,
    unreadCount,
    isLoading: isLoadingNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  } = useNotifications({
    userId: profile?.id || null,
    realtime: true,
  })

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const toggleNotificationsPanel = useCallback(() => {
    setIsNotificationsPanelOpen((prev) => !prev)
  }, [])

  const closeNotificationsPanel = useCallback(() => {
    setIsNotificationsPanelOpen(false)
  }, [])

  // Fermer le menu utilisateur au clic extérieur
  useEffect(() => {
    if (!isUserMenuOpen) return
    const handleClick = () => setIsUserMenuOpen(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isUserMenuOpen])

  // Filtrer les items de nav selon le rôle
  const filterNavItem = (item: NavItem): boolean => {
    if (!item.roles) return true
    if (item.roles.includes(userRole!)) return true
    if (userRole === 'caregiver') {
      if (item.href === '/equipe' && caregiverPermissions?.canManageTeam) return true
      if (item.href === '/conformite' && caregiverPermissions?.canExportData) return true
      if (item.href === '/documents' && caregiverPermissions?.canExportData) return true
    }
    return false
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Development Banner */}
      <DevelopmentBanner onDismiss={() => setShowBanner(false)} />

      {/* Skip link */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: '-40px',
          left: 0,
          background: '#0056E0',
          color: 'white',
          padding: '8px 16px',
          zIndex: 9999,
        }}
        onFocus={(e) => (e.currentTarget.style.top = showBanner ? '80px' : '0')}
        onBlur={(e) => (e.currentTarget.style.top = '-40px')}
      >
        Aller au contenu principal
      </a>

      {/* ── Header (topbar) ── */}
      <Box
        as="header"
        role="banner"
        position="fixed"
        top={showBanner ? '80px' : 0}
        left={0}
        right={0}
        h="64px"
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
        zIndex={100}
        px={4}
      >
        <Flex h="full" align="center" justify="space-between">
          {/* Left: Hamburger (mobile) + Logo + Title */}
          <Flex align="center" gap={3}>
            <IconButton
              aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-controls="app-sidebar"
              aria-expanded={isSidebarOpen}
              variant="ghost"
              display={{ base: 'flex', md: 'none' }}
              onClick={toggleSidebar}
              size="lg"
              minW="44px"
              minH="44px"
            >
              {isSidebarOpen ? '✕' : '☰'}
            </IconButton>
            <Image
              src="/Logo_Unilien.svg"
              alt="Unilien"
              h="36px"
              objectFit="contain"
            />
            <Text
              fontSize="md"
              fontWeight="semibold"
              color="gray.700"
              display={{ base: 'none', lg: 'block' }}
            >
              {title}
            </Text>
          </Flex>

          {/* Right: Search + Notifications + User menu */}
          <Flex align="center" gap={3}>
            {/* Recherche globale */}
            <Box
              display={{ base: 'none', md: 'block' }}
              role="search"
              w="220px"
            >
              <Input
                placeholder="Rechercher…"
                aria-label="Recherche globale"
                size="sm"
                bg="gray.50"
                borderColor="gray.200"
              />
            </Box>

            {/* Notifications */}
            <Box position="relative">
              <NotificationBell
                unreadCount={unreadCount}
                onClick={toggleNotificationsPanel}
                isOpen={isNotificationsPanelOpen}
                isLoading={isLoadingNotifications}
              />
              <NotificationsPanel
                notifications={notifications}
                isOpen={isNotificationsPanelOpen}
                onClose={closeNotificationsPanel}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDismiss={dismiss}
                onDismissAll={dismissAll}
                isLoading={isLoadingNotifications}
              />
            </Box>

            {/* User menu dropdown */}
            <Box position="relative">
              <Flex
                as="button"
                align="center"
                gap={1}
                cursor="pointer"
                borderRadius="md"
                px={2}
                py={1}
                _hover={{ bg: 'gray.100' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsUserMenuOpen(!isUserMenuOpen)
                }}
                aria-label="Menu utilisateur"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                <Avatar.Root size="xs">
                  <Avatar.Fallback name={profile ? `${profile.firstName} ${profile.lastName}` : undefined} />
                  {profile?.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
                </Avatar.Root>
                <Text fontSize="xs" aria-hidden="true" ml={0.5}>▾</Text>
              </Flex>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <Box
                  position="absolute"
                  right={0}
                  top="100%"
                  mt={1}
                  w="220px"
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  boxShadow="lg"
                  zIndex={200}
                  role="menu"
                  py={1}
                >
                  <Box px={3} py={2}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {profile?.firstName} {profile?.lastName}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {ROLE_LABELS[userRole ?? ''] ?? userRole}
                    </Text>
                  </Box>
                  <Separator />
                  <Link asChild>
                    <RouterLink to="/profil">
                      <Box px={3} py={2} fontSize="sm" _hover={{ bg: 'gray.50' }} role="menuitem">
                        Mon profil
                      </Box>
                    </RouterLink>
                  </Link>
                  <Link asChild>
                    <RouterLink to="/parametres">
                      <Box px={3} py={2} fontSize="sm" _hover={{ bg: 'gray.50' }} role="menuitem">
                        Paramètres
                      </Box>
                    </RouterLink>
                  </Link>
                  <Separator />
                  <Box
                    as="button"
                    w="100%"
                    textAlign="left"
                    px={3}
                    py={2}
                    fontSize="sm"
                    color="red.600"
                    _hover={{ bg: 'red.50' }}
                    role="menuitem"
                    onClick={signOut}
                  >
                    Se déconnecter
                  </Box>
                </Box>
              )}
            </Box>
          </Flex>
        </Flex>
      </Box>

      {/* ── Sidebar ── */}
      <Box
        as="nav"
        id="app-sidebar"
        aria-label="Navigation principale"
        position="fixed"
        left={0}
        top={showBanner ? 'calc(64px + 80px)' : '64px'}
        bottom={0}
        w={{ base: isSidebarOpen ? '240px' : '0', md: '240px' }}
        bg="white"
        borderRightWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
        transition="width 0.2s"
        zIndex={90}
        display="flex"
        flexDirection="column"
        css={{
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        {/* Nav sections groupées */}
        <Box flex={1} overflowY="auto" py={3}>
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(filterNavItem)
            if (visibleItems.length === 0) return null
            return (
              <Box key={section.label} mb={3}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  color="gray.400"
                  px={5}
                  mb={1}
                >
                  {section.label}
                </Text>
                <Stack gap={0.5}>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        asChild
                        aria-label={item.ariaLabel}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <RouterLink to={item.href}>
                          <Flex
                            align="center"
                            gap={3}
                            px={5}
                            py={2.5}
                            bg={isActive ? 'brand.50' : 'transparent'}
                            color={isActive ? 'brand.700' : 'gray.700'}
                            fontWeight={isActive ? 'semibold' : 'normal'}
                            fontSize="sm"
                            _hover={{
                              bg: isActive ? 'brand.100' : 'gray.50',
                            }}
                            _focusVisible={{
                              outline: '2px solid',
                              outlineColor: 'brand.500',
                              outlineOffset: '2px',
                            }}
                            minH="40px"
                          >
                            <Text fontSize="lg" aria-hidden="true" w="24px" textAlign="center">
                              {item.icon}
                            </Text>
                            <Text>{item.label}</Text>
                          </Flex>
                        </RouterLink>
                      </Link>
                    )
                  })}
                </Stack>
              </Box>
            )
          })}
        </Box>

        {/* User info en bas de la sidebar */}
        <Box
          borderTopWidth="1px"
          borderColor="gray.200"
          p={4}
        >
          <Flex align="center" gap={3}>
            <Avatar.Root size="sm">
              <Avatar.Fallback name={profile ? `${profile.firstName} ${profile.lastName}` : undefined} />
              {profile?.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
            </Avatar.Root>
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="medium" truncate>
                {profile?.firstName} {profile?.lastName}
              </Text>
              <Text fontSize="xs" color="gray.500" truncate>
                {ROLE_LABELS[userRole ?? ''] ?? userRole}
              </Text>
            </Box>
            <AccessibleButton
              variant="ghost"
              size="xs"
              onClick={signOut}
              accessibleLabel="Se déconnecter"
              title="Se déconnecter"
            >
              ↪
            </AccessibleButton>
          </Flex>
        </Box>
      </Box>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <Box
          position="fixed"
          inset={0}
          top={showBanner ? 'calc(64px + 80px)' : '64px'}
          bg="blackAlpha.600"
          zIndex={80}
          display={{ base: 'block', md: 'none' }}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content ── */}
      <Box
        as="main"
        id="main-content"
        ml={{ base: 0, md: '240px' }}
        mt={showBanner ? 'calc(64px + 80px)' : '64px'}
        p={{ base: 4, md: 6 }}
        minH={showBanner ? 'calc(100vh - 64px - 80px)' : 'calc(100vh - 64px)'}
      >
        {children}
      </Box>
    </Box>
  )
}

export default DashboardLayout
