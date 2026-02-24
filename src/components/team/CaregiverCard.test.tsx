import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { CaregiverCard } from './CaregiverCard'
import type { CaregiverWithProfile } from '@/services/caregiverService'
import type { CaregiverPermissions } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePermissions(overrides: Partial<CaregiverPermissions> = {}): CaregiverPermissions {
  return {
    canViewPlanning: false,
    canEditPlanning: false,
    canViewLiaison: false,
    canWriteLiaison: false,
    canManageTeam: false,
    canExportData: false,
    ...overrides,
  }
}

function makeCaregiver(overrides: Partial<CaregiverWithProfile> = {}): CaregiverWithProfile {
  return {
    profileId: 'profile-1',
    employerId: 'employer-1',
    permissions: makePermissions(),
    createdAt: new Date('2026-01-01'),
    profile: {
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie.dupont@example.com',
    },
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CaregiverCard', () => {
  describe('Informations de base', () => {
    it('affiche le prénom et le nom', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    })

    it('affiche l\'email', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('marie.dupont@example.com')).toBeInTheDocument()
    })

    it('affiche le téléphone si fourni', () => {
      const caregiver = makeCaregiver({
        profile: {
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie.dupont@example.com',
          phone: '06 12 34 56 78',
        },
      })
      renderWithProviders(
        <CaregiverCard caregiver={caregiver} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument()
    })

    it('n\'affiche pas de téléphone si absent', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.queryByText(/06/)).not.toBeInTheDocument()
    })

    it('affiche le lien de parenté (relationship) si fourni', () => {
      const caregiver = makeCaregiver({ relationship: 'Fille' })
      renderWithProviders(
        <CaregiverCard caregiver={caregiver} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('Fille')).toBeInTheDocument()
    })

    it('n\'affiche pas de relationship tag si absent', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      // Pas de tag de parenté dans le DOM
      expect(screen.queryByText(/Fille|Fils|Époux/)).not.toBeInTheDocument()
    })
  })

  describe('Permissions', () => {
    it('affiche le tag "Planning" si canViewPlanning=true', () => {
      const caregiver = makeCaregiver({
        permissions: makePermissions({ canViewPlanning: true }),
      })
      renderWithProviders(
        <CaregiverCard caregiver={caregiver} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('Planning')).toBeInTheDocument()
    })

    it('affiche le tag "Liaison" si canViewLiaison=true', () => {
      const caregiver = makeCaregiver({
        permissions: makePermissions({ canViewLiaison: true }),
      })
      renderWithProviders(
        <CaregiverCard caregiver={caregiver} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('Liaison')).toBeInTheDocument()
    })

    it('affiche le tag "Export" si canExportData=true', () => {
      const caregiver = makeCaregiver({
        permissions: makePermissions({ canExportData: true }),
      })
      renderWithProviders(
        <CaregiverCard caregiver={caregiver} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('n\'affiche aucun tag si aucune permission active', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.queryByText('Planning')).not.toBeInTheDocument()
      expect(screen.queryByText('Liaison')).not.toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('affiche le bouton "Modifier les permissions"', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByRole('button', { name: /modifier les permissions/i })).toBeInTheDocument()
    })

    it('affiche le bouton "Retirer l\'aidant"', () => {
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={vi.fn()} />
      )
      expect(screen.getByRole('button', { name: /retirer l'aidant/i })).toBeInTheDocument()
    })

    it('appelle onEdit au clic sur Modifier', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={onEdit} onRemove={vi.fn()} />
      )
      await user.click(screen.getByRole('button', { name: /modifier les permissions/i }))
      expect(onEdit).toHaveBeenCalledOnce()
    })

    it('appelle onRemove au clic sur Retirer', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()
      renderWithProviders(
        <CaregiverCard caregiver={makeCaregiver()} onEdit={vi.fn()} onRemove={onRemove} />
      )
      await user.click(screen.getByRole('button', { name: /retirer l'aidant/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })
})
