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
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { DevelopmentBanner, NavIcon } from '@/components/ui'
import { NotificationBell, NotificationsPanel } from '@/components/notifications'
import { SpotlightSearch } from '@/components/dashboard/SpotlightSearch'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'
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
      { label: 'Tableau de bord', href: '/tableau-de-bord', icon: 'grid', ariaLabel: 'Aller au tableau de bord' },
      { label: 'Planning', href: '/planning', icon: 'calendar', ariaLabel: 'Voir le planning' },
      { label: 'Équipe', href: '/equipe', icon: 'users', ariaLabel: 'Gérer mes auxiliaires', roles: ['employer'] },
      { label: 'Messagerie', href: '/messagerie', icon: 'message', ariaLabel: 'Ouvrir la messagerie en temps réel' },
      { label: 'Cahier de liaison', href: '/cahier-de-liaison', icon: 'book', ariaLabel: 'Ouvrir le cahier de liaison' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { label: 'Conformité', href: '/conformite', icon: 'shield', ariaLabel: 'Voir la conformité', roles: ['employer'] },
      { label: 'Documents', href: '/documents', icon: 'file', ariaLabel: 'Gérer les documents', roles: ['employer'] },
      { label: 'Suivi des heures', href: '/suivi-des-heures', icon: 'clock', ariaLabel: 'Accéder au suivi des heures' },
      { label: 'Analytique', href: '/analytique', icon: 'barchart', ariaLabel: 'Voir les statistiques détaillées' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { label: 'Mon profil', href: '/profil', icon: 'user', ariaLabel: 'Voir mon profil' },
      { label: 'Paramètres', href: '/parametres', icon: 'settings', ariaLabel: 'Accéder aux paramètres' },
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
  /** Contenu optionnel affiché à droite dans la topbar (ex. bouton "Nouveau" page Messagerie) */
  topbarRight?: React.ReactNode
  /** Si true, le contenu remplit la hauteur disponible sans scroll sur le main (ex: planning) */
  fillHeight?: boolean
}

export function DashboardLayout({ children, title = 'Tableau de bord', topbarRight, fillHeight = false }: DashboardLayoutProps) {
  const { profile, userRole, signOut } = useAuth()
  const location = useLocation()
  const spotlight = useSpotlightSearch()
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

  // Adapter les labels selon le rôle
  const getNavLabel = (item: NavItem): string => {
    if (item.href === '/suivi-des-heures' && userRole !== 'employer') return 'Mes heures'
    return item.label
  }

  return (
    <Box h="100vh" bg="bg.page" overflow="hidden">
      {/* Development Banner */}
      <DevelopmentBanner onDismiss={() => setShowBanner(false)} />

      {/* Skip link — caché par défaut, visible au focus (Tab) */}
      <Box
        as="a"
        href="#main-content"
        position="absolute"
        top="-100%"
        left={4}
        bg="brand.500"
        color="white"
        px={4}
        py={2}
        borderRadius="6px"
        fontSize="sm"
        fontWeight="semibold"
        zIndex={9999}
        transition="top 0.15s ease"
        _focusVisible={{
          top: showBanner ? 'calc(80px + 16px)' : '16px',
        }}
        css={{
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        Aller au contenu principal
      </Box>

      {/* ── Header (topbar) — prototype: 60px, surface bg, border border.default ── */}
      <Box
        as="header"
        role="banner"
        position="fixed"
        top={showBanner ? '80px' : 0}
        left={0}
        right={0}
        h="60px"
        bg="bg.surface"
        borderBottomWidth="1px"
        borderColor="border.default"
        zIndex={300}
        px={6}
      >
        <Flex h="full" align="center" justify="space-between">
          {/* Left: Hamburger (mobile) + Logo + Title */}
          <Flex align="center" gap={4}>
            <IconButton
              aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-controls="app-sidebar"
              aria-expanded={isSidebarOpen}
              display={{ base: 'flex', md: 'none' }}
              onClick={toggleSidebar}
              w="38px"
              h="38px"
              borderRadius="10px"
              bg="bg.page"
              borderWidth="1.5px"
              borderColor="border.default"
              color="brand.500"
              _hover={{ bg: 'brand.subtle', borderColor: 'brand.muted', color: 'brand.600' }}
            >
              {isSidebarOpen ? '✕' : '☰'}
            </IconButton>
            <Image
              src="/Logo_Unilien_icon.svg"
              alt="Unilien"
              h="32px"
              w="32px"
              flexShrink={0}
              display={{ base: 'block', lg: 'none' }}
              css={{ '.dark &': { filter: 'brightness(0) invert(1)' } }}
            />
            <Image
              src="/Logo_Unilien.svg"
              alt="Unilien"
              h="28px"
              objectFit="contain"
              flexShrink={0}
              display={{ base: 'none', lg: 'block' }}
              css={{ '.dark &': { filter: 'brightness(0) invert(1)' } }}
            />
            <Box
              display={{ base: 'none', lg: 'block' }}
              w="1px"
              h="24px"
              bg="border.default"
              flexShrink={0}
            />
            <Text
              fontSize="18px"
              fontWeight="800"
              color="text.default"
            >
              {title}
            </Text>
          </Flex>

          {/* Right: topbarRight + Search trigger + Notifications + User menu */}
          <Flex align="center" gap={3}>
            {topbarRight}

            {/* Recherche globale — trigger pour SpotlightSearch (Ctrl+K) */}
            <Flex
              as="button"
              display={{ base: 'none', md: 'flex' }}
              align="center"
              gap={2}
              bg="bg.surface"
              borderWidth="1.5px"
              borderColor="border.default"
              borderRadius="10px"
              px={3}
              h="38px"
              w="220px"
              cursor="pointer"
              transition="border-color 0.15s ease"
              _hover={{ borderColor: 'brand.500' }}
              onClick={spotlight.open}
              aria-label="Recherche globale (Ctrl+K)"
            >
              <Box color="brand.500" flexShrink={0} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </Box>
              <Text fontSize="sm" color="text.muted" flex={1} textAlign="left">
                Rechercher…
              </Text>
              <Flex
                as="kbd"
                align="center"
                bg="bg.page"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="4px"
                px="6px"
                h="22px"
                fontSize="xs"
                fontWeight="600"
                color="text.muted"
              >
                ⌘K
              </Flex>
            </Flex>

            {/* Bouton loupe mobile */}
            <IconButton
              display={{ base: 'flex', md: 'none' }}
              aria-label="Rechercher (Ctrl+K)"
              onClick={spotlight.open}
              w="38px"
              h="38px"
              borderRadius="10px"
              bg="bg.page"
              borderWidth="1.5px"
              borderColor="border.default"
              color="brand.500"
              _hover={{ bg: 'brand.subtle', borderColor: 'brand.muted' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </IconButton>

            {/* Notifications — hidden on mobile */}
            <Box position="relative" display={{ base: 'none', md: 'block' }}>
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

            {/* User menu dropdown — prototype: .topbar-user (toujours visible) */}
            <Box position="relative">
              <Flex
                as="button"
                align="center"
                gap={2}
                cursor="pointer"
                borderRadius="full"
                borderWidth="1.5px"
                borderColor="border.default"
                py="5px"
                pl="5px"
                pr="10px"
                bg="transparent"
                color="text.default"
                transition="all 0.15s ease"
                _hover={{ bg: 'bg.page', borderColor: 'brand.500' }}
                css={{
                  '&:focus, &:focus:not(:focus-visible)': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    borderRadius: '9999px !important',
                  },
                  '&:focus-visible': {
                    outline: '2px solid var(--chakra-colors-brand-500) !important',
                    outlineOffset: '2px',
                    borderRadius: '9999px !important',
                  },
                }}
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
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ transition: 'transform 0.15s ease', transform: isUserMenuOpen ? 'rotate(180deg)' : 'none' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Flex>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <Box
                  position="absolute"
                  right={0}
                  top="100%"
                  mt={2}
                  w="200px"
                  bg="bg.surface"
                  borderWidth="1.5px"
                  borderColor="border.default"
                  borderRadius="12px"
                  boxShadow="0 4px 16px rgba(78,100,120,.12)"
                  zIndex={200}
                  role="menu"
                  py={2}
                >
                  {/* User info */}
                  <Box px={4} pb={2} mb={1} borderBottomWidth="1px" borderColor="border.default">
                    <Text fontWeight="700" fontSize="sm" color="text.default">
                      {profile?.firstName} {profile?.lastName}
                    </Text>
                    <Text fontSize="xs" color="text.muted">
                      {ROLE_LABELS[userRole ?? ''] ?? userRole}
                    </Text>
                  </Box>

                  {/* Menu items */}
                  <Link asChild>
                    <RouterLink to="/profil">
                      <Flex
                        align="center" gap={2} px={4} py={2}
                        fontSize="sm" fontWeight="500" color="text.default"
                        _hover={{ bg: 'bg.page' }}
                        role="menuitem"
                        textDecoration="none"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        Mon profil
                      </Flex>
                    </RouterLink>
                  </Link>
                  <Link asChild>
                    <RouterLink to="/parametres">
                      <Flex
                        align="center" gap={2} px={4} py={2}
                        fontSize="sm" fontWeight="500" color="text.default"
                        _hover={{ bg: 'bg.page' }}
                        role="menuitem"
                        textDecoration="none"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                        Paramètres
                      </Flex>
                    </RouterLink>
                  </Link>

                  {/* Separator + Logout */}
                  <Box borderTopWidth="1px" borderColor="border.default" mt={1} pt={1}>
                    <Flex
                      as="button"
                      w="100%"
                      align="center"
                      gap={2}
                      px={4}
                      py={2}
                      fontSize="sm"
                      fontWeight="600"
                      color="danger.500"
                      _hover={{ bg: 'danger.subtle' }}
                      role="menuitem"
                      onClick={signOut}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Se déconnecter
                    </Flex>
                  </Box>
                </Box>
              )}
            </Box>
          </Flex>
        </Flex>
      </Box>

      {/* ── Sidebar — prototype: 240px, surface bg, border border.default ── */}
      <Box
        as="nav"
        id="app-sidebar"
        aria-label="Navigation principale"
        position="fixed"
        left={0}
        top={showBanner ? 'calc(60px + 80px)' : '60px'}
        bottom={0}
        w={{ base: isSidebarOpen ? '240px' : '0', md: '240px' }}
        bg="bg.surface"
        borderRightWidth="1px"
        borderColor="border.default"
        overflow="hidden"
        transition="transform 0.25s ease"
        zIndex={200}
        display="flex"
        flexDirection="column"
        css={{
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        {/* Nav sections groupées — prototype: .sidebar-section + .sidebar-label + .nav-item */}
        <Box flex={1} overflowY="auto">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(filterNavItem)
            if (visibleItems.length === 0) return null
            return (
              <Box key={section.label} py={3} data-sidebar-section="">
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                  color="brand.500"
                  px={5}
                  pb={1}
                >
                  {section.label}
                </Text>
                <Stack gap={0}>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        asChild
                        aria-label={item.ariaLabel}
                        aria-current={isActive ? 'page' : undefined}
                        css={{ marginInline: '5px', width: 'calc(100% - 10px)', display: 'block' }}
                      >
                        <RouterLink to={item.href}>
                          <Flex
                            data-sidebar-item=""
                            align="center"
                            gap={3}
                            px={5}
                            py="10px"
                            borderRadius="6px"
                            bg={isActive ? 'color-mix(in srgb, var(--chakra-colors-brand-500) 30%, transparent)' : 'transparent'}
                            color={isActive ? 'brand.fg' : 'text.muted'}
                            fontWeight={isActive ? 'bold' : '500'}
                            fontSize="sm"
                            transition="background 0.15s ease, color 0.15s ease"
                            _hover={{
                              bg: 'bg.surface.hover',
                              color: 'text.default',
                            }}
                            _focusVisible={{
                              outline: '2px solid',
                              outlineColor: 'brand.500',
                              outlineOffset: '-2px',
                            }}
                            minH="40px"
                          >
                            <NavIcon name={item.icon} />
                            <Text>{getNavLabel(item)}</Text>
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

        {/* User info en bas — prototype: .sidebar-bottom + .user-pill */}
        <Box
          borderTopWidth="1px"
          borderColor="border.default"
          p={4}
          flexShrink={0}
        >
          <Flex align="center" gap={2}>
            <Avatar.Root size="sm">
              <Avatar.Fallback name={profile ? `${profile.firstName} ${profile.lastName}` : undefined} />
              {profile?.avatarUrl && <Avatar.Image src={profile.avatarUrl} />}
            </Avatar.Root>
            <Box flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="bold" color="text.default" truncate>
                {profile?.firstName} {profile?.lastName}
              </Text>
              <Text fontSize="xs" color="brand.500" truncate>
                {ROLE_LABELS[userRole ?? ''] ?? userRole}
              </Text>
            </Box>
            <IconButton
              aria-label="Se déconnecter"
              title="Se déconnecter"
              variant="ghost"
              size="xs"
              onClick={signOut}
              color="brand.500"
              borderRadius="10px"
              _hover={{ bg: 'brand.subtle' }}
            >
              <NavIcon name="signout" size={16} />
            </IconButton>
          </Flex>
        </Box>
      </Box>

      {/* Mobile overlay — prototype: .sidebar-overlay */}
      {isSidebarOpen && (
        <Box
          position="fixed"
          inset={0}
          top={showBanner ? 'calc(60px + 80px)' : '60px'}
          bg="rgba(0,0,0,0.4)"
          zIndex={199}
          display={{ base: 'block', md: 'none' }}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content — prototype: .app-main + .page-content ── */}
      <Flex
        as="main"
        id="main-content"
        direction="column"
        ml={{ base: 0, md: '240px' }}
        mt={showBanner ? 'calc(60px + 80px)' : '60px'}
        p={6}
        h={showBanner ? 'calc(100vh - 60px - 80px)' : 'calc(100vh - 60px)'}
        minH={0}
        overflow={fillHeight ? 'hidden' : 'auto'}
      >
        {children}
      </Flex>

      {/* ── SpotlightSearch (Ctrl+K) ── */}
      <SpotlightSearch spotlight={spotlight} />
    </Box>
  )
}

export default DashboardLayout
