import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveCesuDeclaration,
  getCesuDeclarations,
  deleteCesuDeclaration,
} from './cesuDeclarationService'
import type { MonthlyDeclarationData } from '@/lib/export/types'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ─── Helpers ────────────────────────────────────────────────────────

function mockSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)

  mockFrom.mockReturnValue(chain)
  return chain
}

const sampleDeclaration: MonthlyDeclarationData = {
  year: 2026,
  month: 3,
  periodLabel: 'Mars 2026',
  employerId: 'emp-1',
  employerFirstName: 'Marie',
  employerLastName: 'Dupont',
  employerAddress: '10 rue de la Paix, 75001 Paris',
  cesuNumber: 'CESU123',
  employees: [
    {
      employeeId: 'ee-1',
      firstName: 'Jean',
      lastName: 'Martin',
      contractId: 'c-1',
      contractType: 'CDI',
      hourlyRate: 14.50,
      totalHours: 40,
      normalHours: 36,
      sundayHours: 4,
      holidayHours: 0,
      nightHours: 0,
      overtimeHours: 0,
      basePay: 522,
      sundayMajoration: 5.80,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      totalGrossPay: 527.80,
      shiftsCount: 5,
      shiftsDetails: [
        {
          date: new Date('2026-03-01'),
          startTime: '08:00',
          endTime: '16:00',
          breakDuration: 30,
          effectiveHours: 7.5,
          isSunday: false,
          isHoliday: false,
          nightHours: 0,
          pay: 108.75,
        },
      ],
    },
  ],
  totalHours: 40,
  totalGrossPay: 527.80,
  totalEmployees: 1,
  generatedAt: new Date('2026-03-15T10:00:00Z'),
}

const sampleDbRow = {
  id: 'decl-1',
  employer_id: 'emp-1',
  year: 2026,
  month: 3,
  period_label: 'Mars 2026',
  total_employees: 1,
  total_hours: 40,
  total_gross_pay: 527.80,
  storage_path: 'emp-1/2026/03/cesu_2026_03.pdf',
  declaration_data: {
    ...sampleDeclaration,
    generatedAt: '2026-03-15T10:00:00.000Z',
    employees: [
      {
        ...sampleDeclaration.employees[0],
        shiftsDetails: [
          {
            ...sampleDeclaration.employees[0].shiftsDetails[0],
            date: '2026-03-01T00:00:00.000Z',
          },
        ],
      },
    ],
  },
  generated_at: '2026-03-15T10:00:00.000Z',
  created_at: '2026-03-15T10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── saveCesuDeclaration ──

describe('saveCesuDeclaration', () => {
  it('upsert la declaration et retourne le record mappe', async () => {
    const chain = mockSupabaseChain({ data: sampleDbRow, error: null })

    const result = await saveCesuDeclaration('emp-1', sampleDeclaration)

    expect(mockFrom).toHaveBeenCalledWith('cesu_declarations')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employer_id: 'emp-1',
        year: 2026,
        month: 3,
        period_label: 'Mars 2026',
        total_employees: 1,
      }),
      { onConflict: 'employer_id,year,month' }
    )
    expect(result).not.toBeNull()
    expect(result!.id).toBe('decl-1')
    expect(result!.employerId).toBe('emp-1')
    expect(result!.periodLabel).toBe('Mars 2026')
    expect(result!.totalHours).toBe(40)
    expect(result!.declarationData.employees).toHaveLength(1)
    expect(result!.storagePath).toBe('emp-1/2026/03/cesu_2026_03.pdf')
    expect(result!.generatedAt).toBeInstanceOf(Date)
  })

  it('retourne null en cas d\'erreur', async () => {
    mockSupabaseChain({ data: null, error: { message: 'DB error' } })

    const result = await saveCesuDeclaration('emp-1', sampleDeclaration)

    expect(result).toBeNull()
  })

  it('serialise correctement les dates dans le JSONB', async () => {
    const chain = mockSupabaseChain({ data: sampleDbRow, error: null })

    await saveCesuDeclaration('emp-1', sampleDeclaration)

    const upsertArg = chain.upsert.mock.calls[0][0]
    const jsonData = upsertArg.declaration_data
    expect(jsonData.generatedAt).toBe('2026-03-15T10:00:00.000Z')
    expect(jsonData.employees[0].shiftsDetails[0].date).toBe('2026-03-01T00:00:00.000Z')
  })
})

// ── getCesuDeclarations ──

describe('getCesuDeclarations', () => {
  it('retourne les declarations triees par date', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)

    // Le dernier .order() retourne la Promise
    let orderCallCount = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: [sampleDbRow], error: null })
      }
      return chain
    })

    mockFrom.mockReturnValue(chain)

    const result = await getCesuDeclarations('emp-1')

    expect(mockFrom).toHaveBeenCalledWith('cesu_declarations')
    expect(chain.eq).toHaveBeenCalledWith('employer_id', 'emp-1')
    expect(result).toHaveLength(1)
    expect(result[0].periodLabel).toBe('Mars 2026')
    // Dates reconstituées
    expect(result[0].declarationData.generatedAt).toBeInstanceOf(Date)
    expect(result[0].declarationData.employees[0].shiftsDetails[0].date).toBeInstanceOf(Date)
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)

    let orderCallCount = 0
    chain.order = vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: null, error: { message: 'error' } })
      }
      return chain
    })

    mockFrom.mockReturnValue(chain)

    const result = await getCesuDeclarations('emp-1')
    expect(result).toEqual([])
  })
})

// ── deleteCesuDeclaration ──

describe('deleteCesuDeclaration', () => {
  it('supprime la DB et le fichier storage puis retourne true', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ remove: mockRemove })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Premier appel : SELECT storage_path
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { storage_path: 'emp-1/2026/03/cesu_2026_03.pdf' },
                error: null,
              }),
            }),
          }),
        }
      }
      // Deuxième appel : DELETE
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await deleteCesuDeclaration('decl-1')

    expect(result).toBe(true)
    expect(mockStorageFrom).toHaveBeenCalledWith('cesu-declarations')
    expect(mockRemove).toHaveBeenCalledWith(['emp-1/2026/03/cesu_2026_03.pdf'])
  })

  it('supprime la DB sans storage si pas de fichier', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { storage_path: null },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const result = await deleteCesuDeclaration('decl-1')

    expect(result).toBe(true)
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })

  it('retourne false en cas d\'erreur DB', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'error' } }),
        }),
      }
    })

    const result = await deleteCesuDeclaration('decl-1')
    expect(result).toBe(false)
  })
})
