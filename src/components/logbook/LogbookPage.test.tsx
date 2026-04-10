import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { createMockProfile } from '@/test/fixtures'
import { LogbookPage } from './LogbookPage'
import type { LogEntryWithAuthor } from '@/services/logbookService'

// ─── Mocks sous-composants ────────────────────────────────────────────────────

vi.mock('@/components/dashboard', () => ({
  DashboardLayout: ({
    children,
    title,
    topbarRight,
  }: {
    children: React.ReactNode
    title: string
    topbarRight?: React.ReactNode
  }) => (
    <div data-testid="dashboard-layout" data-title={title}>
      {topbarRight && <div data-testid="topbar-right">{topbarRight}</div>}
      {children}
    </div>
  ),
}))

vi.mock('./LogEntryCard', () => ({
  LogEntryCard: ({ entry }: { entry: LogEntryWithAuthor }) => (
    <div data-testid="log-entry-card" data-entry-id={entry.id}>{entry.content}</div>
  ),
}))

vi.mock('./LogbookFilters', () => ({
  LogbookFilters: ({
    onSearchChange,
    onFiltersChange,
  }: {
    searchQuery: string
    onSearchChange: (q: string) => void
    onFiltersChange: (f: unknown) => void
  }) => (
    <div data-testid="logbook-filters">
      <input
        data-testid="search-input"
        placeholder="Rechercher"
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button onClick={() => onFiltersChange({ type: 'alert' })}>Filtrer</button>
    </div>
  ),
}))

vi.mock('./NewLogEntryModal', () => ({
  NewLogEntryModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="new-entry-modal">
        <button onClick={onClose}>Fermer modal</button>
      </div>
    ) : null,
}))

vi.mock('./EditLogEntryModal', () => ({
  EditLogEntryModal: ({ entry }: { entry: LogEntryWithAuthor | null }) =>
    entry ? <div data-testid="edit-entry-modal" data-entry-id={entry.id} /> : null,
}))

// ─── Mocks hooks ──────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseEmployerResolution = vi.fn()
vi.mock('@/hooks/useEmployerResolution', () => ({
  useEmployerResolution: () => mockUseEmployerResolution(),
}))

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockGetLogEntries = vi.fn()
const mockGetUnreadCount = vi.fn()
const mockMarkAsRead = vi.fn()
const mockDeleteLogEntry = vi.fn()

vi.mock('@/services/logbookService', () => ({
  getLogEntries: (...args: unknown[]) => mockGetLogEntries(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  deleteLogEntry: (...args: unknown[]) => mockDeleteLogEntry(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const employerProfile = createMockProfile({ id: 'employer-1', role: 'employer' })

function makeEntry(overrides: Partial<LogEntryWithAuthor> = {}): LogEntryWithAuthor {
  return {
    id: 'entry-1',
    employerId: 'employer-1',
    authorId: 'employer-1',
    authorRole: 'employer',
    type: 'info',
    importance: 'normal',
    content: 'Note de test',
    attachments: [],
    readBy: [],
    createdAt: new Date('2025-01-15T10:00:00'),
    updatedAt: new Date('2025-01-15T10:00:00'),
    audioUrl: undefined,
    author: { firstName: 'Jean', lastName: 'Dupont' },
    ...overrides,
  }
}

const defaultResolution = {
  resolvedEmployerId: 'employer-1',
  caregiverPermissions: null,
  isResolving: false,
  accessDenied: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LogbookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ profile: employerProfile, isInitialized: true })
    mockUseEmployerResolution.mockReturnValue(defaultResolution)
    mockGetLogEntries.mockResolvedValue({ entries: [], totalCount: 0, hasMore: false })
    mockGetUnreadCount.mockResolvedValue(0)
    mockMarkAsRead.mockResolvedValue(undefined)
    mockDeleteLogEntry.mockResolvedValue(undefined)
  })

  // ── États de chargement ────────────────────────────────────────────────────

  describe('États de chargement', () => {
    it('affiche l\'écran de chargement pendant la résolution employeur', () => {
      mockUseEmployerResolution.mockReturnValue({ ...defaultResolution, isResolving: true })
      renderWithProviders(<LogbookPage />)
      // Loading → dashboard avec spinner, les filtres ne sont pas encore affichés
      expect(screen.queryByTestId('logbook-filters')).not.toBeInTheDocument()
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    })

    it('affiche l\'écran de chargement quand le profil est absent', () => {
      mockUseAuth.mockReturnValue({ profile: null, isInitialized: false })
      renderWithProviders(<LogbookPage />)
      expect(screen.queryByTestId('logbook-filters')).not.toBeInTheDocument()
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    })

    it('affiche le titre "Cahier de liaison" dans le DashboardLayout', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toHaveAttribute(
          'data-title',
          'Cahier de liaison'
        )
      })
    })
  })

  // ── Accès refusé ──────────────────────────────────────────────────────────

  describe('Accès refusé', () => {
    it('affiche le message d\'accès refusé pour un aidant sans permission', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({ ...defaultResolution, accessDenied: true })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText('Acces non autorise')).toBeInTheDocument()
      })
    })

    it('affiche un message spécifique pour un aidant', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({ ...defaultResolution, accessDenied: true })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText(/Vous n'avez pas la permission/)).toBeInTheDocument()
      })
    })
  })

  // ── Empty state ────────────────────────────────────────────────────────────

  describe('Empty state', () => {
    it('affiche le message vide quand aucune entrée', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText('Aucune entree dans le cahier de liaison')).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Creer la premiere entree" pour un employeur', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText('Creer la premiere entree')).toBeInTheDocument()
      })
    })

    it('n\'affiche pas le bouton de création pour un aidant sans permission écriture', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({
        ...defaultResolution,
        caregiverPermissions: { canViewLiaison: true, canWriteLiaison: false },
      })
      mockGetLogEntries.mockResolvedValue({ entries: [], totalCount: 0, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.queryByText('Creer la premiere entree')).not.toBeInTheDocument()
      })
    })
  })

  // ── Liste des entrées ──────────────────────────────────────────────────────

  describe('Liste des entrées', () => {
    it('affiche les entrées retournées par le service', async () => {
      const entry1 = makeEntry({ id: 'e1', content: 'Note numéro 1' })
      const entry2 = makeEntry({ id: 'e2', content: 'Note numéro 2' })
      mockGetLogEntries.mockResolvedValue({ entries: [entry1, entry2], totalCount: 2, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getAllByTestId('log-entry-card')).toHaveLength(2)
      })
      expect(screen.getByText('Note numéro 1')).toBeInTheDocument()
      expect(screen.getByText('Note numéro 2')).toBeInTheDocument()
    })

    it('affiche le compteur d\'entrées', async () => {
      const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]
      mockGetLogEntries.mockResolvedValue({ entries, totalCount: 2, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText(/2 sur 2/)).toBeInTheDocument()
      })
    })

    it('appelle getLogEntries avec le bon employerId', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(mockGetLogEntries).toHaveBeenCalledWith(
          'employer-1',
          'employer-1',
          'employer',
          expect.any(Object),
          1,
          20
        )
      })
    })
  })

  // ── Bandeau non lus ────────────────────────────────────────────────────────

  describe('Bandeau non lus', () => {
    it('affiche le bandeau quand il y a des messages non lus', async () => {
      mockGetUnreadCount.mockResolvedValue(3)
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText(/3 note/)).toBeInTheDocument()
      })
    })

    it('n\'affiche pas le bandeau si tout est lu', async () => {
      mockGetUnreadCount.mockResolvedValue(0)
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.queryByText(/note.*non lue/)).not.toBeInTheDocument()
      })
    })

    it('affiche le pluriel pour plusieurs notes non lues', async () => {
      mockGetUnreadCount.mockResolvedValue(5)
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText(/5 notes non lues/)).toBeInTheDocument()
      })
    })
  })

  // ── Bouton "Charger plus" ──────────────────────────────────────────────────

  describe('Pagination — charger plus', () => {
    it('affiche le bouton "Charger plus" quand hasMore=true', async () => {
      const entries = [makeEntry()]
      mockGetLogEntries.mockResolvedValue({ entries, totalCount: 10, hasMore: true })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText(/Charger plus/)).toBeInTheDocument()
      })
    })

    it('n\'affiche pas le bouton quand hasMore=false', async () => {
      const entries = [makeEntry()]
      mockGetLogEntries.mockResolvedValue({ entries, totalCount: 1, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.queryByText(/Charger plus/)).not.toBeInTheDocument()
      })
    })
  })

  // ── Bouton "Nouvelle note" ─────────────────────────────────────────────────

  describe('Bouton nouvelle note', () => {
    it('affiche le bouton "Nouvelle note" dans la topbar pour un employeur', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByTestId('topbar-right')).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Nouvelle note" pour un employé', async () => {
      const employeeProfile = createMockProfile({ id: 'emp-1', role: 'employee' })
      mockUseAuth.mockReturnValue({ profile: employeeProfile, isInitialized: true })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByTestId('topbar-right')).toBeInTheDocument()
      })
    })

    it('affiche le bouton "Nouvelle note" pour un aidant avec permission écriture', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({
        ...defaultResolution,
        caregiverPermissions: { canViewLiaison: true, canWriteLiaison: true },
      })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByTestId('topbar-right')).toBeInTheDocument()
      })
    })

    it('n\'affiche pas le bouton pour un aidant sans permission écriture', async () => {
      const caregiverProfile = createMockProfile({ id: 'cg-1', role: 'caregiver' })
      mockUseAuth.mockReturnValue({ profile: caregiverProfile, isInitialized: true })
      mockUseEmployerResolution.mockReturnValue({
        ...defaultResolution,
        caregiverPermissions: { canViewLiaison: true, canWriteLiaison: false },
      })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.queryByTestId('topbar-right')).not.toBeInTheDocument()
      })
    })
  })

  // ── Recherche client-side ──────────────────────────────────────────────────

  describe('Recherche client-side', () => {
    it('filtre les entrées selon le texte de recherche', async () => {
      const entries = [
        makeEntry({ id: 'e1', content: 'Medication donnée' }),
        makeEntry({ id: 'e2', content: 'Note de suivi' }),
      ]
      mockGetLogEntries.mockResolvedValue({ entries, totalCount: 2, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => {
        expect(screen.getByText('Medication donnée')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'Medication' } })

      await waitFor(() => {
        expect(screen.getByText('Medication donnée')).toBeInTheDocument()
        expect(screen.queryByText('Note de suivi')).not.toBeInTheDocument()
      })
    })

    it('affiche un message "Aucun résultat" quand la recherche ne trouve rien', async () => {
      const entries = [makeEntry({ id: 'e1', content: 'Note existante' })]
      mockGetLogEntries.mockResolvedValue({ entries, totalCount: 1, hasMore: false })
      renderWithProviders(<LogbookPage />)
      await waitFor(() => screen.getByText('Note existante'))

      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'xyz-introuvable' } })

      await waitFor(() => {
        expect(screen.getByText(/Aucun resultat pour "xyz-introuvable"/)).toBeInTheDocument()
      })
    })
  })

  // ── Modal nouvelle entrée ──────────────────────────────────────────────────

  describe('Modal nouvelle entrée', () => {
    it('ouvre le modal en cliquant sur le bouton topbar', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => screen.getByTestId('topbar-right'))

      // Le bouton est le Flex as="button" dans topbarRight
      fireEvent.click(screen.getByTestId('topbar-right').querySelector('button')!)

      await waitFor(() => {
        expect(screen.getByTestId('new-entry-modal')).toBeInTheDocument()
      })
    })

    it('ferme le modal en cliquant sur le bouton de fermeture', async () => {
      renderWithProviders(<LogbookPage />)
      await waitFor(() => screen.getByTestId('topbar-right'))

      fireEvent.click(screen.getByTestId('topbar-right').querySelector('button')!)
      await waitFor(() => screen.getByTestId('new-entry-modal'))

      fireEvent.click(screen.getByText('Fermer modal'))
      await waitFor(() => {
        expect(screen.queryByTestId('new-entry-modal')).not.toBeInTheDocument()
      })
    })
  })
})
