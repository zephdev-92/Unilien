import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportUserDataJSON, exportUserShiftsCSV } from './dataExportService'

// ============================================================
// MOCKS
// ============================================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve(result))
  )
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// FIXTURES
// ============================================================

const USER_ID = 'user-123'

// ============================================================
// exportUserDataJSON
// ============================================================

describe('exportUserDataJSON', () => {
  it('exporte les 7 tables avec les bonnes données', async () => {
    const chain = makeChain({ data: [{ id: '1' }], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await exportUserDataJSON(USER_ID)

    expect(Object.keys(result)).toEqual([
      'profiles',
      'shifts',
      'absences',
      'contracts',
      'logbook_entries',
      'liaison_messages',
      'documents',
    ])
    // Chaque table doit contenir la donnée mockée
    for (const key of Object.keys(result)) {
      expect(result[key]).toEqual([{ id: '1' }])
    }
  })

  it('appelle eq pour les tables filter eq (profiles, logbook, messages, documents)', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await exportUserDataJSON(USER_ID)

    // profiles → eq('id', userId)
    // logbook_entries → eq('user_id', userId)
    // liaison_messages → eq('sender_id', userId)
    // documents → eq('user_id', userId)
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(chain.eq).toHaveBeenCalledWith('sender_id', USER_ID)
  })

  it('appelle or pour les tables multi-rôle (shifts, absences, contracts)', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await exportUserDataJSON(USER_ID)

    expect(chain.or).toHaveBeenCalledWith(
      `employee_id.eq.${USER_ID},employer_id.eq.${USER_ID}`
    )
  })

  it('continue si une table échoue et log l erreur', async () => {
    const { logger } = await import('@/lib/logger')
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // La 2e table (shifts) échoue
      if (callCount === 2) {
        return makeChain({ data: null, error: { message: 'RLS denied' } })
      }
      return makeChain({ data: [{ id: String(callCount) }], error: null })
    })

    const result = await exportUserDataJSON(USER_ID)

    // shifts ne doit pas apparaître dans le résultat
    expect(result.shifts).toBeUndefined()
    // Les autres tables sont présentes
    expect(result.profiles).toBeDefined()
    expect(result.absences).toBeDefined()
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur export table shifts:',
      { message: 'RLS denied' }
    )
  })

  it('retourne un objet vide si toutes les tables échouent', async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: null, error: { message: 'DB down' } })
    )

    const result = await exportUserDataJSON(USER_ID)

    expect(result).toEqual({})
  })

  it('ignore les tables avec data null sans erreur', async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: null, error: null })
    )

    const result = await exportUserDataJSON(USER_ID)

    // Pas de clé ajoutée si rows est null
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('exporte les tables vides comme tableaux vides', async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: [], error: null })
    )

    const result = await exportUserDataJSON(USER_ID)

    for (const key of Object.keys(result)) {
      expect(result[key]).toEqual([])
    }
  })
})

// ============================================================
// exportUserShiftsCSV
// ============================================================

describe('exportUserShiftsCSV', () => {
  it('retourne un CSV avec headers et lignes séparées par ;', async () => {
    const shifts = [
      { id: 's1', date: '2026-04-01', start_time: '09:00', end_time: '12:00' },
      { id: 's2', date: '2026-04-02', start_time: '14:00', end_time: '17:00' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: shifts, error: null }))

    const result = await exportUserShiftsCSV(USER_ID)

    expect(result).not.toBeNull()
    const lines = result!.split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
    expect(lines[0]).toBe('id;date;start_time;end_time')
    expect(lines[1]).toBe('s1;2026-04-01;09:00;12:00')
    expect(lines[2]).toBe('s2;2026-04-02;14:00;17:00')
  })

  it('appelle or avec employee_id et employer_id', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await exportUserShiftsCSV(USER_ID)

    expect(mockFrom).toHaveBeenCalledWith('shifts')
    expect(chain.or).toHaveBeenCalledWith(
      `employee_id.eq.${USER_ID},employer_id.eq.${USER_ID}`
    )
  })

  it('retourne null si erreur Supabase', async () => {
    const { logger } = await import('@/lib/logger')
    mockFrom.mockReturnValue(
      makeChain({ data: null, error: { message: 'Query failed' } })
    )

    const result = await exportUserShiftsCSV(USER_ID)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur export CSV shifts:',
      { message: 'Query failed' }
    )
  })

  it('retourne null si aucun shift', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))

    const result = await exportUserShiftsCSV(USER_ID)

    expect(result).toBeNull()
  })

  it('retourne null si shifts est null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await exportUserShiftsCSV(USER_ID)

    expect(result).toBeNull()
  })

  it('gère les valeurs null dans les cellules CSV', async () => {
    const shifts = [
      { id: 's1', date: '2026-04-01', notes: null },
    ]
    mockFrom.mockReturnValue(makeChain({ data: shifts, error: null }))

    const result = await exportUserShiftsCSV(USER_ID)

    const lines = result!.split('\n')
    expect(lines[1]).toBe('s1;2026-04-01;')
  })
})
