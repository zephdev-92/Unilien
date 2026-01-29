import { useState, useCallback } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Box,
  Flex,
  Stack,
  Text,
  IconButton,
  Avatar,
  Link,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { AccessibleButton } from '@/components/ui'
import { NotificationBell, NotificationsPanel } from '@/components/notifications'

import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: string
  ariaLabel: string
  roles?: UserRole[] // Si non défini, visible par tous
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: '🏠', ariaLabel: 'Aller au tableau de bord' },
  { label: 'Mon équipe', href: '/team', icon: '👥', ariaLabel: 'Gérer mes auxiliaires', roles: ['employer'] },
  { label: 'Conformité', href: '/compliance', icon: '⚖️', ariaLabel: 'Voir la conformité', roles: ['employer'] },
  { label: 'Planning', href: '/planning', icon: '📅', ariaLabel: 'Voir le planning' },
  { label: 'Messagerie', href: '/liaison', icon: '💬', ariaLabel: 'Ouvrir la messagerie en temps réel' },
  { label: 'Cahier de liaison', href: '/logbook', icon: '📝', ariaLabel: 'Ouvrir le cahier de liaison' },
  { label: 'Paramètres', href: '/profile', icon: '⚙️', ariaLabel: 'Accéder aux paramètres' },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title = 'Tableau de bord' }: DashboardLayoutProps) {
  const { profile, userRole, signOut } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false)

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

  return (
    <Box minH="100vh" bg="gray.50">
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
        onFocus={(e) => (e.currentTarget.style.top = '0')}
        onBlur={(e) => (e.currentTarget.style.top = '-40px')}
      >
        Aller au contenu principal
      </a>

      {/* Header */}
      <Box
        as="header"
        position="fixed"
        top={0}
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
          {/* Left: Menu button (mobile) + Logo */}
          <Flex align="center" gap={3}>
            <IconButton
              aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              variant="ghost"
              display={{ base: 'flex', md: 'none' }}
              onClick={toggleSidebar}
              size="lg"
              minW="44px"
              minH="44px"
            >
              {isSidebarOpen ? '✕' : '☰'}
            </IconButton>
            <Text fontSize="xl" fontWeight="bold" color="brand.500">
              Unilien
            </Text>
          </Flex>

          {/* Center: Page title */}
          <Text
            fontSize="lg"
            fontWeight="medium"
            display={{ base: 'none', sm: 'block' }}
          >
            {title}
          </Text>

          {/* Right: Notifications + User info + Sign out */}
          <Flex align="center" gap={3}>
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

            <Flex align="center" gap={2} display={{ base: 'none', sm: 'flex' }}>
              <Avatar.Root size="sm">
                <Avatar.Fallback name={profile ? `${profile.firstName} ${profile.lastName}` : undefined} />
                {profile?.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
              </Avatar.Root>
              <Text fontSize="sm" fontWeight="medium">
                {profile?.firstName}
              </Text>
            </Flex>
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={signOut}
              accessibleLabel="Se déconnecter de l'application"
            >
              Déconnexion
            </AccessibleButton>
          </Flex>
        </Flex>
      </Box>

      {/* Sidebar */}
      <Box
        as="nav"
        aria-label="Navigation principale"
        position="fixed"
        left={0}
        top="64px"
        bottom={0}
        w={{ base: isSidebarOpen ? '240px' : '0', md: '240px' }}
        bg="white"
        borderRightWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
        transition="width 0.2s"
        zIndex={90}
        css={{
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        <Stack gap={1} p={4}>
          {navItems
            .filter((item) => !item.roles || item.roles.includes(userRole!))
            .map((item) => {
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
                      px={4}
                      py={3}
                      borderRadius="md"
                      bg={isActive ? 'brand.50' : 'transparent'}
                      color={isActive ? 'brand.700' : 'gray.700'}
                      fontWeight={isActive ? 'semibold' : 'normal'}
                      _hover={{
                        bg: isActive ? 'brand.100' : 'gray.100',
                      }}
                      _focusVisible={{
                        outline: '2px solid',
                        outlineColor: 'brand.500',
                        outlineOffset: '2px',
                      }}
                      minH="48px"
                    >
                      <Text fontSize="xl" aria-hidden="true">
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

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <Box
          position="fixed"
          inset={0}
          top="64px"
          bg="blackAlpha.600"
          zIndex={80}
          display={{ base: 'block', md: 'none' }}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <Box
        as="main"
        id="main-content"
        ml={{ base: 0, md: '240px' }}
        mt="64px"
        p={{ base: 4, md: 6 }}
        minH="calc(100vh - 64px)"
      >
        {children}
      </Box>
    </Box>
  )
}

export default DashboardLayout
