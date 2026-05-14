/**
 * Page Paramètres — sidebar + 10 panneaux thématiques.
 *
 * Sections (cf. SettingsNavigation) :
 *  Compte      : Profil, Sécurité, Abonnement (employer)
 *  Application : Notifications, Interventions (employer), Convention (employer),
 *                PCH (caregiver), Apparence, Accessibilité
 *  Avancé      : Données
 *
 * Chaque panneau vit dans `src/components/settings/`.
 */

import { useState, useEffect } from 'react'
import { Box, Spinner, Center } from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth'
import {
  SettingsNavigation,
  panelFromHash,
  ProfilPanel,
  SecuritePanel,
  AbonnementPanel,
  NotificationsPanel,
  InterventionsPanel,
  ConventionPanel,
  PchPanel,
  ApparencePanel,
  AccessibilitePanel,
  DonneesPanel,
  type PanelId,
} from '@/components/settings'

export function SettingsPage() {
  const { profile, userRole } = useAuth()
  const [activePanel, setActivePanel] = useState<PanelId>(() => panelFromHash() ?? 'profil')

  // Permet à la nav vocale de switcher de panel via /parametres#apparence même
  // quand on est déjà sur la page (sans cet effect, navigate() change le hash
  // mais le state interne reste sur l'ancien panel).
  useEffect(() => {
    const onHashChange = () => {
      const next = panelFromHash()
      if (next) setActivePanel(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (!profile) {
    return (
      <DashboardLayout title="Paramètres">
        <Center py={12} role="status" aria-live="polite"><Spinner size="lg" color="brand.500" /></Center>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Paramètres">
      <Box
        position="relative"
        css={{ margin: 'calc(var(--chakra-spacing-6) * -1)' }}
        minH={{ md: 'calc(100vh - 60px)' }}
      >
        <SettingsNavigation
          activePanel={activePanel}
          onSelectPanel={setActivePanel}
          userRole={userRole ?? ''}
        />

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

export default SettingsPage
