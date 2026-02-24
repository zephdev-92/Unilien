import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { RecentLogsWidget } from './RecentLogsWidget'
import type { LogEntryWithAuthor } from '@/services/logbookService'
import type { LogEntry } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetRecentLogEntries = vi.fn()

vi.mock('@/services/logbookService', () => ({
  getRecentLogEntries: (...args: unknown[]) => mockGetRecentLogEntries(...args),
}))

// DOMPurify minimal pour les tests (jsdom ne l'a pas)
vi.mock('@/lib/sanitize', () => ({
  sanitizeText: (text: string) => text,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeLog(
  overrides: Partial<LogEntry & { author?: LogEntryWithAuthor['author'] }> = {}
): LogEntryWithAuthor {
  const now = new Date()
  return {
    id: `log-${Math.random()}`,
    employerId: 'employer-1',
    authorId: 'author-1',
    authorRole: 'employee',
    type: 'info',
    importance: 'normal',
    content: 'Intervention normale, RAS.',
    createdAt: now,
    updatedAt: now,
    author: { firstName: 'Marie', lastName: 'Martin' },
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecentLogsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('État loading', () => {
    it('affiche un spinner pendant le chargement', () => {
      mockGetRecentLogEntries.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      // Le spinner est présent (pas de contenu)
      expect(screen.queryByText(/aucune entrée/i)).not.toBeInTheDocument()
    })

    it('appelle le service avec employerId et limit=3', async () => {
      mockGetRecentLogEntries.mockResolvedValue([])
      renderWithProviders(<RecentLogsWidget employerId="employer-99" />)
      await waitFor(() => {
        expect(mockGetRecentLogEntries).toHaveBeenCalledWith('employer-99', 3)
      })
    })
  })

  describe('Liste vide', () => {
    it('affiche "Aucune entrée récente"', async () => {
      mockGetRecentLogEntries.mockResolvedValue([])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/aucune entrée récente/i)).toBeInTheDocument()
      })
    })
  })

  describe('Affichage des entrées', () => {
    it('affiche le contenu des entrées', async () => {
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ content: 'RAS ce matin.' }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('RAS ce matin.')).toBeInTheDocument()
      })
    })

    it('affiche le nom de l\'auteur', async () => {
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ author: { firstName: 'Jean', lastName: 'Dupont' } }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/par jean dupont/i)).toBeInTheDocument()
      })
    })

    it('affiche le rôle si pas d\'auteur nommé', async () => {
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ author: undefined, authorRole: 'employer' }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/par employeur/i)).toBeInTheDocument()
      })
    })
  })

  describe('Types de log', () => {
    it.each([
      ['info', 'Information'],
      ['alert', 'Alerte'],
      ['incident', 'Incident'],
      ['instruction', 'Instruction'],
    ] as const)('affiche le badge "%s"', async (type, label) => {
      mockGetRecentLogEntries.mockResolvedValue([makeLog({ type })])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })

  describe('Importance urgente', () => {
    it('affiche une entrée urgente avec fond rouge', async () => {
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ importance: 'urgent', content: 'URGENCE: chute.' }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('URGENCE: chute.')).toBeInTheDocument()
      })
    })
  })

  describe('Horodatage', () => {
    it('affiche "Il y a X min" pour une entrée récente', async () => {
      const recent = new Date(Date.now() - 30 * 60 * 1000) // il y a 30 min
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ createdAt: recent, updatedAt: recent }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/il y a 30 min/i)).toBeInTheDocument()
      })
    })

    it('affiche "Il y a Xh" pour une entrée de quelques heures', async () => {
      const hours = new Date(Date.now() - 3 * 3600 * 1000)
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ createdAt: hours, updatedAt: hours }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText(/il y a 3h/i)).toBeInTheDocument()
      })
    })

    it('affiche "Hier" pour une entrée d\'hier', async () => {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000 - 60 * 1000)
      mockGetRecentLogEntries.mockResolvedValue([
        makeLog({ createdAt: yesterday, updatedAt: yesterday }),
      ])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        expect(screen.getByText('Hier')).toBeInTheDocument()
      })
    })
  })

  describe('Lien "Voir tout"', () => {
    it('affiche le lien vers /logbook', async () => {
      mockGetRecentLogEntries.mockResolvedValue([])
      renderWithProviders(<RecentLogsWidget employerId="employer-1" />)
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /voir tout le cahier de liaison/i })
        expect(link).toHaveAttribute('href', '/logbook')
      })
    })
  })
})
