/**
 * Page Paramètres — navigation latérale + 9 panneaux
 *
 * Panneaux :
 *  Compte  : Profil, Sécurité, Abonnement (employer)
 *  Application : Notifications, Convention (employer), PCH (caregiver), Apparence, Accessibilité
 *  Avancé : Données
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Switch,
  Input,
  Badge,
  Separator,
  Grid,
  NativeSelect,
  Field,
  Table,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { useAccessibilityStore, useAuthStore } from '@/stores/authStore'
import { updateProfile, uploadAvatar, deleteAvatar, validateAvatarFile, getEmployer, upsertEmployer, getEmployee, upsertEmployee } from '@/services/profileService'
import type { Address, UserRole } from '@/types'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getNotificationPreferences, updateNotificationPreferences } from '@/services/notificationService'
import { exportUserDataJSON, exportUserShiftsCSV } from '@/services/dataExportService'
import { deleteAllUserData, deleteAccount } from '@/services/accountService'
import { logger } from '@/lib/logger'
import { useHealthConsent } from '@/hooks/useHealthConsent'
import { GhostButton, PrimaryButton } from '@/components/ui'
import { useInterventionSettings } from '@/hooks/useInterventionSettings'
import { useConventionSettings } from '@/hooks/useConventionSettings'
import { useMfa } from '@/hooks/useMfa'
import { MfaEnrollment } from '@/components/auth/MfaEnrollment'
import { DEFAULT_TASKS } from '@/lib/constants/taskDefaults'
import { toaster } from '@/lib/toaster'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId =
  | 'profil'
  | 'securite'
  | 'abonnement'
  | 'notifications'
  | 'interventions'
  | 'convention'
  | 'pch'
  | 'apparence'
  | 'accessibilite'
  | 'donnees'

interface NavItem {
  id: PanelId
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Compte',
    items: [
      { id: 'profil', label: 'Informations', icon: <NavIcon><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></NavIcon> },
      { id: 'securite', label: 'Sécurité', icon: <NavIcon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></NavIcon> },
      { id: 'abonnement', label: 'Abonnement', icon: <NavIcon><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></NavIcon>, roles: ['employer'] },
    ],
  },
  {
    label: 'Application',
    items: [
      { id: 'notifications', label: 'Notifications', icon: <NavIcon><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></NavIcon> },
      { id: 'interventions', label: 'Interventions', icon: <NavIcon><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></NavIcon>, roles: ['employer'] },
      { id: 'convention', label: 'Convention', icon: <NavIcon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></NavIcon>, roles: ['employer'] },
      { id: 'pch', label: 'PCH', icon: <NavIcon><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></NavIcon>, roles: ['caregiver'] },
      { id: 'apparence', label: 'Apparence', icon: <NavIcon><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></NavIcon> },
      { id: 'accessibilite', label: 'Accessibilité', icon: <NavIcon><circle cx="12" cy="7" r="4" /><path d="M1 21v-2a7 7 0 0114 0v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></NavIcon> },
    ],
  },
  {
    label: 'Avancé',
    items: [{ id: 'donnees', label: 'Données', icon: <NavIcon><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></NavIcon> }],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { profile, userRole } = useAuth()
  const initialPanel = (() => {
    const hash = window.location.hash.replace('#', '') as PanelId
    const validPanels: PanelId[] = ['profil', 'securite', 'abonnement', 'notifications', 'convention', 'pch', 'apparence', 'accessibilite', 'donnees']
    return validPanels.includes(hash) ? hash : 'profil'
  })()
  const [activePanel, setActivePanel] = useState<PanelId>(initialPanel)
  const navRef = useRef<HTMLDivElement>(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setShowPrev(el.scrollLeft > 4)
    setShowNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollNav = useCallback((dir: 'prev' | 'next') => {
    const el = navRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'next' ? 150 : -150, behavior: 'smooth' })
  }, [])

  if (!profile) {
    return (
      <DashboardLayout title="Paramètres">
        <Center py={12} role="status" aria-live="polite"><Spinner size="lg" color="brand.500" /></Center>
      </DashboardLayout>
    )
  }

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(userRole ?? '')
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <DashboardLayout title="Paramètres">
      <Box
        position="relative"
        css={{ margin: 'calc(var(--chakra-spacing-6) * -1)' }}
        minH={{ md: 'calc(100vh - 60px)' }}
      >
        {/* Navigation latérale / tabs mobile */}
        <Box
          minW={{ md: '210px' }}
          w={{ base: '100%', md: '210px' }}
          flexShrink={0}
          borderRightWidth={{ base: '0', md: '1px' }}
          borderBottomWidth={{ base: '1px', md: '0' }}
          borderColor="border.default"
          bg="bg.surface"
          py={{ base: 0, md: 3 }}
          position={{ base: 'relative', md: 'fixed' }}
          top={{ md: '60px' }}
          bottom={{ md: '0' }}
          zIndex={{ md: 100 }}
          overflowY={{ md: 'auto' }}
        >
          {/* Flèche précédent — mobile uniquement */}
          {showPrev && (
            <Box
              as="button"
              onClick={() => scrollNav('prev')}
              display={{ base: 'flex', md: 'none' }}
              position="absolute"
              left="4px"
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              w="28px"
              h="28px"
              borderRadius="50%"
              border="2px solid"
              borderColor="brand.500"
              bg="bg.surface"
              color="brand.500"
              alignItems="center"
              justifyContent="center"
              _hover={{ bg: 'brand.500', color: 'white' }}
              transition="background 0.15s ease, color 0.15s ease"
              aria-label="Défiler vers la gauche"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><polyline points="15 18 9 12 15 6" /></svg>
            </Box>
          )}

          {/* Flèche suivant — mobile uniquement */}
          {showNext && (
            <Box
              as="button"
              onClick={() => scrollNav('next')}
              display={{ base: 'flex', md: 'none' }}
              position="absolute"
              right="4px"
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              w="28px"
              h="28px"
              borderRadius="50%"
              border="2px solid"
              borderColor="brand.500"
              bg="bg.surface"
              color="brand.500"
              alignItems="center"
              justifyContent="center"
              _hover={{ bg: 'brand.500', color: 'white' }}
              transition="background 0.15s ease, color 0.15s ease"
              aria-label="Défiler vers la droite"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><polyline points="9 18 15 12 9 6" /></svg>
            </Box>
          )}

          <Box
            ref={navRef}
            overflowX={{ base: 'auto', md: 'visible' }}
            display={{ base: 'flex', md: 'block' }}
            gap={0}
            px={{ base: '36px', md: 0 }}
            css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {visibleSections.map((section) => (
              <Box key={section.label} mb={{ md: 4 }} display={{ base: 'flex', md: 'block' }} flexShrink={0}>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing="0.06em"
                  color="text.muted"
                  px={5}
                  pb={2}
                  display={{ base: 'none', md: 'block' }}
                >
                  {section.label}
                </Text>
                <VStack gap={0} align="stretch" display={{ base: 'flex', md: 'flex' }} flexDirection={{ base: 'row', md: 'column' }}>
                  {section.items.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      fontWeight={activePanel === item.id ? '700' : '500'}
                      color={activePanel === item.id ? 'brand.fg' : 'text.muted'}
                      bg={activePanel === item.id ? 'color-mix(in srgb, var(--chakra-colors-brand-500) 30%, transparent)' : 'transparent'}
                      onClick={() => setActivePanel(item.id)}
                      whiteSpace="nowrap"
                      gap={2}
                      borderRadius={{ base: '6px', md: '6px' }}
                      fontSize="sm"
                      px={{ base: 3, md: 5 }}
                      py={{ base: '12px', md: '9px' }}
                      h="auto"
                      mx="5px"
                      my={{ base: activePanel === item.id ? '5px' : 0, md: 0 }}
                      w={{ md: 'calc(100% - 10px)' }}
                      flexShrink={0}
                      _hover={{ bg: 'brand.subtle', color: 'brand.500', borderRadius: '6px', my: { base: '5px', md: 0 } }}
                      transition="background 0.15s ease, color 0.15s ease"
                      css={{ '& svg': { width: { base: '14px', md: '16px' }, height: { base: '14px', md: '16px' } } }}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Contenu */}
        <Box ml={{ base: 0, md: '210px' }} minW={0} p={{ base: '20px 16px', md: 6 }}>
          {activePanel === 'profil' && <ProfilPanel profile={profile} userRole={userRole!} />}
          {activePanel === 'securite' && <SecuritePanel />}
          {activePanel === 'abonnement' && <AbonnementPanel />}
          {activePanel === 'notifications' && <NotificationsPanel userId={profile.id} />}
          {activePanel === 'interventions' && <InterventionsPanel />}
          {activePanel === 'convention' && <ConventionPanel />}
          {activePanel === 'pch' && <PchPanel />}
          {activePanel === 'apparence' && <ApparencePanel />}
          {activePanel === 'accessibilite' && <AccessibilitePanel />}
          {activePanel === 'donnees' && <DonneesPanel userId={profile.id} />}
        </Box>
      </Box>
    </DashboardLayout>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box mb={6}>
      <Text fontFamily="heading" fontSize="2xl" fontWeight="800" mb={1}>{title}</Text>
      <Text color="text.muted" fontSize="md" lineHeight="1.6">{subtitle}</Text>
    </Box>
  )
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <HStack justify="space-between" align="start" py={3} borderBottomWidth="1px" borderColor="border.default">
      <Box flex={1} pr={4}>
        <HStack gap={2} mb={0.5}>
          <Text fontWeight="medium" fontSize="sm">{label}</Text>
          {badge && <Badge variant="subtle" size="sm">{badge}</Badge>}
        </HStack>
        <Text fontSize="xs" color="text.muted">{description}</Text>
      </Box>
      <Switch.Root
        checked={checked}
        onCheckedChange={(e) => onChange(e.checked)}
        disabled={disabled}
      >
        <Switch.HiddenInput aria-label={label} />
        <Switch.Control
          borderRadius="full"
          css={{
            '&[data-state=checked]': { background: '#9BB23B !important' },
          }}
        >
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANNEAUX
// ══════════════════════════════════════════════════════════════════════════════

// ── Profil ────────────────────────────────────────────────────────────────────

function ProfilPanel({ profile, userRole }: { profile: { id: string; firstName: string; lastName: string; email: string; phone?: string | null; avatarUrl?: string }; userRole: UserRole }) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const emptyAddress: Address = { street: '', city: '', postalCode: '', country: 'France' }
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [initialAddress, setInitialAddress] = useState<Address>(emptyAddress)
  const [lang, setLang] = useState('fr')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setStoreProfile = useAuthStore((s) => s.setProfile)

  // Charger l'adresse depuis la table du rôle
  useEffect(() => {
    async function loadAddress() {
      try {
        let addr: Address | undefined
        if (userRole === 'employer') {
          const emp = await getEmployer(profile.id)
          addr = emp?.address
        } else if (userRole === 'employee') {
          const emp = await getEmployee(profile.id)
          addr = emp?.address
        }
        // caregiver: address is on the employer they work for, not on them
        if (addr) {
          setAddress(addr)
          setInitialAddress(addr)
        }
      } catch (err) {
        logger.error('Erreur chargement adresse:', err)
      }
    }
    loadAddress()
  }, [profile.id, userRole])

  const addressChanged = address.street !== initialAddress.street || address.city !== initialAddress.city || address.postalCode !== initialAddress.postalCode || address.country !== initialAddress.country
  const hasChanges = firstName !== profile.firstName || lastName !== profile.lastName || (phone || '') !== (profile.phone || '') || addressChanged

  const handleSaveProfile = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await updateProfile(profile.id, { firstName, lastName, phone: phone || undefined })
      // Sauvegarder l'adresse si modifiée
      if (addressChanged) {
        if (userRole === 'employer') {
          await upsertEmployer(profile.id, { address })
        } else if (userRole === 'employee') {
          await upsertEmployee(profile.id, { address })
        }
        setInitialAddress(address)
      }
      setFeedback({ type: 'success', msg: 'Profil mis à jour.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setFeedback({ type: 'error', msg: validation.error! })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await uploadAvatar(profile.id, file)
      setAvatarUrl(result.url)
      // Propage au store pour que la navbar/sidebar se re-render
      const current = useAuthStore.getState().profile
      if (current) {
        setStoreProfile({ ...current, avatarUrl: result.url, updatedAt: new Date() })
      }
      setFeedback({ type: 'success', msg: 'Photo mise à jour.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur upload.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarDelete = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await deleteAvatar(profile.id)
      setAvatarUrl('')
      const current = useAuthStore.getState().profile
      if (current) {
        setStoreProfile({ ...current, avatarUrl: undefined, updatedAt: new Date() })
      }
      setFeedback({ type: 'success', msg: 'Photo supprimée.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur suppression.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(profile.phone ?? '')
    setAddress(initialAddress)
    setFeedback(null)
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Informations"
        subtitle="Gérez vos informations personnelles et les détails de votre compte."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Informations personnelles</Card.Title>
          <Text fontSize="xs" color="text.muted" mt="3px">Ces informations apparaissent sur vos documents exportés.</Text>
        </Card.Header>
        <Card.Body p={4}>
          {/* Avatar */}
          <HStack gap={4} mb={6}>
            {avatarUrl ? (
              <Box w="72px" h="72px" borderRadius="full" overflow="hidden" flexShrink={0}>
                <img src={avatarUrl} alt={`Avatar ${firstName} ${lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ) : (
              <Box
                w="72px" h="72px" borderRadius="full" bg="brand.500" color="white"
                display="flex" alignItems="center" justifyContent="center"
                fontSize="1.6rem" fontWeight="800" flexShrink={0}
                aria-label={`Avatar ${firstName} ${lastName}`}
              >
                {firstName.charAt(0)}{lastName.charAt(0)}
              </Box>
            )}
            <VStack gap={2} align="start">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={handleAvatarUpload} />
              <GhostButton size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                Changer la photo
              </GhostButton>
              {avatarUrl && (
                <Button variant="ghost" size="sm" color="red.600" borderWidth="1.5px" borderColor="red.200" _hover={{ bg: 'red.50', borderColor: 'red.500' }} onClick={handleAvatarDelete} disabled={saving}>
                  Supprimer
                </Button>
              )}
            </VStack>
          </HStack>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Prénom</Field.Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Nom</Field.Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Adresse e-mail</Field.Label>
              <Input value={email} readOnly />
            </Field.Root>
            <Field.Root>
              <Field.Label>Téléphone</Field.Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field.Root>
            <Field.Root gridColumn={{ md: '1 / -1' }}>
              <Field.Label>Adresse (rue)</Field.Label>
              <Input value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} placeholder="12 rue des Lilas" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Code postal</Field.Label>
              <Input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} placeholder="75001" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Ville</Field.Label>
              <Input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="Paris" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Pays</Field.Label>
              <Input value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} disabled={userRole === 'caregiver'} />
              <Field.HelperText>Utilisée pour les bulletins de paie.</Field.HelperText>
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <GhostButton size="sm" onClick={handleCancel} disabled={saving || !hasChanges}>Annuler</GhostButton>
            <PrimaryButton size="sm" onClick={handleSaveProfile} disabled={saving || !hasChanges}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </PrimaryButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Langue et format</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Langue de l'interface</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Format de date</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
          <HStack mt={5} justify="flex-end">
            <Text fontSize="xs" color="text.muted">Langue et format seront disponibles prochainement.</Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Sécurité ──────────────────────────────────────────────────────────────────

function SecuritePanel() {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const pwdValid = newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /\d/.test(newPwd)
  const pwdMatch = newPwd === confirmPwd
  const canSubmit = currentPwd.length > 0 && pwdValid && pwdMatch

  const handleChangePassword = async () => {
    if (!canSubmit) return
    setSaving(true)
    setFeedback(null)
    try {
      // Vérifier le mot de passe actuel en tentant un sign-in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Utilisateur non trouvé.')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      })
      if (signInError) {
        setFeedback({ type: 'error', msg: 'Mot de passe actuel incorrect.' })
        setSaving(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setFeedback({ type: 'success', msg: 'Mot de passe mis à jour.' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Sécurité"
        subtitle="Gérez votre mot de passe et la sécurité de votre compte."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      {/* Mot de passe */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Changer le mot de passe</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Mot de passe actuel</Field.Label>
              <Input type="password" placeholder="••••••••••••" autoComplete="current-password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </Field.Root>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Field.Root invalid={newPwd.length > 0 && !pwdValid}>
                <Field.Label>Nouveau mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <Field.HelperText>Minimum 12 caractères, dont 1 majuscule et 1 chiffre.</Field.HelperText>
              </Field.Root>
              <Field.Root invalid={confirmPwd.length > 0 && !pwdMatch}>
                <Field.Label>Confirmer le mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                {confirmPwd.length > 0 && !pwdMatch && <Field.ErrorText>Les mots de passe ne correspondent pas.</Field.ErrorText>}
              </Field.Root>
            </Grid>
            <HStack justify="flex-end">
              <PrimaryButton size="sm" onClick={handleChangePassword} disabled={saving || !canSubmit}>
                {saving ? 'Mise à jour…' : 'Mettre à jour'}
              </PrimaryButton>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* 2FA */}
      <TwoFactorCard />

      {/* Zone de danger */}
      <DangerZone />
    </VStack>
  )
}

// ── 2FA ──────────────────────────────────────────────────────────────────────

function TwoFactorCard() {
  const { isEnabled, factors, loading, enroll, verify, unenroll, reload } = useMfa()
  const [showEnroll, setShowEnroll] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Le code doit contenir 6 chiffres.')
      return
    }
    setDisabling(true)
    setDisableError(null)
    try {
      const factor = factors.find((f) => f.status === 'verified')
      if (!factor) return

      // Vérifier le code avant de désactiver
      await verify(factor.id, disableCode)
      await unenroll(factor.id)
      setDisableCode('')
      toaster.create({ title: '2FA désactivée', type: 'success' })
    } catch {
      setDisableError('Code invalide.')
    } finally {
      setDisabling(false)
    }
  }

  if (loading) {
    return (
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Body p={4}>
          <Center py={4}><Spinner size="sm" /></Center>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <HStack gap={2}>
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Double authentification (2FA)</Card.Title>
          {isEnabled && <Badge colorPalette="green" size="sm">Activée</Badge>}
        </HStack>
      </Card.Header>
      <Card.Body p={4}>
        {showEnroll ? (
          <MfaEnrollment
            onEnroll={enroll}
            onVerify={verify}
            onCancel={() => setShowEnroll(false)}
            onSuccess={() => {
              setShowEnroll(false)
              reload()
              toaster.create({ title: '2FA activée', type: 'success' })
            }}
          />
        ) : isEnabled ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.muted">
              Votre compte est protégé par la double authentification.
              Un code vous est demandé à chaque connexion.
            </Text>
            <Separator />
            <Text fontSize="sm" fontWeight="600">
              Pour désactiver, entrez le code de votre application :
            </Text>
            <HStack gap={2}>
              <Input
                placeholder="000000"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fontFamily="mono"
                fontSize="lg"
                textAlign="center"
                letterSpacing="0.2em"
                maxW="160px"
              />
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={handleDisable}
                disabled={disabling || disableCode.length !== 6}
              >
                {disabling ? 'Désactivation…' : 'Désactiver'}
              </Button>
            </HStack>
            {disableError && (
              <Text fontSize="sm" color="red.500">{disableError}</Text>
            )}
          </VStack>
        ) : (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.muted">
              Protégez votre compte avec Google Authenticator, Authy ou toute autre application d&apos;authentification.
            </Text>
            <Button
              colorPalette="brand"
              size="sm"
              alignSelf="flex-start"
              onClick={() => setShowEnroll(true)}
            >
              Activer la 2FA
            </Button>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

// ── Zone de danger ───────────────────────────────────────────────────────────

function DangerZone() {
  const [showDeleteData, setShowDeleteData] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [dangerFeedback, setDangerFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleDeleteData = async () => {
    if (confirmText !== 'SUPPRIMER') return
    setProcessing(true)
    setDangerFeedback(null)
    try {
      await deleteAllUserData()
      setDangerFeedback({ type: 'success', msg: 'Toutes les données ont été supprimées.' })
      setShowDeleteData(false)
      setConfirmText('')
    } catch (err) {
      logger.error('Erreur suppression données:', err)
      setDangerFeedback({ type: 'error', msg: 'Erreur lors de la suppression des données.' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'SUPPRIMER MON COMPTE') return
    setProcessing(true)
    setDangerFeedback(null)
    try {
      await deleteAccount()
      // Redirection automatique via auth state change → page login
    } catch (err) {
      logger.error('Erreur suppression compte:', err)
      setDangerFeedback({ type: 'error', msg: 'Erreur lors de la suppression du compte.' })
      setProcessing(false)
    }
  }

  const resetModals = () => {
    setShowDeleteData(false)
    setShowDeleteAccount(false)
    setConfirmText('')
  }

  return (
    <>
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="red.200" boxShadow="sm">
        <Card.Header px={4} py={3} bg="red.50" borderBottomWidth="1px" borderColor="red.200">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700" color="red.600">Zone de danger</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          {dangerFeedback && (
            <Box mb={4} px={4} py={3} borderRadius="md" bg={dangerFeedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={dangerFeedback.type === 'success' ? 'green.200' : 'red.200'}>
              <Text fontSize="sm" color={dangerFeedback.type === 'success' ? 'green.700' : 'red.700'}>{dangerFeedback.msg}</Text>
            </Box>
          )}
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Supprimer toutes les données</Text>
                <Text fontSize="xs" color="text.muted">Efface définitivement les interventions, contrats, absences et messages. Votre compte reste actif.</Text>
              </Box>
              <Button
                colorPalette="red"
                size="xs"
                variant="outline"
                onClick={() => { resetModals(); setShowDeleteData(true) }}
              >
                Supprimer
              </Button>
            </HStack>

            {showDeleteData && (
              <Box p={4} borderRadius="md" borderWidth="1px" borderColor="red.300" bg="red.50">
                <VStack gap={3} align="stretch">
                  <Text fontSize="sm" fontWeight="medium" color="red.700">
                    Cette action est irréversible. Toutes vos interventions, contrats, absences et messages seront supprimés.
                  </Text>
                  <Text fontSize="sm">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer :
                  </Text>
                  <Input
                    size="sm"
                    placeholder="SUPPRIMER"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <HStack gap={2} justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={resetModals} disabled={processing}>
                      Annuler
                    </Button>
                    <Button
                      size="xs"
                      colorPalette="red"
                      onClick={handleDeleteData}
                      disabled={confirmText !== 'SUPPRIMER' || processing}
                      loading={processing}
                    >
                      Confirmer la suppression
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            )}

            <Separator />

            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Supprimer le compte</Text>
                <Text fontSize="xs" color="text.muted">Supprime définitivement votre compte et toutes les données associées.</Text>
              </Box>
              <Button
                colorPalette="red"
                size="xs"
                variant="outline"
                onClick={() => { resetModals(); setShowDeleteAccount(true) }}
              >
                Supprimer
              </Button>
            </HStack>

            {showDeleteAccount && (
              <Box p={4} borderRadius="md" borderWidth="1px" borderColor="red.300" bg="red.50">
                <VStack gap={3} align="stretch">
                  <Text fontSize="sm" fontWeight="medium" color="red.700">
                    Cette action est irréversible. Votre compte et toutes vos données seront définitivement supprimés. Vous ne pourrez plus vous connecter.
                  </Text>
                  <Text fontSize="sm">
                    Tapez <strong>SUPPRIMER MON COMPTE</strong> pour confirmer :
                  </Text>
                  <Input
                    size="sm"
                    placeholder="SUPPRIMER MON COMPTE"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <HStack gap={2} justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={resetModals} disabled={processing}>
                      Annuler
                    </Button>
                    <Button
                      size="xs"
                      colorPalette="red"
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== 'SUPPRIMER MON COMPTE' || processing}
                      loading={processing}
                    >
                      Supprimer mon compte
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </>
  )
}

// ── Abonnement ────────────────────────────────────────────────────────────────

function AbonnementPanel() {
  const currentPlan = 'Essentiel'

  const plans = [
    {
      name: 'Essentiel',
      price: '9,90 €',
      desc: 'Pour les particuliers employeurs.',
      features: ['Auxiliaires illimités', 'Bulletins de paie PDF', 'Conformité IDCC 3239 automatique', 'Export planning (PDF, iCal)', 'Dashboard PCH', 'Cahier de liaison'],
      disabled: [],
      isCurrent: true,
      cta: 'Plan actuel',
    },
  ]

  const invoices = [
    { date: '3 mars 2026', desc: 'Plan Essentiel — mars 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 fév 2026', desc: 'Plan Essentiel — février 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 janv 2026', desc: 'Plan Essentiel — janvier 2026', amount: '9,90 €', status: 'Payé' },
    { date: '1 déc 2025', desc: 'Plan Essentiel — décembre 2025', amount: '9,90 €', status: 'Payé' },
  ]

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Abonnement"
        subtitle="Gérez votre plan, votre moyen de paiement et consultez vos factures."
      />

      {/* Plan actuel */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Plan actuel</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
            <Box>
              <HStack gap={2} mb={1}>
                <Text fontWeight="bold" fontSize="lg">{currentPlan}</Text>
                <Badge colorPalette="green" size="sm">Actif</Badge>
              </HStack>
              <Text fontWeight="bold" fontSize="2xl">9,90 €<Text as="span" fontSize="sm" fontWeight="normal" color="text.muted"> / mois</Text></Text>
              <Text fontSize="sm" color="text.muted" mt={1}>
                Prochain renouvellement le <strong>1 avril 2026</strong> — Visa ····&nbsp;4242
              </Text>
            </Box>
            <Button variant="ghost" size="sm">Résilier</Button>
          </HStack>

          <VStack gap={3} align="stretch">
            <UsageBar label="Employés" value="Illimité" percent={0} />
            <UsageBar label="Bulletins de paie ce mois" value="2 / ∞" percent={20} />
            <UsageBar label="Espace documents" value="1,2 Go / 5 Go" percent={24} />
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Plans disponibles */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Plans disponibles</Card.Title>
          <Text fontSize="sm" color="text.muted">Changez de plan à tout moment, sans engagement.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns="1fr" gap={4} maxW="480px">
            {plans.map((plan) => (
              <Box
                key={plan.name}
                borderWidth="2px"
                borderColor={plan.isCurrent ? 'brand.500' : 'border.default'}
                borderRadius="12px"
                p={5}
                position="relative"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="bold">{plan.name}</Text>
                  {plan.isCurrent && <Badge colorPalette="green" size="sm">Plan actuel</Badge>}
                  {plan.recommended && <Badge colorPalette="brand" size="sm">Recommandé</Badge>}
                </HStack>
                <Text fontWeight="bold" fontSize="xl" mb={1}>
                  {plan.price}<Text as="span" fontSize="sm" fontWeight="normal" color="text.muted"> / mois</Text>
                </Text>
                <Text fontSize="sm" color="text.muted" mb={3}>{plan.desc}</Text>
                <VStack align="start" gap={1.5} mb={4}>
                  {plan.features.map((f) => (
                    <Text key={f} fontSize="sm">✓ {f}</Text>
                  ))}
                  {plan.disabled.map((f) => (
                    <Text key={f} fontSize="sm" color="text.muted" textDecoration="line-through">✗ {f}</Text>
                  ))}
                </VStack>
                <Button
                  w="100%"
                  colorPalette={plan.isCurrent ? 'gray' : 'brand'}
                  variant={plan.isCurrent ? 'outline' : 'solid'}
                  disabled={plan.isCurrent}
                  size="sm"
                >
                  {plan.cta}
                </Button>
              </Box>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>

      {/* Moyen de paiement */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Moyen de paiement</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium" fontSize="sm">Visa ····&nbsp;4242</Text>
              <Text fontSize="xs" color="text.muted">Expire le 03/2028</Text>
            </Box>
            <Button variant="ghost" size="sm">Modifier</Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Historique de facturation */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Historique de facturation</Card.Title>
        </Card.Header>
        <Card.Body p={0}>
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Montant</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Statut</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Facture</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {invoices.map((inv) => (
                  <Table.Row key={inv.date}>
                    <Table.Cell><Text fontSize="sm">{inv.date}</Text></Table.Cell>
                    <Table.Cell><Text fontSize="sm">{inv.desc}</Text></Table.Cell>
                    <Table.Cell textAlign="right"><Text fontSize="sm">{inv.amount}</Text></Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette="green" size="sm">{inv.status}</Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button variant="ghost" size="xs">PDF</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

function UsageBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <Box>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="sm" color="text.muted">{label}</Text>
        <Text fontSize="sm" fontWeight="medium">{value}</Text>
      </HStack>
      <Box bg="bg.surface.hover" borderRadius="full" h="6px">
        <Box
          bg={percent >= 90 ? 'red.400' : 'brand.500'}
          h="100%"
          borderRadius="full"
          w={`${Math.min(percent, 100)}%`}
          transition="width 0.3s"
        />
      </Box>
    </Box>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsPanel({ userId }: { userId: string }) {
  const {
    isSupported,
    isConfigured,
    permission,
    isSubscribed,
    isLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications({ userId })

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailShiftReminders, setEmailShiftReminders] = useState(false)
  const [emailMessageNotifications, setEmailMessageNotifications] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

  useEffect(() => {
    getNotificationPreferences(userId).then((prefs) => {
      setEmailEnabled(prefs.emailEnabled)
      setEmailShiftReminders(prefs.shiftReminders)
      setEmailMessageNotifications(prefs.messageNotifications)
    }).catch(() => {})
  }, [userId])

  const handleEmailToggle = async (field: 'emailEnabled' | 'shiftReminders' | 'messageNotifications', value: boolean) => {
    setEmailSaving(true)
    try {
      if (field === 'emailEnabled') setEmailEnabled(value)
      if (field === 'shiftReminders') setEmailShiftReminders(value)
      if (field === 'messageNotifications') setEmailMessageNotifications(value)
      await updateNotificationPreferences(userId, { [field]: value })
    } catch {
      toaster.error({ title: 'Erreur lors de la sauvegarde' })
    } finally {
      setEmailSaving(false)
    }
  }

  const pushAvailable = isSupported && isConfigured
  const pushDenied = permission === 'denied'

  const handleTogglePush = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe()
      if (ok) {
        toaster.success({ title: 'Notifications push désactivées' })
      } else {
        toaster.error({ title: 'Erreur lors de la désactivation des notifications' })
      }
    } else {
      const ok = await subscribe()
      if (ok) {
        toaster.success({ title: 'Notifications push activées' })
      } else if (!pushError) {
        toaster.error({ title: 'Erreur lors de l\'activation des notifications' })
      }
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Notifications"
        subtitle="Choisissez comment et quand vous souhaitez être notifié."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Notifications push</Card.Title>
          <Text fontSize="sm" color="text.muted">Reçues directement sur votre appareil.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            {!pushAvailable && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="orange.50" borderWidth="1px" borderColor="orange.200">
                <Text fontSize="sm" color="orange.700">
                  {!isSupported
                    ? 'Votre navigateur ne supporte pas les notifications push.'
                    : 'Les notifications push ne sont pas encore configurées sur le serveur.'}
                </Text>
              </Box>
            )}
            {pushDenied && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="red.50" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700">
                  Les notifications sont bloquées par votre navigateur. Autorisez-les dans les paramètres de votre navigateur pour ce site.
                </Text>
              </Box>
            )}
            {pushError && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="red.50" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700">{pushError}</Text>
              </Box>
            )}
            <ToggleRow
              label="Activer les notifications push"
              description={isSubscribed ? 'Les notifications sont actives sur cet appareil.' : 'Recevez des alertes en temps réel.'}
              checked={isSubscribed}
              onChange={handleTogglePush}
              disabled={!pushAvailable || pushDenied || isLoading}
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Notifications e-mail</Card.Title>
          <Text fontSize="sm" color="text.muted">Reçues dans votre boîte mail.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Activer les e-mails"
              description="Active ou désactive toutes les notifications par e-mail."
              checked={emailEnabled}
              onChange={() => handleEmailToggle('emailEnabled', !emailEnabled)}
              disabled={emailSaving}
            />
            <ToggleRow
              label="Rappels d'intervention"
              description="Rappel par e-mail la veille de chaque intervention."
              checked={emailShiftReminders}
              onChange={() => handleEmailToggle('shiftReminders', !emailShiftReminders)}
              disabled={emailSaving || !emailEnabled}
            />
            <ToggleRow
              label="Nouveaux messages"
              description="Notification par e-mail quand vous recevez un nouveau message."
              checked={emailMessageNotifications}
              onChange={() => handleEmailToggle('messageNotifications', !emailMessageNotifications)}
              disabled={emailSaving || !emailEnabled}
            />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Convention ─────────────────────────────────────────────────────────────────

// ── Panneau Interventions ─────────────────────────────────────────────────────

function InterventionsPanel() {
  const {
    defaultTasks, customTasks, shoppingList,
    saveDefaultTasks, addCustomTask, removeCustomTask,
    addShoppingItem, removeShoppingItem, updateShoppingItem,
  } = useInterventionSettings()

  const [newTask, setNewTask] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemBrand, setNewItemBrand] = useState('')
  const [newItemNote, setNewItemNote] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const toggleTask = (task: string) => {
    const next = defaultTasks.includes(task)
      ? defaultTasks.filter(t => t !== task)
      : [...defaultTasks, task]
    saveDefaultTasks(next)
  }

  const handleAddCustom = () => {
    const trimmed = newTask.trim()
    if (!trimmed) return
    addCustomTask(trimmed)
    setNewTask('')
    showFeedback(`"${trimmed}" ajoutée`)
  }

  const handleAddShoppingItem = () => {
    const name = newItemName.trim()
    if (!name) return
    const brand = newItemBrand.trim()
    const note = newItemNote.trim()
    addShoppingItem({ name, brand, quantity: 1, note })
    setNewItemName('')
    setNewItemBrand('')
    setNewItemNote('')
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Interventions"
        subtitle="Configurez vos tâches habituelles et votre liste de courses type. Ces préférences seront pré-remplies dans chaque nouvelle intervention."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg="accent.subtle" borderWidth="1px" borderColor="accent.muted">
          <Text fontSize="sm" color="accent.fg">{feedback}</Text>
        </Box>
      )}

      {/* Tâches habituelles */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Tâches habituelles</Card.Title>
          <Text fontSize="sm" color="text.muted" mt={1}>
            Cochez les tâches que vous réalisez régulièrement. Elles seront pré-sélectionnées dans le formulaire d'intervention.
          </Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            {DEFAULT_TASKS.map(task => (
              <HStack
                key={task}
                as="label"
                gap={3}
                py={2}
                px={3}
                cursor="pointer"
                borderRadius="md"
                _hover={{ bg: 'bg.muted' }}
                transition="background 0.15s"
              >
                <Switch.Root
                  size="sm"
                  checked={defaultTasks.includes(task)}
                  onCheckedChange={() => toggleTask(task)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control
                    borderRadius="full"
                    css={{
                      '&[data-state=checked]': { background: '#9BB23B !important' },
                    }}
                  >
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
                <Text fontSize="sm" fontWeight={defaultTasks.includes(task) ? '600' : '400'}>
                  {task}
                </Text>
              </HStack>
            ))}
          </VStack>

          <Separator my={4} />

          {/* Tâches personnalisées */}
          <Text fontSize="sm" fontWeight="600" color="text.muted" mb={2}>
            Tâches personnalisées
          </Text>
          {customTasks.length > 0 && (
            <HStack gap={2} flexWrap="wrap" mb={3}>
              {customTasks.map(task => (
                <Badge
                  key={task}
                  px={3} py={1}
                  borderRadius="full"
                  variant="subtle"
                  colorPalette="brand"
                  fontSize="xs"
                  fontWeight="500"
                >
                  {task}
                  <Box
                    as="button" type="button"
                    ml={2} fontSize="xs" fontWeight="700"
                    opacity={0.6} _hover={{ opacity: 1 }}
                    onClick={() => removeCustomTask(task)}
                    aria-label={`Retirer la tâche ${task}`}
                  >✕</Box>
                </Badge>
              ))}
            </HStack>
          )}
          <HStack gap={2}>
            <Input
              size="sm"
              placeholder="Ajouter une tâche personnalisée…"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() } }}
              borderRadius="md"
              aria-label="Ajouter une tâche personnalisée"
            />
            <GhostButton size="sm" onClick={handleAddCustom}>+ Ajouter</GhostButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Liste de courses */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Liste de courses type</Card.Title>
          <Text fontSize="sm" color="text.muted" mt={1}>
            Créez votre liste d'articles habituels. Elle sera pré-remplie quand "Courses" est sélectionné dans une intervention.
          </Text>
        </Card.Header>
        <Card.Body p={4}>
          {shoppingList.length > 0 && (
            <VStack gap={2} align="stretch" mb={4}>
              {shoppingList.map(item => (
                <HStack
                  key={`${item.name}-${item.brand}`}
                  gap={3}
                  px={3} py={2}
                  bg="bg.muted"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="md"
                  fontSize="sm"
                  _hover={{ borderColor: 'brand.300', bg: 'brand.subtle' }}
                  transition="all 0.12s"
                >
                  <VStack gap={0} align="start" flex={1}>
                    <HStack gap={2}>
                      <Text fontWeight="600">{item.name}</Text>
                      {item.brand && (
                        <Text fontSize="xs" color="text.muted" fontStyle="italic">{item.brand}</Text>
                      )}
                    </HStack>
                    {item.note && (
                      <Text fontSize="xs" color="text.muted">{item.note}</Text>
                    )}
                  </VStack>
                  <HStack gap={1}>
                    <Box
                      as="button" type="button"
                      w="22px" h="22px" borderRadius="full"
                      bg="border.default" color="text.default" fontSize="xs" fontWeight="bold"
                      display="flex" alignItems="center" justifyContent="center"
                      _hover={{ bg: 'brand.subtle', borderColor: 'brand.solid' }}
                      onClick={() => updateShoppingItem(item.name, item.brand, { quantity: Math.max(1, (item.quantity || 1) - 1) })}
                      aria-label={`Diminuer la quantité de ${item.name}`}
                    >-</Box>
                    <Text fontSize="xs" fontWeight="600" minW="22px" textAlign="center">
                      x{item.quantity || 1}
                    </Text>
                    <Box
                      as="button" type="button"
                      w="22px" h="22px" borderRadius="full"
                      bg="border.default" color="text.default" fontSize="xs" fontWeight="bold"
                      display="flex" alignItems="center" justifyContent="center"
                      _hover={{ bg: 'brand.subtle', borderColor: 'brand.solid' }}
                      onClick={() => updateShoppingItem(item.name, item.brand, { quantity: (item.quantity || 1) + 1 })}
                      aria-label={`Augmenter la quantité de ${item.name}`}
                    >+</Box>
                  </HStack>
                  <Box
                    as="button" type="button"
                    fontSize="xs" color="text.muted"
                    opacity={0.5} _hover={{ opacity: 1, color: 'red.500' }}
                    onClick={() => removeShoppingItem(item)}
                    aria-label={`Retirer l'article ${item.name}`}
                  >&#10005;</Box>
                </HStack>
              ))}
            </VStack>
          )}
          <HStack gap={2}>
            <Input
              size="sm"
              placeholder="Article (ex : Lait, Bananes…)"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('settings-brand-input')?.focus() } }}
              borderRadius="md"
              flex={2}
              aria-label="Nom de l'article"
            />
            <Input
              id="settings-brand-input"
              size="sm"
              placeholder="Marque (optionnel)"
              value={newItemBrand}
              onChange={e => setNewItemBrand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddShoppingItem() } }}
              borderRadius="md"
              flex={1}
              aria-label="Marque de l'article"
            />
            <PrimaryButton size="sm" onClick={handleAddShoppingItem}>+ Ajouter</PrimaryButton>
          </HStack>
          <Text fontSize="xs" color="text.muted" mt={2}>
            Les articles ajoutés dans le formulaire d'intervention seront aussi mémorisés ici.
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Panneau Convention ────────────────────────────────────────────────────────

function ConventionPanel() {
  const {
    ruleBreak, ruleDailyMax, ruleOvertime, ruleNight,
    majDimanche, majFerie, majNuit, majSupp,
    isLoading, updateSettings, resetToDefaults,
  } = useConventionSettings()

  const [feedback, setFeedback] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleReset = () => {
    resetToDefaults()
    showFeedback('Valeurs réinitialisées.')
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Convention collective"
        subtitle="Paramètres de conformité liés à l'IDCC 3239 — Particuliers employeurs et emploi à domicile."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg="accent.subtle" borderWidth="1px" borderColor="accent.muted">
          <Text fontSize="sm" color="accent.fg">{feedback}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Règles de validation</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Pause obligatoire (Art. L3121-16)" description="Alerte si aucune pause de 20 min pour une intervention supérieure à 6h." checked={ruleBreak} onChange={() => updateSettings({ ruleBreak: !ruleBreak })} />
            <ToggleRow label="Durée maximale journalière" description="Avertissement si le total dépasse 10h par jour." checked={ruleDailyMax} onChange={() => updateSettings({ ruleDailyMax: !ruleDailyMax })} />
            <ToggleRow label="Heures supplémentaires" description="Calcul automatique des majorations au-delà de 40h/semaine." checked={ruleOvertime} onChange={() => updateSettings({ ruleOvertime: !ruleOvertime })} />
            <ToggleRow label="Présence nuit / Garde 24h" description="Alerte si la présence de nuit dépasse 12h consécutives." checked={ruleNight} onChange={() => updateSettings({ ruleNight: !ruleNight })} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Majorations par défaut</Card.Title>
          <Text fontSize="sm" color="text.muted">Modifiables par employé dans la fiche contrat.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Majoration dimanche (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majDimanche} onChange={(e) => updateSettings({ majDimanche: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration jour férié (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majFerie} onChange={(e) => updateSettings({ majFerie: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration nuit (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majNuit} onChange={(e) => updateSettings({ majNuit: Number(e.target.value) })} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration heures sup (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majSupp} onChange={(e) => updateSettings({ majSupp: Number(e.target.value) })} />
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <GhostButton size="sm" onClick={handleReset}>Réinitialiser</GhostButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Tous les paramètres sont sauvegardés automatiquement et synchronisés avec votre compte.</Text>
      </HStack>
    </VStack>
  )
}

// ── PCH ───────────────────────────────────────────────────────────────────────

const PCH_ALERTS_KEY = 'unilien-pch-alerts'
const PCH_ALERTS_DEFAULTS = { alertQuota: true, alertRenewal: true, alertAttestation: true, alertReleve: true }

function loadPchAlerts() {
  try {
    const raw = localStorage.getItem(PCH_ALERTS_KEY)
    return raw ? { ...PCH_ALERTS_DEFAULTS, ...JSON.parse(raw) } : { ...PCH_ALERTS_DEFAULTS }
  } catch { return { ...PCH_ALERTS_DEFAULTS } }
}

function PchPanel() {
  const [alerts, setAlerts] = useState(loadPchAlerts)

  const toggle = (key: keyof typeof alerts) => {
    setAlerts((prev: typeof alerts) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(PCH_ALERTS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="PCH — Alertes & paiement"
        subtitle="Configurez vos alertes liées au quota PCH et vos coordonnées bancaires de versement."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Alertes PCH</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Quota atteint à 90 %" description="Alerte quand vous approchez du plafond mensuel PCH (55h36 sur 62h)." checked={alerts.alertQuota} onChange={() => toggle('alertQuota')} />
            <ToggleRow label="Rappel renouvellement PCH" description="Notification 3 mois avant l'expiration de votre accord MDPH." checked={alerts.alertRenewal} onChange={() => toggle('alertRenewal')} />
            <ToggleRow label="Attestation annuelle à signer" description="Rappel 30 jours avant la date limite de renouvellement de l'attestation." checked={alerts.alertAttestation} onChange={() => toggle('alertAttestation')} />
            <ToggleRow label="Relevé mensuel disponible" description="Notification quand le relevé d'heures du mois précédent est généré." checked={alerts.alertReleve} onChange={() => toggle('alertReleve')} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">IBAN de versement</Card.Title>
          <Text fontSize="sm" color="text.muted">Coordonnées bancaires pour le versement de la PCH par le CDAPH.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <Field.Root>
            <Field.Label>IBAN</Field.Label>
            <Input
              value="FR76 1234 5678 9012 3456 7890 123"
              readOnly
              fontFamily="mono"
              bg="bg.page"
            />
            <Field.HelperText>
              Pour modifier votre IBAN, rendez-vous dans votre profil aidant.
            </Field.HelperText>
          </Field.Root>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Les alertes sont enregistrées automatiquement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}

// ── Apparence ─────────────────────────────────────────────────────────────────

const APPARENCE_STORAGE_KEY = 'unilien-apparence'

type PaletteId = 'ardoise' | 'foret' | 'indigo' | 'rubis'

interface PaletteDef {
  label: string
  swatch: string
  vars: Record<string, string>
}

const PALETTES: Record<PaletteId, PaletteDef> = {
  ardoise: {
    label: 'Ardoise',
    swatch: '#3D5166',
    vars: {
      '--chakra-colors-brand-50': '#EDF1F5',
      '--chakra-colors-brand-100': '#C2D2E0',
      '--chakra-colors-brand-200': '#97B3C7',
      '--chakra-colors-brand-300': '#6D93AD',
      '--chakra-colors-brand-400': '#4E6478',
      '--chakra-colors-brand-500': '#3D5166',
      '--chakra-colors-brand-600': '#2E3F50',
      '--chakra-colors-brand-700': '#1F2C3B',
      '--chakra-colors-brand-800': '#151E29',
      '--chakra-colors-brand-900': '#0B1017',
    },
  },
  foret: {
    label: 'Forêt',
    swatch: '#2D6A4F',
    vars: {
      '--chakra-colors-brand-50': '#E9F5F0',
      '--chakra-colors-brand-100': '#B7DDD0',
      '--chakra-colors-brand-200': '#85C5B0',
      '--chakra-colors-brand-300': '#53AD90',
      '--chakra-colors-brand-400': '#3B8870',
      '--chakra-colors-brand-500': '#2D6A4F',
      '--chakra-colors-brand-600': '#22503C',
      '--chakra-colors-brand-700': '#183829',
      '--chakra-colors-brand-800': '#0E2018',
      '--chakra-colors-brand-900': '#050D08',
    },
  },
  indigo: {
    label: 'Indigo',
    swatch: '#4338CA',
    vars: {
      '--chakra-colors-brand-50': '#EEECFB',
      '--chakra-colors-brand-100': '#C9C4F4',
      '--chakra-colors-brand-200': '#A49DED',
      '--chakra-colors-brand-300': '#7F76E6',
      '--chakra-colors-brand-400': '#5B52DB',
      '--chakra-colors-brand-500': '#4338CA',
      '--chakra-colors-brand-600': '#342BA0',
      '--chakra-colors-brand-700': '#251F76',
      '--chakra-colors-brand-800': '#17134D',
      '--chakra-colors-brand-900': '#090724',
    },
  },
  rubis: {
    label: 'Rubis',
    swatch: '#9D174D',
    vars: {
      '--chakra-colors-brand-50': '#FDF0F5',
      '--chakra-colors-brand-100': '#F8C6D9',
      '--chakra-colors-brand-200': '#F29CBE',
      '--chakra-colors-brand-300': '#E566A3',
      '--chakra-colors-brand-400': '#C73D7A',
      '--chakra-colors-brand-500': '#9D174D',
      '--chakra-colors-brand-600': '#7B123C',
      '--chakra-colors-brand-700': '#580D2B',
      '--chakra-colors-brand-800': '#36081A',
      '--chakra-colors-brand-900': '#14030A',
    },
  },
}

function applyPalette(id: PaletteId) {
  const palette = PALETTES[id]
  const root = document.documentElement
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

function loadApparenceSettings(): { darkMode: boolean; density: 'comfortable' | 'compact'; palette: PaletteId } {
  try {
    const raw = localStorage.getItem(APPARENCE_STORAGE_KEY)
    return raw ? { palette: 'ardoise', ...JSON.parse(raw) } : { darkMode: false, density: 'comfortable', palette: 'ardoise' }
  } catch { return { darkMode: false, density: 'comfortable', palette: 'ardoise' } }
}

function applyDensity(density: 'comfortable' | 'compact') {
  document.documentElement.setAttribute('data-density', density)
}

function ApparencePanel() {
  const [settings, setSettings] = useState(() => {
    const s = loadApparenceSettings()
    applyDensity(s.density)
    applyPalette(s.palette)
    return s
  })

  const update = (patch: Partial<typeof settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(APPARENCE_STORAGE_KEY, JSON.stringify(next))
      if (next.density !== prev.density) applyDensity(next.density)
      if (next.palette !== prev.palette) applyPalette(next.palette)
      if (next.darkMode !== prev.darkMode) {
        if (next.darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Apparence"
        subtitle="Personnalisez l'interface selon vos préférences visuelles."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Thème</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <ToggleRow
            label="Mode sombre"
            description="Réduit la fatigue visuelle en environnement peu éclairé."
            checked={settings.darkMode}
            onChange={() => update({ darkMode: !settings.darkMode })}
          />
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Densité de l'interface</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={4} role="radiogroup" aria-label="Densité de l'interface">
            {(['comfortable', 'compact'] as const).map((d) => (
              <Box
                key={d}
                flex={1}
                borderWidth="2px"
                borderColor={settings.density === d ? 'brand.500' : 'border.default'}
                borderRadius="10px"
                p={4}
                cursor="pointer"
                onClick={() => update({ density: d })}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    update({ density: d })
                  }
                }}
                role="radio"
                aria-checked={settings.density === d}
                aria-label={d === 'comfortable' ? 'Confortable' : 'Compact'}
                tabIndex={0}
                transition="border-color 0.15s ease"
              >
                <Text fontWeight="medium" fontSize="sm" mb={1}>
                  {d === 'comfortable' ? 'Confortable' : 'Compact'}
                </Text>
                <Text fontSize="xs" color="text.muted">
                  {d === 'comfortable'
                    ? "Plus d'espace entre les éléments"
                    : "Interface plus dense, plus d'informations visibles"}
                </Text>
              </Box>
            ))}
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Palette de couleurs</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={3} wrap="wrap" role="radiogroup" aria-label="Palette de couleurs">
            {(Object.entries(PALETTES) as [PaletteId, PaletteDef][]).map(([id, p]) => {
              const isSelected = settings.palette === id
              return (
                <Box
                  key={id}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap={2}
                  cursor="pointer"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={p.label}
                  tabIndex={0}
                  onClick={() => update({ palette: id })}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); update({ palette: id }) }
                  }}
                  p={2}
                  borderRadius="10px"
                  transition="background 0.15s ease"
                  _hover={{ bg: 'bg.muted' }}
                >
                  <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={p.swatch}
                    borderWidth={isSelected ? '3px' : '2px'}
                    borderColor={isSelected ? p.swatch : 'border.default'}
                    outline={isSelected ? `3px solid ${p.swatch}` : 'none'}
                    outlineOffset="2px"
                    transition="outline 0.15s ease, border-color 0.15s ease"
                  />
                  <Text fontSize="xs" fontWeight={isSelected ? '600' : '400'} color={isSelected ? 'brand.fg' : 'text.muted'}>
                    {p.label}
                  </Text>
                </Box>
              )
            })}
          </HStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Ces paramètres sont enregistrés localement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}

// ── Accessibilité ─────────────────────────────────────────────────────────────

function AccessibilitePanel() {
  const { settings, updateSettings } = useAccessibilityStore()

  const handleToggle = (key: keyof Omit<import('@/types').AccessibilitySettings, 'textScale'>) => {
    updateSettings({ [key]: !settings[key] })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Accessibilité"
        subtitle="Adaptez l'interface à vos besoins pour une meilleure expérience d'utilisation."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Affichage</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Contraste élevé"
              description="Renforce le contraste des couleurs pour améliorer la lisibilité."
              checked={settings.highContrast}
              onChange={() => handleToggle('highContrast')}
            />
            <ToggleRow
              label="Texte agrandi"
              description="Augmente la taille du texte dans l'ensemble de l'application."
              checked={settings.largeText}
              onChange={() => handleToggle('largeText')}
            />
            {settings.largeText && (
              <Box py={3} borderBottomWidth="1px" borderColor="border.default">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="text.muted">Taille du texte</Text>
                  <Text fontSize="sm" fontWeight="600" color="brand.500">{settings.textScale}%</Text>
                </HStack>
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={settings.textScale}
                  onChange={(e) => updateSettings({ textScale: Number(e.target.value) })}
                  aria-label="Taille du texte en pourcentage"
                  style={{ width: '100%', accentColor: 'var(--chakra-colors-brand-500)' }}
                />
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="text.muted">80%</Text>
                  <Text fontSize="xs" color="text.muted">150%</Text>
                </HStack>
              </Box>
            )}
            <ToggleRow
              label="Réduire les animations"
              description="Limite les transitions et effets animés pour réduire la fatigue visuelle."
              checked={settings.reducedMotion}
              onChange={() => handleToggle('reducedMotion')}
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Assistance</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Optimisé lecteur d'écran"
              description="Améliore la compatibilité avec les technologies d'assistance (NVDA, VoiceOver…)."
              checked={settings.screenReaderOptimized}
              onChange={() => handleToggle('screenReaderOptimized')}
            />
            <ToggleRow
              label="Contrôle vocal"
              description="Naviguez dans l'application par commandes vocales."
              checked={settings.voiceControlEnabled}
              onChange={() => handleToggle('voiceControlEnabled')}
              disabled
              badge="Bientôt disponible"
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Ces paramètres sont enregistrés localement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}

// ── Données ───────────────────────────────────────────────────────────────────

function HealthConsentCard() {
  const { hasConsent, loading, grantedAt, revokeConsent, grantConsent } = useHealthConsent()
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const handleRevoke = async () => {
    setRevoking(true)
    await revokeConsent()
    setRevoking(false)
    setConfirmRevoke(false)
  }

  const handleGrant = async () => {
    await grantConsent()
  }

  if (loading) return null

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor={hasConsent ? 'green.200' : 'orange.200'} boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor={hasConsent ? 'green.200' : 'orange.200'} bg={hasConsent ? 'green.50' : 'orange.50'}>
        <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700" color={hasConsent ? 'green.700' : 'orange.700'}>
          Consentement données de santé (RGPD)
        </Card.Title>
      </Card.Header>
      <Card.Body p={4}>
        {hasConsent ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.secondary">
              Vous avez consenti au traitement de vos données de santé le{' '}
              <Text as="span" fontWeight="600">
                {grantedAt ? new Date(grantedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </Text>.
            </Text>
            <Text fontSize="xs" color="text.muted">
              Conformément à l&apos;article 9 du RGPD, vous pouvez retirer ce consentement à tout moment.
              Vos données de santé (type de handicap, besoins, PCH) ne seront plus accessibles.
            </Text>
            {!confirmRevoke ? (
              <Button
                colorPalette="red"
                variant="outline"
                size="xs"
                w="fit-content"
                onClick={() => setConfirmRevoke(true)}
              >
                Retirer mon consentement
              </Button>
            ) : (
              <Box p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700" mb={2} fontWeight="500">
                  Vos données de santé ne seront plus accessibles. Elles resteront en base mais ne seront plus affichées.
                </Text>
                <HStack gap={2}>
                  <Button
                    colorPalette="red"
                    size="xs"
                    onClick={handleRevoke}
                    loading={revoking}
                    loadingText="Révocation..."
                  >
                    Confirmer la révocation
                  </Button>
                  <GhostButton size="xs" onClick={() => setConfirmRevoke(false)}>
                    Annuler
                  </GhostButton>
                </HStack>
              </Box>
            )}
          </VStack>
        ) : (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.secondary">
              Vous n&apos;avez pas consenti au traitement de vos données de santé.
              Sans consentement, vous ne pouvez pas renseigner vos informations de handicap et PCH.
            </Text>
            <Button
              colorPalette="brand"
              variant="outline"
              size="xs"
              w="fit-content"
              onClick={handleGrant}
            >
              Donner mon consentement
            </Button>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

function DonneesPanel({ userId }: { userId: string }) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleExportJSON = async () => {
    setExporting('json')
    setFeedback(null)
    try {
      const data = await exportUserDataJSON(userId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unilien-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setFeedback({ type: 'success', msg: 'Export JSON téléchargé.' })
    } catch (err) {
      logger.error('Erreur export JSON:', err)
      setFeedback({ type: 'error', msg: 'Erreur lors de l\'export.' })
    } finally {
      setExporting(null)
    }
  }

  const handleExportCSV = async () => {
    setExporting('csv')
    setFeedback(null)
    try {
      const csv = await exportUserShiftsCSV(userId)
      if (!csv) {
        setFeedback({ type: 'error', msg: 'Aucune intervention à exporter.' })
        setExporting(null)
        return
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unilien-planning-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setFeedback({ type: 'success', msg: 'Export CSV téléchargé.' })
    } catch (err) {
      logger.error('Erreur export CSV:', err)
      setFeedback({ type: 'error', msg: 'Erreur lors de l\'export.' })
    } finally {
      setExporting(null)
    }
  }

  const downloadIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Données"
        subtitle="Export, import et gestion de vos données personnelles."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Export des données</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={3} align="start">
            <GhostButton size="sm" w="fit-content" gap={2} onClick={handleExportJSON} disabled={exporting !== null}>
              {downloadIcon}
              {exporting === 'json' ? 'Export en cours…' : 'Exporter toutes les données (JSON)'}
            </GhostButton>
            <GhostButton size="sm" w="fit-content" gap={2} onClick={handleExportCSV} disabled={exporting !== null}>
              {downloadIcon}
              {exporting === 'csv' ? 'Export en cours…' : 'Exporter le planning (CSV)'}
            </GhostButton>
          </VStack>
        </Card.Body>
      </Card.Root>

      <HealthConsentCard />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm" opacity={0.6}>
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <HStack gap={2}>
            <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Confidentialité</Card.Title>
            <Badge size="sm" colorPalette="gray">Bientôt</Badge>
          </HStack>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Analyses anonymisées"
              description="Contribuez à améliorer Unilien en partageant des données d'usage anonymisées."
              checked={true}
              onChange={() => {}}
              disabled
            />
            <ToggleRow
              label="Cookies de performance"
              description="Cookies pour optimiser les temps de chargement."
              checked={true}
              onChange={() => {}}
              disabled
            />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

export default SettingsPage
