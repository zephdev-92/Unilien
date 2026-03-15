import { describe, it, expect } from 'vitest'
import {
  searchPages,
  searchTeam,
  searchShifts,
  searchLogbook,
  searchMessages,
  searchDocuments,
} from '@/services/searchService'
import type { Shift, Conversation } from '@/types'
import type { AuxiliarySummary } from '@/services/auxiliaryService'
import type { LogEntryWithAuthor } from '@/services/logbookService'
import type { DocumentWithEmployee } from '@/services/documentService'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockAuxiliaries: AuxiliarySummary[] = [
  {
    id: 'aux-1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie@test.fr',
    qualifications: ['Aide à la personne'],
    contractType: 'CDI',
    contractStatus: 'active',
    weeklyHours: 35,
    hourlyRate: 14,
    contractStartDate: new Date('2025-01-01'),
    contractId: 'c-1',
  },
  {
    id: 'aux-2',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean@test.fr',
    qualifications: ['DEAES', 'Premiers secours'],
    contractType: 'CDD',
    contractStatus: 'active',
    weeklyHours: 20,
    hourlyRate: 13,
    contractStartDate: new Date('2025-06-01'),
    contractId: 'c-2',
  },
]

const mockShifts: Shift[] = [
  {
    id: 's-1',
    contractId: 'c-1',
    employeeName: 'Marie Dupont',
    date: new Date('2026-03-10'),
    startTime: '08:00',
    endTime: '12:00',
    breakDuration: 0,
    tasks: ['Toilette', 'Repas'],
    notes: 'RAS',
    shiftType: 'effective',
    isRequalified: false,
    status: 'planned',
    computedPay: { basePay: 0, sundayMajoration: 0, holidayMajoration: 0, nightMajoration: 0, overtimeMajoration: 0, presenceResponsiblePay: 0, nightPresenceAllowance: 0, totalPay: 0 },
    validatedByEmployer: false,
    validatedByEmployee: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockLogEntries: LogEntryWithAuthor[] = [
  {
    id: 'log-1',
    employerId: 'emp-1',
    authorId: 'auth-1',
    authorRole: 'employee',
    type: 'info',
    importance: 'normal',
    content: 'Patient a bien mangé ce midi',
    attachments: [],
    readBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { firstName: 'Marie', lastName: 'Dupont' },
  },
  {
    id: 'log-2',
    employerId: 'emp-1',
    authorId: 'auth-2',
    authorRole: 'employer',
    type: 'alert',
    importance: 'urgent',
    content: 'Chute dans le salon',
    attachments: [],
    readBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { firstName: 'Paul', lastName: 'Durand' },
  },
]

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    employerId: 'emp-1',
    type: 'team',
    participantIds: ['u1', 'u2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessage: 'Bonjour à tous',
    unreadCount: 0,
  },
  {
    id: 'conv-2',
    employerId: 'emp-1',
    type: 'private',
    participantIds: ['u1', 'u3'],
    createdAt: new Date(),
    updatedAt: new Date(),
    otherParticipant: { id: 'u3', firstName: 'Sophie', lastName: 'Bernard' },
    lastMessage: 'Disponible demain ?',
    unreadCount: 2,
  },
]

const mockDocuments: DocumentWithEmployee[] = [
  {
    absence: {
      id: 'abs-1',
      employeeId: 'aux-1',
      absenceType: 'sick',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-03'),
      reason: 'Grippe',
      status: 'approved',
      createdAt: new Date(),
    },
    employee: { id: 'aux-1', firstName: 'Marie', lastName: 'Dupont' },
  },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('searchPages', () => {
  it('trouve une page par label', () => {
    const results = searchPages('planning', 'employer')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBe('Planning')
    expect(results[0].href).toBe('/planning')
  })

  it('est insensible à la casse et aux accents', () => {
    const results = searchPages('conformite', 'employer')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBe('Conformité')
  })

  it('filtre selon le rôle', () => {
    const results = searchPages('equipe', 'employee')
    expect(results).toHaveLength(0)
  })

  it('retourne max 5 résultats', () => {
    const results = searchPages('e', 'employer')
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('retourne vide pour query vide', () => {
    expect(searchPages('', 'employer')).toHaveLength(0)
  })
})

describe('searchTeam', () => {
  it('trouve un auxiliaire par prénom', () => {
    const results = searchTeam('marie', mockAuxiliaries)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Marie Dupont')
  })

  it('trouve par email', () => {
    const results = searchTeam('jean@test', mockAuxiliaries)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Jean Martin')
  })

  it('trouve par qualification', () => {
    const results = searchTeam('DEAES', mockAuxiliaries)
    expect(results).toHaveLength(1)
  })

  it('supporte la recherche multi-mots', () => {
    const results = searchTeam('marie dupont', mockAuxiliaries)
    expect(results).toHaveLength(1)
  })

  it('retourne vide si pas de match', () => {
    expect(searchTeam('inconnu', mockAuxiliaries)).toHaveLength(0)
  })
})

describe('searchShifts', () => {
  it('trouve un shift par nom employé', () => {
    const results = searchShifts('marie', mockShifts)
    expect(results).toHaveLength(1)
    expect(results[0].category).toBe('shifts')
  })

  it('trouve par tâche', () => {
    const results = searchShifts('toilette', mockShifts)
    expect(results).toHaveLength(1)
  })

  it('trouve par notes', () => {
    const results = searchShifts('RAS', mockShifts)
    expect(results).toHaveLength(1)
  })
})

describe('searchLogbook', () => {
  it('trouve une entrée par contenu', () => {
    const results = searchLogbook('mangé', mockLogEntries)
    expect(results).toHaveLength(1)
    expect(results[0].category).toBe('logbook')
  })

  it('trouve par nom auteur', () => {
    const results = searchLogbook('durand', mockLogEntries)
    expect(results).toHaveLength(1)
  })

  it('trouve par type (label)', () => {
    const results = searchLogbook('alerte', mockLogEntries)
    expect(results).toHaveLength(1)
  })

  it('tronque les contenus longs', () => {
    const longEntry: LogEntryWithAuthor = {
      ...mockLogEntries[0],
      id: 'log-long',
      content: 'A'.repeat(100),
    }
    const results = searchLogbook('AAAA', [longEntry])
    expect(results[0].title.length).toBeLessThanOrEqual(81) // 80 + '…'
  })
})

describe('searchMessages', () => {
  it('trouve la conversation équipe', () => {
    const results = searchMessages('equipe', mockConversations)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Conversation Équipe')
  })

  it('trouve par participant', () => {
    const results = searchMessages('sophie', mockConversations)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Sophie Bernard')
  })

  it('trouve par contenu dernier message', () => {
    const results = searchMessages('disponible', mockConversations)
    expect(results).toHaveLength(1)
  })
})

describe('searchDocuments', () => {
  it('trouve par nom employé', () => {
    const results = searchDocuments('dupont', mockDocuments)
    expect(results).toHaveLength(1)
    expect(results[0].category).toBe('documents')
  })

  it('trouve par type absence (label)', () => {
    const results = searchDocuments('maladie', mockDocuments)
    expect(results).toHaveLength(1)
  })

  it('trouve par raison', () => {
    const results = searchDocuments('grippe', mockDocuments)
    expect(results).toHaveLength(1)
  })
})
