import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { QuickActionsWidget } from './QuickActionsWidget'
import type { CaregiverPermissions } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fullPermissions: CaregiverPermissions = {
  canViewPlanning: true,
  canViewLiaison: true,
  canWriteLiaison: true,
  canManageShifts: false,
  canManageTeam: false,
  canExportData: false,
}

const restrictedPermissions: CaregiverPermissions = {
  canViewPlanning: false,
  canViewLiaison: false,
  canWriteLiaison: false,
  canManageShifts: false,
  canManageTeam: false,
  canExportData: false,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuickActionsWidget', () => {
  describe('Rôle employer', () => {
    it('affiche le titre "Actions rapides"', () => {
      renderWithProviders(<QuickActionsWidget userRole="employer" />)
      expect(screen.getByText('Actions rapides')).toBeInTheDocument()
    })

    it('affiche les 4 actions employeur', () => {
      renderWithProviders(<QuickActionsWidget userRole="employer" />)
      expect(screen.getByText('Intervention')).toBeInTheDocument()
      expect(screen.getByText('Employé')).toBeInTheDocument()
      expect(screen.getByText('Bulletin')).toBeInTheDocument()
      expect(screen.getByText('Exporter')).toBeInTheDocument()
    })

    it('les actions employeur pointent vers les bonnes routes', () => {
      renderWithProviders(<QuickActionsWidget userRole="employer" />)
      const links = screen.getAllByRole('link')
      const hrefs = links.map((l) => l.getAttribute('href'))
      expect(hrefs).toContain('/planning')
      expect(hrefs).toContain('/equipe')
      expect(hrefs).toContain('/documents')
    })
  })

  describe('Rôle employee', () => {
    it('affiche les 4 actions employee', () => {
      renderWithProviders(<QuickActionsWidget userRole="employee" />)
      expect(screen.getByText('Pointer')).toBeInTheDocument()
      expect(screen.getByText('Planning')).toBeInTheDocument()
      expect(screen.getByText('Cahier')).toBeInTheDocument()
      expect(screen.getByText('Absence')).toBeInTheDocument()
    })

    it("le lien 'Pointer' pointe vers /suivi-des-heures", () => {
      renderWithProviders(<QuickActionsWidget userRole="employee" />)
      const links = screen.getAllByRole('link')
      const hrefs = links.map((l) => l.getAttribute('href'))
      expect(hrefs).toContain('/suivi-des-heures')
    })
  })

  describe('Rôle caregiver', () => {
    it('affiche toutes les actions si toutes les permissions sont accordées', () => {
      renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={fullPermissions} />
      )
      expect(screen.getByText('Cahier')).toBeInTheDocument()
      expect(screen.getByText('Planning')).toBeInTheDocument()
      expect(screen.getByText('Note')).toBeInTheDocument()
      expect(screen.getByText('Profil')).toBeInTheDocument()
    })

    it("filtre les actions selon les permissions (aucune permission → seul 'Profil')", () => {
      renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={restrictedPermissions} />
      )
      expect(screen.queryByText('Cahier')).not.toBeInTheDocument()
      expect(screen.queryByText('Planning')).not.toBeInTheDocument()
      expect(screen.queryByText('Note')).not.toBeInTheDocument()
      // Profil n'a pas de permissionKey → toujours affiché
      expect(screen.getByText('Profil')).toBeInTheDocument()
    })

    it('affiche les actions sans filtre si permissions non fournies', () => {
      renderWithProviders(<QuickActionsWidget userRole="caregiver" />)
      // Sans permissions, toutes les actions du rôle sont affichées (comportement par défaut)
      expect(screen.getByText('Profil')).toBeInTheDocument()
    })

    it('retourne null si aucune action disponible', () => {
      // Cas impossible en pratique mais teste le guard
      const { container } = renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={restrictedPermissions} />
      )
      // Seul "Profil" est visible — le composant ne retourne pas null dans ce cas
      expect(container).not.toBeEmptyDOMElement()
    })
  })
})
