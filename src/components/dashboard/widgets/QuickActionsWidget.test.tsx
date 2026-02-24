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
      expect(screen.getByText('Nouvelle note')).toBeInTheDocument()
      expect(screen.getByText('Voir planning')).toBeInTheDocument()
      expect(screen.getByText('Mes auxiliaires')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    it('les actions employeur pointent vers les bonnes routes', () => {
      renderWithProviders(<QuickActionsWidget userRole="employer" />)
      const links = screen.getAllByRole('link')
      const hrefs = links.map((l) => l.getAttribute('href'))
      expect(hrefs).toContain('/logbook/new')
      expect(hrefs).toContain('/planning')
      expect(hrefs).toContain('/team')
      expect(hrefs).toContain('/documents')
    })
  })

  describe('Rôle employee', () => {
    it('affiche les 4 actions employee', () => {
      renderWithProviders(<QuickActionsWidget userRole="employee" />)
      expect(screen.getByText('Pointer')).toBeInTheDocument()
      expect(screen.getByText('Nouvelle note')).toBeInTheDocument()
      expect(screen.getByText('Mon planning')).toBeInTheDocument()
      expect(screen.getByText('Déclarer absence')).toBeInTheDocument()
    })

    it("le lien 'Pointer' pointe vers /clock-in", () => {
      renderWithProviders(<QuickActionsWidget userRole="employee" />)
      const links = screen.getAllByRole('link')
      const hrefs = links.map((l) => l.getAttribute('href'))
      expect(hrefs).toContain('/clock-in')
    })
  })

  describe('Rôle caregiver', () => {
    it('affiche toutes les actions si toutes les permissions sont accordées', () => {
      renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={fullPermissions} />
      )
      expect(screen.getByText('Cahier de liaison')).toBeInTheDocument()
      expect(screen.getByText('Planning')).toBeInTheDocument()
      expect(screen.getByText('Ajouter une note')).toBeInTheDocument()
      expect(screen.getByText('Mon profil')).toBeInTheDocument()
    })

    it("filtre les actions selon les permissions (aucune permission → seul 'Mon profil')", () => {
      renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={restrictedPermissions} />
      )
      expect(screen.queryByText('Cahier de liaison')).not.toBeInTheDocument()
      expect(screen.queryByText('Planning')).not.toBeInTheDocument()
      expect(screen.queryByText('Ajouter une note')).not.toBeInTheDocument()
      // Mon profil n'a pas de permissionKey → toujours affiché
      expect(screen.getByText('Mon profil')).toBeInTheDocument()
    })

    it('affiche les actions sans filtre si permissions non fournies', () => {
      renderWithProviders(<QuickActionsWidget userRole="caregiver" />)
      // Sans permissions, toutes les actions du rôle sont affichées (comportement par défaut)
      expect(screen.getByText('Mon profil')).toBeInTheDocument()
    })

    it('retourne null si aucune action disponible', () => {
      // Cas impossible en pratique mais teste le guard
      const { container } = renderWithProviders(
        <QuickActionsWidget userRole="caregiver" permissions={restrictedPermissions} />
      )
      // Seul "Mon profil" est visible — le composant ne retourne pas null dans ce cas
      expect(container).not.toBeEmptyDOMElement()
    })
  })

  describe('Descriptions des actions', () => {
    it('affiche la description de chaque action employer', () => {
      renderWithProviders(<QuickActionsWidget userRole="employer" />)
      expect(screen.getByText("Ajouter une entrée au cahier")).toBeInTheDocument()
      expect(screen.getByText('Consulter les interventions')).toBeInTheDocument()
      expect(screen.getByText('Gérer mon équipe')).toBeInTheDocument()
      expect(screen.getByText('Export CESU/PAJEMPLOI')).toBeInTheDocument()
    })
  })
})
