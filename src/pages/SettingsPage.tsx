/**
 * Page Paramètres — navigation latérale + 9 panneaux
 *
 * Panneaux :
 *  Compte  : Profil, Sécurité, Abonnement (employer)
 *  Application : Notifications, Convention (employer), PCH (caregiver), Apparence, Accessibilité
 *  Avancé : Données
 */

import React, { useState } from 'react'
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
import { useAccessibilityStore } from '@/stores/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId =
  | 'profil'
  | 'securite'
  | 'abonnement'
  | 'notifications'
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
  const [activePanel, setActivePanel] = useState<PanelId>('profil')

  if (!profile) {
    return (
      <DashboardLayout title="Paramètres">
        <Center py={12}><Spinner size="lg" color="brand.500" /></Center>
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
        {/* Navigation latérale */}
        <Box
          minW={{ md: '210px' }}
          w={{ base: '100%', md: '210px' }}
          flexShrink={0}
          borderRightWidth={{ base: '0', md: '1px' }}
          borderBottomWidth={{ base: '1px', md: '0' }}
          borderColor="border.default"
          bg="bg.surface"
          py={{ base: 0, md: 3 }}
          position={{ base: 'relative', md: 'absolute' }}
          top={{ md: '0' }}
          left={{ md: '0' }}
          bottom={{ md: '0' }}
          overflowY={{ md: 'auto' }}
        >
          <Box
            overflowX={{ base: 'auto', md: 'visible' }}
            display={{ base: 'flex', md: 'block' }}
            gap={0}
            pb={{ base: 0, md: 0 }}
            css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
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
                      color={activePanel === item.id ? 'brand.500' : 'text.muted'}
                      bg={activePanel === item.id ? 'brand.subtle' : 'transparent'}
                      onClick={() => setActivePanel(item.id)}
                      whiteSpace="nowrap"
                      gap={2}
                      borderRadius="6px"
                      fontSize="sm"
                      px={5}
                      py="9px"
                      h="auto"
                      mx="5px"
                      w={{ md: 'calc(100% - 10px)' }}
                      _hover={{ bg: 'brand.subtle', color: 'text.default' }}
                      transition="background 0.15s ease, color 0.15s ease"
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
        <Box ml={{ base: 0, md: '210px' }} minW={0} p={6}>
          {activePanel === 'profil' && <ProfilPanel profile={profile} />}
          {activePanel === 'securite' && <SecuritePanel />}
          {activePanel === 'abonnement' && <AbonnementPanel />}
          {activePanel === 'notifications' && <NotificationsPanel />}
          {activePanel === 'convention' && <ConventionPanel />}
          {activePanel === 'pch' && <PchPanel />}
          {activePanel === 'apparence' && <ApparencePanel />}
          {activePanel === 'accessibilite' && <AccessibilitePanel />}
          {activePanel === 'donnees' && <DonneesPanel />}
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
          bg={checked ? '#9BB23B' : '#D8E3ED'}
          css={{
            '&[data-state=checked]': { background: '#9BB23B' },
            '&[data-state=unchecked]': { background: '#D8E3ED' },
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

function ProfilPanel({ profile }: { profile: { firstName: string; lastName: string; email: string; phone?: string | null } }) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [address, setAddress] = useState('')
  const [lang, setLang] = useState('fr')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Informations"
        subtitle="Gérez vos informations personnelles et les détails de votre compte."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Informations personnelles</Card.Title>
          <Text fontSize="xs" color="text.muted" mt="3px">Ces informations apparaissent sur vos documents exportés.</Text>
        </Card.Header>
        <Card.Body p={4}>
          {/* Avatar */}
          <HStack gap={4} mb={6}>
            <Box
              w="72px"
              h="72px"
              borderRadius="full"
              bg="brand.500"
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="1.6rem"
              fontWeight="800"
              flexShrink={0}
              aria-label={`Avatar ${firstName} ${lastName}`}
            >
              {firstName.charAt(0)}{lastName.charAt(0)}
            </Box>
            <VStack gap={2} align="start">
              <Button variant="ghost" size="sm" borderWidth="1.5px" borderColor="border.default">
                Changer la photo
              </Button>
              <Button variant="ghost" size="sm" color="red.600" borderWidth="1.5px" borderColor="red.200" _hover={{ bg: 'red.50', borderColor: 'red.500' }}>
                Supprimer
              </Button>
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
              <Field.Label>Adresse</Field.Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              <Field.HelperText>Utilisée pour les bulletins de paie.</Field.HelperText>
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <Button variant="ghost" size="sm" fontWeight="600" borderWidth="1.5px" borderColor="border.default" borderRadius="md">Annuler</Button>
            <Button size="sm" fontWeight="600" borderRadius="md" px={5} bg="#3D5166" color="white" boxShadow="sm" _hover={{ bg: '#2E3F50', boxShadow: 'md', transform: 'translateY(-1px)' }} _active={{ transform: 'translateY(0)' }}>Enregistrer</Button>
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
            <Button size="sm" fontWeight="600" borderRadius="md" px={5} bg="#3D5166" color="white" boxShadow="sm" _hover={{ bg: '#2E3F50', boxShadow: 'md', transform: 'translateY(-1px)' }} _active={{ transform: 'translateY(0)' }}>Enregistrer</Button>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Sécurité ──────────────────────────────────────────────────────────────────

function SecuritePanel() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Sécurité"
        subtitle="Gérez votre mot de passe et la sécurité de votre compte."
      />

      {/* Mot de passe */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Changer le mot de passe</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Mot de passe actuel</Field.Label>
              <Input type="password" placeholder="••••••••••••" autoComplete="current-password" />
            </Field.Root>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Field.Root>
                <Field.Label>Nouveau mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" />
                <Field.HelperText>Minimum 12 caractères, dont 1 majuscule et 1 chiffre.</Field.HelperText>
              </Field.Root>
              <Field.Root>
                <Field.Label>Confirmer le mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" />
              </Field.Root>
            </Grid>
            <HStack justify="flex-end">
              <Button size="sm" fontWeight="600" borderRadius="md" px={5} bg="#3D5166" color="white" boxShadow="sm" _hover={{ bg: '#2E3F50', boxShadow: 'md', transform: 'translateY(-1px)' }} _active={{ transform: 'translateY(0)' }}>Mettre à jour</Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* 2FA */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Double authentification (2FA)</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <ToggleRow
            label="Activer la 2FA"
            description="Protégez votre compte avec Google Authenticator, Authy ou tout autre app d'authentification."
            checked={twoFaEnabled}
            onChange={setTwoFaEnabled}
          />
        </Card.Body>
      </Card.Root>

      {/* Zone de danger */}
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="red.200" boxShadow="sm">
        <Card.Header bg="red.50" borderBottomWidth="1px" borderColor="red.200">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700" color="red.600">Zone de danger</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Supprimer toutes les données</Text>
                <Text fontSize="xs" color="text.muted">Efface définitivement les interventions et données employés.</Text>
              </Box>
              <Button
                colorPalette="red"
                size="xs"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Supprimer
              </Button>
            </HStack>
            {showDeleteConfirm && (
              <Box p={4} bg="red.50" borderRadius="10px">
                <Text fontSize="sm" mb={2}>
                  Tapez <strong>SUPPRIMER</strong> pour confirmer
                </Text>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  size="sm"
                  mb={2}
                />
                <HStack gap={2}>
                  <Button
                    colorPalette="red"
                    size="xs"
                    disabled={deleteConfirmText !== 'SUPPRIMER'}
                  >
                    Supprimer définitivement
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                  >
                    Annuler
                  </Button>
                </HStack>
              </Box>
            )}
            <Separator />
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontWeight="medium" fontSize="sm">Désactiver le compte</Text>
                <Text fontSize="xs" color="text.muted">Votre compte sera suspendu. Les données restent 30 jours.</Text>
              </Box>
              <Button colorPalette="red" size="xs" variant="outline">
                Désactiver
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Abonnement ────────────────────────────────────────────────────────────────

function AbonnementPanel() {
  const currentPlan = 'Essentiel'

  const plans = [
    {
      name: 'Gratuit',
      price: '0 €',
      desc: 'Pour découvrir Unilien.',
      features: ['1 employé', 'Planning basique', 'Pointage horaire'],
      disabled: ['Bulletins de paie', 'Conformité IDCC'],
      isCurrent: false,
      cta: 'Rétrograder',
    },
    {
      name: 'Essentiel',
      price: '9,90 €',
      desc: 'Pour les familles employeurs.',
      features: ['3 employés', 'Bulletins de paie', 'Conformité IDCC 3239', 'Export planning', 'Cahier de liaison'],
      disabled: [],
      isCurrent: true,
      cta: 'Plan actuel',
    },
    {
      name: 'Pro',
      price: '24,90 €',
      desc: 'Pour les aidants professionnels.',
      features: ['Employés illimités', "Tout l'Essentiel", 'Exports avancés', 'Multi-comptes', 'Support prioritaire'],
      disabled: [],
      isCurrent: false,
      cta: 'Passer au Pro',
      recommended: true,
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
            <UsageBar label="Employés" value="3 / 3" percent={100} />
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
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
            {plans.map((plan) => (
              <Box
                key={plan.name}
                borderWidth="2px"
                borderColor={plan.isCurrent ? 'brand.500' : 'gray.200'}
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

function NotificationsPanel() {
  const [pushReminders, setPushReminders] = useState(true)
  const [pushCompliance, setPushCompliance] = useState(true)
  const [pushLeave, setPushLeave] = useState(true)
  const [pushWeekly, setPushWeekly] = useState(false)
  const [emailPayslips, setEmailPayslips] = useState(true)
  const [emailSecurity, setEmailSecurity] = useState(true)
  const [emailMessages, setEmailMessages] = useState(false)

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
            <ToggleRow label="Rappels d'intervention" description="30 minutes avant le début d'une intervention." checked={pushReminders} onChange={setPushReminders} />
            <ToggleRow label="Alertes de conformité" description="Notifications immédiates en cas de non-conformité détectée." checked={pushCompliance} onChange={setPushCompliance} />
            <ToggleRow label="Congés à solder" description="Rappel 30 jours avant expiration des congés payés." checked={pushLeave} onChange={setPushLeave} />
            <ToggleRow label="Résumé hebdomadaire" description="Récapitulatif des heures et de la conformité chaque lundi." checked={pushWeekly} onChange={setPushWeekly} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Notifications e-mail</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Bulletins de paie générés" description="Envoi automatique par e-mail après génération." checked={emailPayslips} onChange={setEmailPayslips} />
            <ToggleRow label="Alertes de sécurité" description="Connexion depuis un nouvel appareil ou une nouvelle localisation." checked={emailSecurity} onChange={setEmailSecurity} />
            <ToggleRow label="Nouveaux messages" description="Notification par e-mail quand vous recevez un nouveau message." checked={emailMessages} onChange={setEmailMessages} />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── Convention ─────────────────────────────────────────────────────────────────

function ConventionPanel() {
  const [ruleBreak, setRuleBreak] = useState(true)
  const [ruleDailyMax, setRuleDailyMax] = useState(true)
  const [ruleOvertime, setRuleOvertime] = useState(true)
  const [ruleNight, setRuleNight] = useState(true)

  const [majDimanche, setMajDimanche] = useState('30')
  const [majFerie, setMajFerie] = useState('60')
  const [majNuit, setMajNuit] = useState('25')
  const [majSupp, setMajSupp] = useState('25')

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Convention collective"
        subtitle="Paramètres de conformité liés à l'IDCC 3239 — Particuliers employeurs et emploi à domicile."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Règles de validation</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow label="Pause obligatoire (Art. L3121-16)" description="Alerte si aucune pause de 20 min pour une intervention supérieure à 6h." checked={ruleBreak} onChange={setRuleBreak} />
            <ToggleRow label="Durée maximale journalière" description="Avertissement si le total dépasse 10h par jour." checked={ruleDailyMax} onChange={setRuleDailyMax} />
            <ToggleRow label="Heures supplémentaires" description="Calcul automatique des majorations au-delà de 40h/semaine." checked={ruleOvertime} onChange={setRuleOvertime} />
            <ToggleRow label="Présence nuit / Garde 24h" description="Alerte si la présence de nuit dépasse 12h consécutives." checked={ruleNight} onChange={setRuleNight} />
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
              <Input type="number" min={0} max={100} value={majDimanche} onChange={(e) => setMajDimanche(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration jour férié (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majFerie} onChange={(e) => setMajFerie(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration nuit (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majNuit} onChange={(e) => setMajNuit(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Majoration heures sup (%)</Field.Label>
              <Input type="number" min={0} max={100} value={majSupp} onChange={(e) => setMajSupp(e.target.value)} />
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <Button variant="ghost" size="sm" fontWeight="600" borderWidth="1.5px" borderColor="border.default" borderRadius="md">Réinitialiser</Button>
            <Button size="sm" fontWeight="600" borderRadius="md" px={5} bg="#3D5166" color="white" boxShadow="sm" _hover={{ bg: '#2E3F50', boxShadow: 'md', transform: 'translateY(-1px)' }} _active={{ transform: 'translateY(0)' }}>Enregistrer</Button>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

// ── PCH ───────────────────────────────────────────────────────────────────────

function PchPanel() {
  const [alertQuota, setAlertQuota] = useState(true)
  const [alertRenewal, setAlertRenewal] = useState(true)
  const [alertAttestation, setAlertAttestation] = useState(true)
  const [alertReleve, setAlertReleve] = useState(true)

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
            <ToggleRow label="Quota atteint à 90 %" description="Alerte quand vous approchez du plafond mensuel PCH (55h36 sur 62h)." checked={alertQuota} onChange={setAlertQuota} />
            <ToggleRow label="Rappel renouvellement PCH" description="Notification 3 mois avant l'expiration de votre accord MDPH." checked={alertRenewal} onChange={setAlertRenewal} />
            <ToggleRow label="Attestation annuelle à signer" description="Rappel 30 jours avant la date limite de renouvellement de l'attestation." checked={alertAttestation} onChange={setAlertAttestation} />
            <ToggleRow label="Relevé mensuel disponible" description="Notification quand le relevé d'heures du mois précédent est généré." checked={alertReleve} onChange={setAlertReleve} />
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
    </VStack>
  )
}

// ── Apparence ─────────────────────────────────────────────────────────────────

function ApparencePanel() {
  const [darkMode, setDarkMode] = useState(false)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

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
            checked={darkMode}
            onChange={setDarkMode}
          />
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Densité de l'interface</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={4}>
            {(['comfortable', 'compact'] as const).map((d) => (
              <Box
                key={d}
                flex={1}
                borderWidth="2px"
                borderColor={density === d ? 'brand.500' : 'gray.200'}
                borderRadius="10px"
                p={4}
                cursor="pointer"
                onClick={() => setDensity(d)}
                role="radio"
                aria-checked={density === d}
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
                  <Text fontSize="sm" fontWeight="600" color="#3D5166">{settings.textScale}%</Text>
                </HStack>
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={settings.textScale}
                  onChange={(e) => updateSettings({ textScale: Number(e.target.value) })}
                  aria-label="Taille du texte en pourcentage"
                  style={{ width: '100%', accentColor: '#3D5166' }}
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

function DonneesPanel() {
  const [analytics, setAnalytics] = useState(true)
  const [cookies, setCookies] = useState(true)

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Données"
        subtitle="Export, import et gestion de vos données personnelles."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Export des données</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={3} align="start">
            <Button
              variant="ghost" size="sm" w="fit-content"
              borderWidth="1.5px" borderColor="border.default" borderRadius="md"
              color="text.secondary" fontWeight="600"
              _hover={{ borderColor: '#3D5166', color: '#3D5166', bg: '#EDF1F5' }}
              gap={2}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter toutes les données (JSON)
            </Button>
            <Button
              variant="ghost" size="sm" w="fit-content"
              borderWidth="1.5px" borderColor="border.default" borderRadius="md"
              color="text.secondary" fontWeight="600"
              _hover={{ borderColor: '#3D5166', color: '#3D5166', bg: '#EDF1F5' }}
              gap={2}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter le planning (CSV)
            </Button>
            <Button
              variant="ghost" size="sm" w="fit-content"
              borderWidth="1.5px" borderColor="border.default" borderRadius="md"
              color="text.secondary" fontWeight="600"
              _hover={{ borderColor: '#3D5166', color: '#3D5166', bg: '#EDF1F5' }}
              gap={2}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter les bulletins de paie (ZIP)
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Confidentialité</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Analyses anonymisées"
              description="Contribuez à améliorer Unilien en partageant des données d'usage anonymisées."
              checked={analytics}
              onChange={setAnalytics}
            />
            <ToggleRow
              label="Cookies de performance"
              description="Cookies pour optimiser les temps de chargement."
              checked={cookies}
              onChange={setCookies}
            />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

export default SettingsPage
