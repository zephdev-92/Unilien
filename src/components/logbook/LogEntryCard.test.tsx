import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { LogEntryCard } from './LogEntryCard'
import type { LogEntryWithAuthor } from '@/services/logbookService'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/sanitize', () => ({
  sanitizeText: (text: string) => text,
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<LogEntryWithAuthor> = {}): LogEntryWithAuthor {
  return {
    id: 'entry-1',
    employerId: 'employer-1',
    authorId: 'author-1',
    authorRole: 'employer',
    type: 'info',
    importance: 'normal',
    content: 'Contenu de test',
    attachments: [],
    readBy: [],
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    updatedAt: new Date(),
    author: { firstName: 'Marie', lastName: 'Dupont' },
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LogEntryCard', () => {
  describe('Affichage de base', () => {
    it('affiche le contenu de l\'entrée', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry()} currentUserId="user-1" />)
      expect(screen.getByText('Contenu de test')).toBeInTheDocument()
    })

    it('affiche le nom de l\'auteur', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry()} currentUserId="user-1" />)
      expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument()
    })

    it('affiche le rôle de l\'auteur comme fallback si author absent', () => {
      const entry = makeEntry({ author: undefined, authorRole: 'employee' })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      // Quand author absent, authorName = authorRoleLabels[authorRole] = 'Auxiliaire'
      expect(screen.getByText(/Auxiliaire/)).toBeInTheDocument()
    })
  })

  describe('Types d\'entrée', () => {
    it('affiche le badge "Information" pour le type info', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry({ type: 'info' })} currentUserId="user-1" />)
      expect(screen.getByText('Information')).toBeInTheDocument()
    })

    it('affiche le badge "Alerte" pour le type alert', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry({ type: 'alert' })} currentUserId="user-1" />)
      expect(screen.getByText('Alerte')).toBeInTheDocument()
    })

    it('affiche le badge "Incident" pour le type incident', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry({ type: 'incident' })} currentUserId="user-1" />)
      expect(screen.getByText('Incident')).toBeInTheDocument()
    })

    it('affiche le badge "Instruction" pour le type instruction', () => {
      renderWithProviders(<LogEntryCard entry={makeEntry({ type: 'instruction' })} currentUserId="user-1" />)
      expect(screen.getByText('Instruction')).toBeInTheDocument()
    })
  })

  describe('Badge "Non lu"', () => {
    it('affiche "Non lu" si l\'entrée n\'est pas dans readBy', () => {
      const entry = makeEntry({ readBy: [] })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-not-in-readBy" />)
      expect(screen.getByText('Non lu')).toBeInTheDocument()
    })

    it('n\'affiche pas "Non lu" si l\'entrée est déjà lue', () => {
      const entry = makeEntry({ readBy: ['current-user'] })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="current-user" />)
      expect(screen.queryByText('Non lu')).not.toBeInTheDocument()
    })
  })

  describe('Formatage du temps', () => {
    it('affiche "À l\'instant" pour une entrée très récente (< 1min)', () => {
      const entry = makeEntry({ createdAt: new Date(Date.now() - 30 * 1000) }) // 30s
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText("À l'instant")).toBeInTheDocument()
    })

    it('affiche "Il y a X min" pour une entrée de moins d\'1h', () => {
      const entry = makeEntry({ createdAt: new Date(Date.now() - 20 * 60 * 1000) }) // 20min
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText('Il y a 20 min')).toBeInTheDocument()
    })

    it('affiche "Il y a Xh" pour une entrée de moins d\'1 jour', () => {
      const entry = makeEntry({ createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) }) // 3h
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText('Il y a 3h')).toBeInTheDocument()
    })

    it('affiche "Hier" pour une entrée d\'il y a 1 jour', () => {
      const entry = makeEntry({ createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) }) // 26h
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText('Hier')).toBeInTheDocument()
    })

    it('affiche "Il y a X jours" pour une entrée plus ancienne', () => {
      const entry = makeEntry({ createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }) // 3 jours
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText('Il y a 3 jours')).toBeInTheDocument()
    })
  })

  describe('Troncature du contenu', () => {
    it('affiche le contenu complet si < 150 caractères', () => {
      const shortContent = 'Court message'
      const entry = makeEntry({ content: shortContent })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText(shortContent)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /voir plus/i })).not.toBeInTheDocument()
    })

    it('affiche un bouton "Voir plus" si le contenu dépasse 150 caractères', () => {
      const longContent = 'A'.repeat(200)
      const entry = makeEntry({ content: longContent })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByRole('button', { name: /voir plus/i })).toBeInTheDocument()
    })

    it('affiche le contenu tronqué avec "..." par défaut', () => {
      const longContent = 'A'.repeat(200)
      const entry = makeEntry({ content: longContent })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      expect(screen.getByText(/A+\.\.\./)).toBeInTheDocument()
    })

    it('affiche le contenu complet après "Voir plus"', async () => {
      const user = userEvent.setup()
      const longContent = 'B'.repeat(200)
      const entry = makeEntry({ content: longContent })
      renderWithProviders(<LogEntryCard entry={entry} currentUserId="user-1" />)
      await user.click(screen.getByRole('button', { name: /voir plus/i }))
      expect(screen.getByText(longContent)).toBeInTheDocument()
    })
  })

  describe('Actions auteur (Modifier / Supprimer)', () => {
    const authorEntry = makeEntry({ authorId: 'current-user' })
    const otherEntry = makeEntry({ authorId: 'other-user' })

    it('n\'affiche pas les boutons si l\'utilisateur n\'est pas l\'auteur', () => {
      renderWithProviders(
        <LogEntryCard
          entry={otherEntry}
          currentUserId="current-user"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument()
    })

    it('affiche le bouton Modifier si l\'auteur et onEdit fourni', () => {
      renderWithProviders(
        <LogEntryCard
          entry={authorEntry}
          currentUserId="current-user"
          onEdit={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
    })

    it('affiche le bouton Supprimer si l\'auteur et onDelete fourni', () => {
      renderWithProviders(
        <LogEntryCard
          entry={authorEntry}
          currentUserId="current-user"
          onDelete={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
    })

    it('appelle onEdit avec l\'entrée au clic sur Modifier', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      renderWithProviders(
        <LogEntryCard entry={authorEntry} currentUserId="current-user" onEdit={onEdit} />
      )
      await user.click(screen.getByRole('button', { name: /modifier/i }))
      expect(onEdit).toHaveBeenCalledWith(authorEntry)
    })
  })

  describe('Marquage comme lu', () => {
    it('appelle onMarkAsRead avec l\'id au clic si non lu', async () => {
      const user = userEvent.setup()
      const onMarkAsRead = vi.fn()
      const unreadEntry = makeEntry({ readBy: [] })
      renderWithProviders(
        <LogEntryCard entry={unreadEntry} currentUserId="user-1" onMarkAsRead={onMarkAsRead} />
      )
      await user.click(screen.getByText('Contenu de test'))
      expect(onMarkAsRead).toHaveBeenCalledWith('entry-1')
    })

    it('n\'appelle pas onMarkAsRead si déjà lu', async () => {
      const user = userEvent.setup()
      const onMarkAsRead = vi.fn()
      const readEntry = makeEntry({ readBy: ['user-1'] })
      renderWithProviders(
        <LogEntryCard entry={readEntry} currentUserId="user-1" onMarkAsRead={onMarkAsRead} />
      )
      await user.click(screen.getByText('Contenu de test'))
      expect(onMarkAsRead).not.toHaveBeenCalled()
    })
  })
})
