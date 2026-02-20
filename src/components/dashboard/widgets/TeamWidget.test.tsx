import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { TeamWidget } from './TeamWidget'
import type { AuxiliarySummary } from '@/services/auxiliaryService'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetActiveAuxiliariesForEmployer = vi.fn()

vi.mock('@/services/auxiliaryService', () => ({
  getActiveAuxiliariesForEmployer: (...args: unknown[]) =>
    mockGetActiveAuxiliariesForEmployer(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAuxiliary(
  index: number,
  overrides: Partial<AuxiliarySummary> = {}
): AuxiliarySummary {
  return {
    id: `aux-${index}`,
    firstName: `Prénom${index}`,
    lastName: `Nom${index}`,
    phone: `061234567${index}`,
    qualifications: ['DEAVS'],
    contractType: 'CDI',
    contractStatus: 'active',
    weeklyHours: 35,
    hourlyRate: 12.5,
    contractStartDate: new Date('2024-01-01'),
    contractId: `contract-${index}`,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TeamWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('État loading', () => {
    it('affiche un spinner pendant le chargement', () => {
      mockGetActiveAuxiliariesForEmployer.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      expect(screen.getByText('Mon équipe')).toBeInTheDocument()
    })

    it('appelle le service avec le bon employerId', async () => {
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue([])
      renderWithProviders(<TeamWidget employerId="employer-99" />)
      await waitFor(() => {
        expect(mockGetActiveAuxiliariesForEmployer).toHaveBeenCalledWith('employer-99')
      })
    })
  })

  describe('Liste vide', () => {
    beforeEach(() => {
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue([])
    })

    it('affiche "Aucun auxiliaire actif"', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/aucun auxiliaire actif/i)).toBeInTheDocument()
      })
    })

    it('affiche un lien pour ajouter un auxiliaire', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/ajouter un auxiliaire/i)).toBeInTheDocument()
      })
    })
  })

  describe('Avec des auxiliaires', () => {
    const auxiliaries = [
      makeAuxiliary(1),
      makeAuxiliary(2, { contractType: 'CDD', weeklyHours: 20, phone: undefined }),
    ]

    beforeEach(() => {
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue(auxiliaries)
    })

    it('affiche les noms des auxiliaires', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Prénom1 Nom1')).toBeInTheDocument()
        expect(screen.getByText('Prénom2 Nom2')).toBeInTheDocument()
      })
    })

    it('affiche le type de contrat', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('CDI')).toBeInTheDocument()
        expect(screen.getByText('CDD')).toBeInTheDocument()
      })
    })

    it('affiche les heures hebdomadaires', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('35h/sem')).toBeInTheDocument()
        expect(screen.getByText('20h/sem')).toBeInTheDocument()
      })
    })

    it('affiche le téléphone si disponible', async () => {
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('0612345671')).toBeInTheDocument()
      })
    })
  })

  describe('Overflow +N auxiliaires', () => {
    it('affiche "+N autres" si plus de 4 auxiliaires', async () => {
      const many = Array.from({ length: 6 }, (_, i) => makeAuxiliary(i + 1))
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue(many)
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/\+2 autres/i)).toBeInTheDocument()
      })
    })

    it('affiche "+N autre" au singulier si overflow = 1', async () => {
      const five = Array.from({ length: 5 }, (_, i) => makeAuxiliary(i + 1))
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue(five)
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('+1 autre')).toBeInTheDocument()
      })
    })

    it('affiche au maximum 4 auxiliaires', async () => {
      const many = Array.from({ length: 6 }, (_, i) => makeAuxiliary(i + 1))
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue(many)
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        // 4 lignes Prénom/Nom visibles (la 5e et 6e sont masquées)
        const names = screen.getAllByText(/Prénom\d Nom\d/)
        expect(names).toHaveLength(4)
      })
    })
  })

  describe('Liens de navigation', () => {
    it('affiche le lien "Voir tout" vers /team', async () => {
      mockGetActiveAuxiliariesForEmployer.mockResolvedValue([])
      renderWithProviders(<TeamWidget employerId="employer-1" />)
      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const teamLink = links.find((l) => l.getAttribute('href') === '/team')
        expect(teamLink).toBeInTheDocument()
      })
    })
  })
})
