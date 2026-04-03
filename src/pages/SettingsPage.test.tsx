import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { SettingsPage } from './SettingsPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn().mockReturnValue({
    isSupported: true, isConfigured: true, permission: 'default',
    isSubscribed: false, isLoading: false, error: null,
    subscribe: vi.fn().mockResolvedValue(true), unsubscribe: vi.fn().mockResolvedValue(true),
    requestPermission: vi.fn(), showNotification: vi.fn(),
  }),
}))

vi.mock('@/services/profileService', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg' }),
  deleteAvatar: vi.fn().mockResolvedValue(undefined),
  validateAvatarFile: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@test.com' } } }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
        enroll: vi.fn().mockResolvedValue({ data: null, error: null }),
        challenge: vi.fn().mockResolvedValue({ data: null, error: null }),
        verify: vi.fn().mockResolvedValue({ error: null }),
        unenroll: vi.fn().mockResolvedValue({ error: null }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
      },
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ or: vi.fn().mockResolvedValue({ data: [] }) }) }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// AccessibilitySection n'est plus importée par SettingsPage (panel inline)

import { useAuth } from '@/hooks/useAuth'

const mockUseAuth = vi.mocked(useAuth)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Spinner si pas de profil ──

  it('affiche un Spinner quand profile est null', () => {
    mockUseAuth.mockReturnValue({ profile: null, userRole: null } as ReturnType<typeof useAuth>)
    renderWithProviders(<SettingsPage />)
    expect(screen.getByTestId('layout')).toBeInTheDocument()
    expect(screen.queryByText('Informations')).not.toBeInTheDocument()
  })

  // ── Navigation par panneaux ──

  describe('Navigation', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche les sections de navigation pour un employeur', () => {
      renderWithProviders(<SettingsPage />)
      expect(screen.getAllByText('Informations').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Sécurité').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Abonnement')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Convention')).toBeInTheDocument()
      expect(screen.getByText('Apparence')).toBeInTheDocument()
      expect(screen.getAllByText('Accessibilité').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Données')).toBeInTheDocument()
    })

    it('masque Abonnement et Convention pour un employee', () => {
      const profile = createMockProfile({ role: 'employee' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employee' } as ReturnType<typeof useAuth>)
      renderWithProviders(<SettingsPage />)
      expect(screen.queryByText('Abonnement')).not.toBeInTheDocument()
      expect(screen.queryByText('Convention')).not.toBeInTheDocument()
      expect(screen.queryByText('PCH')).not.toBeInTheDocument()
    })

    it('affiche PCH pour un caregiver', () => {
      const profile = createMockProfile({ role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'caregiver' } as ReturnType<typeof useAuth>)
      renderWithProviders(<SettingsPage />)
      expect(screen.getByText('PCH')).toBeInTheDocument()
      expect(screen.queryByText('Abonnement')).not.toBeInTheDocument()
      expect(screen.queryByText('Convention')).not.toBeInTheDocument()
    })

    it('change de panneau au clic sur un item de navigation', () => {
      renderWithProviders(<SettingsPage />)
      // Par défaut on est sur Profil
      expect(screen.getByText('Informations personnelles')).toBeInTheDocument()

      // Clic sur Sécurité
      fireEvent.click(screen.getByText('Sécurité'))
      expect(screen.getByText('Changer le mot de passe')).toBeInTheDocument()
    })
  })

  // ── Panneau Profil ──

  describe('Panneau Informations', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer', firstName: 'Marie', lastName: 'Fontaine' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche le formulaire d\'informations personnelles', () => {
      renderWithProviders(<SettingsPage />)
      expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
      expect(screen.getByText('Langue et format')).toBeInTheDocument()
    })

    it('affiche les boutons Annuler et Enregistrer', () => {
      renderWithProviders(<SettingsPage />)
      expect(screen.getByText('Annuler')).toBeInTheDocument()
      expect(screen.getAllByText('Enregistrer').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Panneau Sécurité ──

  describe('Panneau Sécurité', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche les sections mot de passe, 2FA et zone de danger', async () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Sécurité'))

      expect(screen.getByText('Changer le mot de passe')).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Double authentification (2FA)')).toBeInTheDocument()
      })
      expect(screen.getByText('Zone de danger')).toBeInTheDocument()
    })

    it('affiche le bouton pour activer la 2FA', async () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Sécurité'))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activer la 2fa/i })).toBeInTheDocument()
      })
    })

    it('affiche les options de zone de danger', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Sécurité'))
      expect(screen.getByText('Supprimer toutes les données')).toBeInTheDocument()
      expect(screen.getByText('Supprimer le compte')).toBeInTheDocument()
    })

    it('affiche les boutons zone de danger actifs avec confirmation', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Sécurité'))
      const supprimerBtns = screen.getAllByRole('button', { name: 'Supprimer' })
      expect(supprimerBtns).toHaveLength(2)
      supprimerBtns.forEach((btn) => expect(btn).not.toBeDisabled())
    })
  })

  // ── Panneau Abonnement ──

  describe('Panneau Abonnement', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche le plan actuel et les barres d\'usage', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Abonnement'))
      expect(screen.getAllByText('Plan actuel').length).toBeGreaterThanOrEqual(1)
      // "Essentiel" apparait dans plan actuel + grille plans + historique
      expect(screen.getAllByText('Essentiel').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Illimité')).toBeInTheDocument()
    })

    it('affiche le plan Essentiel dans les plans disponibles', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Abonnement'))
      expect(screen.getByText('Plans disponibles')).toBeInTheDocument()
      expect(screen.getAllByText('Essentiel').length).toBeGreaterThanOrEqual(1)
    })

    it('affiche le moyen de paiement', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Abonnement'))
      expect(screen.getByText('Moyen de paiement')).toBeInTheDocument()
      expect(screen.getAllByText(/Visa ····/).length).toBeGreaterThanOrEqual(1)
    })

    it('affiche l\'historique de facturation', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Abonnement'))
      expect(screen.getByText('Historique de facturation')).toBeInTheDocument()
      expect(screen.getByText('3 mars 2026')).toBeInTheDocument()
    })
  })

  // ── Panneau Notifications ──

  describe('Panneau Notifications', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche les toggles push et email', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Notifications'))
      expect(screen.getByText('Notifications push')).toBeInTheDocument()
      expect(screen.getByText('Notifications e-mail')).toBeInTheDocument()
      expect(screen.getByText('Activer les notifications push')).toBeInTheDocument()
      expect(screen.getByText('Activer les e-mails')).toBeInTheDocument()
    })
  })

  // ── Panneau Convention ──

  describe('Panneau Convention', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche les règles de validation et majorations', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Convention'))
      expect(screen.getByText('Règles de validation')).toBeInTheDocument()
      expect(screen.getByText('Majorations par défaut')).toBeInTheDocument()
      expect(screen.getByText(/Pause obligatoire/)).toBeInTheDocument()
    })
  })

  // ── Panneau PCH ──

  describe('Panneau PCH', () => {
    it('affiche les alertes PCH et l\'IBAN pour un caregiver', () => {
      const profile = createMockProfile({ role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'caregiver' } as ReturnType<typeof useAuth>)
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('PCH'))
      expect(screen.getByText('Alertes PCH')).toBeInTheDocument()
      expect(screen.getByText('IBAN de versement')).toBeInTheDocument()
      expect(screen.getByText('Quota atteint à 90 %')).toBeInTheDocument()
    })
  })

  // ── Panneau Apparence ──

  describe('Panneau Apparence', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche le toggle mode sombre et la densité', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Apparence'))
      expect(screen.getByText('Mode sombre')).toBeInTheDocument()
      expect(screen.getByText('Densité de l\'interface')).toBeInTheDocument()
      expect(screen.getByText('Confortable')).toBeInTheDocument()
      expect(screen.getByText('Compact')).toBeInTheDocument()
    })
  })

  // ── Panneau Accessibilité ──

  describe('Panneau Accessibilité', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('rend le panneau Accessibilité inline', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Accessibilité'))
      expect(screen.getByText('Contraste élevé')).toBeInTheDocument()
      expect(screen.getByText('Texte agrandi')).toBeInTheDocument()
    })
  })

  // ── Panneau Données ──

  describe('Panneau Données', () => {
    beforeEach(() => {
      const profile = createMockProfile({ role: 'employer' })
      mockUseAuth.mockReturnValue({ profile, userRole: 'employer' } as ReturnType<typeof useAuth>)
    })

    it('affiche les boutons d\'export et les toggles de confidentialité', () => {
      renderWithProviders(<SettingsPage />)
      fireEvent.click(screen.getByText('Données'))
      expect(screen.getByText('Export des données')).toBeInTheDocument()
      expect(screen.getByText(/Exporter toutes les données/)).toBeInTheDocument()
      expect(screen.getByText(/Exporter le planning/)).toBeInTheDocument()
      expect(screen.getByText('Confidentialité')).toBeInTheDocument()
      expect(screen.getByText('Analyses anonymisées')).toBeInTheDocument()
    })
  })
})
