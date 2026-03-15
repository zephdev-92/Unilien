/**
 * Service de recherche globale (SpotlightSearch)
 * Fonctions pures de filtrage client-side sur les données déjà fetchées.
 */

import type { Shift, Conversation, UserRole, CaregiverPermissions } from '@/types'
import type { AuxiliarySummary } from '@/services/auxiliaryService'
import type { LogEntryWithAuthor } from '@/services/logbookService'
import type { DocumentWithEmployee } from '@/services/documentService'

// ── Types ────────────────────────────────────────────────────────────────────

export type SearchCategory = 'pages' | 'team' | 'shifts' | 'logbook' | 'messages' | 'documents'

export interface SearchResult {
  id: string
  category: SearchCategory
  icon: string
  title: string
  subtitle?: string
  href: string
}

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  pages: 'Pages',
  team: 'Équipe',
  shifts: 'Interventions',
  logbook: 'Cahier de liaison',
  messages: 'Messages',
  documents: 'Documents',
}

export { CATEGORY_LABELS }

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise un texte pour la comparaison (lowercase + suppression accents) */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Vérifie que tous les mots de la query matchent au moins un des champs */
function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const normalizedQuery = normalize(query)
  const words = normalizedQuery.split(/\s+/).filter(Boolean)
  if (words.length === 0) return false

  const joined = fields
    .filter(Boolean)
    .map((f) => normalize(f!))
    .join(' ')

  return words.every((word) => joined.includes(word))
}

// ── Navigation pages ─────────────────────────────────────────────────────────

interface NavPage {
  label: string
  href: string
  icon: string
  roles?: UserRole[]
}

const NAV_PAGES: NavPage[] = [
  { label: 'Tableau de bord', href: '/tableau-de-bord', icon: 'grid' },
  { label: 'Planning', href: '/planning', icon: 'calendar' },
  { label: 'Équipe', href: '/equipe', icon: 'users', roles: ['employer'] },
  { label: 'Messagerie', href: '/messagerie', icon: 'message' },
  { label: 'Cahier de liaison', href: '/cahier-de-liaison', icon: 'book' },
  { label: 'Conformité', href: '/conformite', icon: 'shield', roles: ['employer'] },
  { label: 'Documents', href: '/documents', icon: 'file', roles: ['employer'] },
  { label: 'Suivi des heures', href: '/suivi-des-heures', icon: 'clock' },
  { label: 'Analytique', href: '/analytique', icon: 'barchart' },
  { label: 'Mon profil', href: '/profil', icon: 'user' },
  { label: 'Paramètres', href: '/parametres', icon: 'settings' },
]

export function searchPages(
  query: string,
  userRole: UserRole,
  caregiverPermissions?: CaregiverPermissions | null,
): SearchResult[] {
  return NAV_PAGES
    .filter((page) => {
      if (!page.roles) return true
      if (page.roles.includes(userRole)) return true
      if (userRole === 'caregiver') {
        if (page.href === '/equipe' && caregiverPermissions?.canManageTeam) return true
        if (page.href === '/conformite' && caregiverPermissions?.canExportData) return true
        if (page.href === '/documents' && caregiverPermissions?.canExportData) return true
      }
      return false
    })
    .filter((page) => matchesQuery(query, page.label))
    .slice(0, 5)
    .map((page) => ({
      id: `page-${page.href}`,
      category: 'pages' as const,
      icon: page.icon,
      title: page.label,
      href: page.href,
    }))
}

// ── Équipe (auxiliaires) ─────────────────────────────────────────────────────

export function searchTeam(
  query: string,
  auxiliaries: AuxiliarySummary[],
): SearchResult[] {
  return auxiliaries
    .filter((aux) =>
      matchesQuery(query, aux.firstName, aux.lastName, aux.email, ...aux.qualifications),
    )
    .slice(0, 5)
    .map((aux) => ({
      id: `team-${aux.id}`,
      category: 'team' as const,
      icon: 'users',
      title: `${aux.firstName} ${aux.lastName}`,
      subtitle: aux.contractStatus === 'active' ? aux.contractType : 'Inactif',
      href: '/equipe',
    }))
}

// ── Interventions (shifts) ───────────────────────────────────────────────────

function formatShiftDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function searchShifts(
  query: string,
  shifts: Shift[],
): SearchResult[] {
  return shifts
    .filter((s) =>
      matchesQuery(
        query,
        s.employeeName,
        s.notes,
        ...(s.tasks || []),
        formatShiftDate(s.date),
      ),
    )
    .slice(0, 5)
    .map((s) => ({
      id: `shift-${s.id}`,
      category: 'shifts' as const,
      icon: 'calendar',
      title: s.employeeName
        ? `${s.employeeName} — ${s.startTime}–${s.endTime}`
        : `${s.startTime}–${s.endTime}`,
      subtitle: formatShiftDate(s.date),
      href: `/planning?date=${s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date}`,
    }))
}

// ── Cahier de liaison ────────────────────────────────────────────────────────

const LOG_TYPE_LABELS: Record<string, string> = {
  info: 'Information',
  alert: 'Alerte',
  incident: 'Incident',
  instruction: 'Instruction',
}

export function searchLogbook(
  query: string,
  entries: LogEntryWithAuthor[],
): SearchResult[] {
  return entries
    .filter((e) =>
      matchesQuery(
        query,
        e.content,
        e.author?.firstName,
        e.author?.lastName,
        LOG_TYPE_LABELS[e.type],
      ),
    )
    .slice(0, 5)
    .map((e) => ({
      id: `log-${e.id}`,
      category: 'logbook' as const,
      icon: 'book',
      title: e.content.length > 80 ? e.content.slice(0, 80) + '…' : e.content,
      subtitle: [
        LOG_TYPE_LABELS[e.type],
        e.author ? `${e.author.firstName} ${e.author.lastName}` : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
      href: '/cahier-de-liaison',
    }))
}

// ── Messages (conversations) ─────────────────────────────────────────────────

export function searchMessages(
  query: string,
  conversations: Conversation[],
): SearchResult[] {
  return conversations
    .filter((c) =>
      matchesQuery(
        query,
        c.type === 'team' ? 'Équipe' : undefined,
        c.otherParticipant?.firstName,
        c.otherParticipant?.lastName,
        c.lastMessage,
      ),
    )
    .slice(0, 5)
    .map((c) => ({
      id: `msg-${c.id}`,
      category: 'messages' as const,
      icon: 'message',
      title:
        c.type === 'team'
          ? 'Conversation Équipe'
          : c.otherParticipant
            ? `${c.otherParticipant.firstName} ${c.otherParticipant.lastName}`
            : 'Conversation',
      subtitle: c.lastMessage
        ? c.lastMessage.length > 60
          ? c.lastMessage.slice(0, 60) + '…'
          : c.lastMessage
        : undefined,
      href: `/messagerie?conv=${c.id}`,
    }))
}

// ── Documents (absences) ─────────────────────────────────────────────────────

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  sick: 'Maladie',
  vacation: 'Congé',
  family_event: 'Événement familial',
  training: 'Formation',
  unavailable: 'Indisponibilité',
  emergency: 'Urgence',
}

export function searchDocuments(
  query: string,
  documents: DocumentWithEmployee[],
): SearchResult[] {
  return documents
    .filter((d) =>
      matchesQuery(
        query,
        d.employee.firstName,
        d.employee.lastName,
        d.absence.reason,
        ABSENCE_TYPE_LABELS[d.absence.absenceType],
      ),
    )
    .slice(0, 5)
    .map((d) => ({
      id: `doc-${d.absence.id}`,
      category: 'documents' as const,
      icon: 'file',
      title: `${d.employee.firstName} ${d.employee.lastName}`,
      subtitle: [
        ABSENCE_TYPE_LABELS[d.absence.absenceType],
        d.absence.status === 'pending' ? 'En attente' : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
      href: '/documents',
    }))
}
