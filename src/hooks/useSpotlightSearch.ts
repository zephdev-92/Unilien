import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEmployerResolution } from '@/hooks/useEmployerResolution'
import { logger } from '@/lib/logger'

import { getAuxiliariesForEmployer } from '@/services/auxiliaryService'
import { getShifts } from '@/services/shiftService'
import { getLogEntries } from '@/services/logbookService'
import { getConversations } from '@/services/liaisonService'
import { getDocumentsForEmployer } from '@/services/documentService'

import {
  searchPages,
  searchTeam,
  searchShifts,
  searchLogbook,
  searchMessages,
  searchDocuments,
} from '@/services/searchService'
import type { SearchResult } from '@/services/searchService'
import type { Shift, Conversation } from '@/types'
import type { AuxiliarySummary } from '@/services/auxiliaryService'
import type { LogEntryWithAuthor } from '@/services/logbookService'
import type { DocumentWithEmployee } from '@/services/documentService'

// ── Types ────────────────────────────────────────────────────────────────────

interface DataCache {
  auxiliaries: AuxiliarySummary[]
  shifts: Shift[]
  logEntries: LogEntryWithAuthor[]
  conversations: Conversation[]
  documents: DocumentWithEmployee[]
}

export interface UseSpotlightSearchReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
  activeIndex: number
  setActiveIndex: (i: number) => void
  isLoading: boolean
  handleKeyDown: (e: React.KeyboardEvent) => void
  selectResult: (result: SearchResult) => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300

export function useSpotlightSearch(): UseSpotlightSearchReturn {
  const { profile, userRole } = useAuth()
  const { resolvedEmployerId, caregiverPermissions } = useEmployerResolution()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const dataCache = useRef<DataCache | null>(null)
  const fetchedForEmployer = useRef<string | null>(null)

  // ── Fetch data on open ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!profile?.id || !userRole) return
    const employerId = userRole === 'employer' ? profile.id : resolvedEmployerId
    if (!employerId) return

    // Ne pas re-fetcher si même employeur
    if (fetchedForEmployer.current === employerId && dataCache.current) return

    setIsLoading(true)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const isEmployer = userRole === 'employer'

      const [auxiliaries, shifts, logResult, conversations, documents] = await Promise.all([
        isEmployer ? getAuxiliariesForEmployer(employerId) : Promise.resolve([]),
        getShifts(profile.id, userRole, startOfMonth, endOfMonth),
        getLogEntries(employerId, profile.id, userRole, undefined, 1, 50),
        getConversations(employerId, profile.id),
        isEmployer ? getDocumentsForEmployer(employerId) : Promise.resolve([]),
      ])

      dataCache.current = {
        auxiliaries,
        shifts,
        logEntries: logResult.entries,
        conversations,
        documents,
      }
      fetchedForEmployer.current = employerId
    } catch (err) {
      logger.error('SpotlightSearch: erreur chargement données', err)
      dataCache.current = {
        auxiliaries: [],
        shifts: [],
        logEntries: [],
        conversations: [],
        documents: [],
      }
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, userRole, resolvedEmployerId])

  // Fetch à l'ouverture
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, fetchData])

  // ── Debounced search ───────────────────────────────────────────────────

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setActiveIndex(0)
      return
    }

    const timer = setTimeout(() => {
      const role = userRole || 'employer'
      const cache = dataCache.current

      const pageResults = searchPages(query, role, caregiverPermissions)

      if (!cache) {
        setResults(pageResults)
        setActiveIndex(0)
        return
      }

      const all: SearchResult[] = [
        ...pageResults,
        ...searchTeam(query, cache.auxiliaries),
        ...searchShifts(query, cache.shifts),
        ...searchLogbook(query, cache.logEntries),
        ...searchMessages(query, cache.conversations),
        ...searchDocuments(query, cache.documents),
      ].slice(0, 20)

      setResults(all)
      setActiveIndex(0)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, userRole, caregiverPermissions])

  // ── Navigation ─────────────────────────────────────────────────────────

  const selectResult = useCallback(
    (result: SearchResult) => {
      setIsOpen(false)
      setQuery('')
      setResults([])
      setActiveIndex(0)
      navigate(result.href)
    },
    [navigate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % Math.max(results.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1))
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault()
        selectResult(results[activeIndex])
      }
    },
    [results, activeIndex, selectResult],
  )

  // ── Open / Close ───────────────────────────────────────────────────────

  const open = useCallback(() => setIsOpen(true), [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }, [])

  // ── Global Ctrl+K listener ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
      query,
      setQuery,
      results,
      activeIndex,
      setActiveIndex,
      isLoading,
      handleKeyDown,
      selectResult,
    }),
    [isOpen, open, close, query, results, activeIndex, isLoading, handleKeyDown, selectResult],
  )
}
