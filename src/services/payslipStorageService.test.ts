import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validatePayslipFile,
  uploadExternalPayslip,
  getPayslipsForEmployee,
  PAYSLIP_MAX_FILE_SIZE,
} from './payslipStorageService'

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
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '_'),
}))

// ─── Helpers ────────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

function mockContractLookup(rows: Array<{ id: string }> | null, error: unknown = null) {
  const eq4 = vi.fn().mockResolvedValue({ data: rows, error })
  const eq3 = vi.fn().mockReturnValue({ eq: eq4 })
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  return { from: vi.fn().mockReturnValue({ select }) }
}

function mockPayslipUpsert(row: Record<string, unknown> | null, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: row, error })
  const select = vi.fn().mockReturnValue({ single })
  const upsert = vi.fn().mockReturnValue({ select })
  return { from: vi.fn().mockReturnValue({ upsert }) }
}

// ─── validatePayslipFile ────────────────────────────────────────────

describe('validatePayslipFile', () => {
  it('accepte un PDF valide', () => {
    const file = makeFile('bulletin.pdf', 'application/pdf', 100_000)
    expect(validatePayslipFile(file)).toEqual({ valid: true })
  })

  it('refuse un type MIME non PDF', () => {
    const file = makeFile('photo.png', 'image/png', 100)
    const res = validatePayslipFile(file)
    expect(res.valid).toBe(false)
    expect(res.error).toMatch(/PDF/i)
  })

  it('refuse un fichier vide', () => {
    const file = makeFile('empty.pdf', 'application/pdf', 0)
    const res = validatePayslipFile(file)
    expect(res.valid).toBe(false)
    expect(res.error).toMatch(/vide/i)
  })

  it('refuse un fichier trop gros', () => {
    const file = makeFile('big.pdf', 'application/pdf', PAYSLIP_MAX_FILE_SIZE + 1)
    const res = validatePayslipFile(file)
    expect(res.valid).toBe(false)
    expect(res.error).toMatch(/5 Mo/i)
  })
})

// ─── uploadExternalPayslip ──────────────────────────────────────────

describe('uploadExternalPayslip', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockStorageFrom.mockReset()
  })

  const baseParams = {
    employerId: 'employer-1',
    employeeId: 'employee-1',
    year: 2026,
    month: 4,
    file: makeFile('avril.pdf', 'application/pdf', 10_000),
  }

  it('rejette un mois invalide', async () => {
    const res = await uploadExternalPayslip({ ...baseParams, month: 13 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/mois/i)
  })

  it('rejette un fichier invalide sans toucher à Supabase', async () => {
    const res = await uploadExternalPayslip({
      ...baseParams,
      file: makeFile('bad.txt', 'text/plain', 10),
    })
    expect(res.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })

  it('retourne une erreur si aucun contrat actif', async () => {
    const contractMock = mockContractLookup([])
    mockFrom.mockImplementation(contractMock.from)

    const res = await uploadExternalPayslip(baseParams)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/aucun contrat/i)
  })

  it('retourne une erreur si plusieurs contrats actifs', async () => {
    const contractMock = mockContractLookup([{ id: 'c1' }, { id: 'c2' }])
    mockFrom.mockImplementation(contractMock.from)

    const res = await uploadExternalPayslip(baseParams)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/plusieurs contrats/i)
  })

  it('upload puis upsert avec le contractId résolu', async () => {
    const contractMock = mockContractLookup([{ id: 'contract-1' }])
    const dbRow = {
      id: 'payslip-1',
      employer_id: 'employer-1',
      employee_id: 'employee-1',
      contract_id: 'contract-1',
      year: 2026,
      month: 4,
      period_label: null,
      gross_pay: null,
      net_pay: null,
      total_hours: null,
      pas_rate: 0,
      is_exempt_patronal_ss: false,
      storage_path: 'employer-1/employee-1/2026/04/avril.pdf',
      storage_url: null,
      generated_at: '2026-04-23T10:00:00Z',
      created_at: '2026-04-23T10:00:00Z',
    }
    const payslipMock = mockPayslipUpsert(dbRow)

    mockFrom.mockImplementation((table: string) =>
      table === 'contracts' ? contractMock.from(table) : payslipMock.from(table)
    )

    const storageUpload = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ upload: storageUpload })

    const res = await uploadExternalPayslip(baseParams)

    expect(res.success).toBe(true)
    expect(res.payslip?.id).toBe('payslip-1')
    expect(res.payslip?.grossPay).toBeNull()
    expect(storageUpload).toHaveBeenCalledWith(
      'employer-1/employee-1/2026/04/avril.pdf',
      baseParams.file,
      expect.objectContaining({ contentType: 'application/pdf', upsert: true })
    )
  })

  it('saute la résolution de contrat quand un contractId est fourni', async () => {
    const dbRow = {
      id: 'payslip-2',
      employer_id: 'employer-1',
      employee_id: 'employee-1',
      contract_id: 'explicit-contract',
      year: 2026,
      month: 4,
      period_label: null,
      gross_pay: null,
      net_pay: null,
      total_hours: null,
      pas_rate: 0,
      is_exempt_patronal_ss: false,
      storage_path: 'employer-1/employee-1/2026/04/avril.pdf',
      storage_url: null,
      generated_at: '2026-04-23T10:00:00Z',
      created_at: '2026-04-23T10:00:00Z',
    }
    const payslipMock = mockPayslipUpsert(dbRow)
    mockFrom.mockImplementation(payslipMock.from)

    const storageUpload = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ upload: storageUpload })

    const res = await uploadExternalPayslip({ ...baseParams, contractId: 'explicit-contract' })

    expect(res.success).toBe(true)
    // from('contracts') ne doit pas avoir été appelé (résolution court-circuitée)
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('payslips')
  })

  it('remonte une erreur si le storage upload échoue', async () => {
    const contractMock = mockContractLookup([{ id: 'contract-1' }])
    mockFrom.mockImplementation(contractMock.from)

    const storageUpload = vi
      .fn()
      .mockResolvedValue({ error: { message: 'storage down' } })
    mockStorageFrom.mockReturnValue({ upload: storageUpload })

    const res = await uploadExternalPayslip(baseParams)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/upload/i)
  })
})

// ─── getPayslipsForEmployee ─────────────────────────────────────────

describe('getPayslipsForEmployee', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  function mockPayslipQuery(rows: Array<Record<string, unknown>> | null, error: unknown = null) {
    const order2 = vi.fn().mockResolvedValue({ data: rows, error })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const eq = vi.fn().mockReturnValue({ order: order1 })
    const select = vi.fn().mockReturnValue({ eq })
    return { select, eq }
  }

  it('retourne la liste mappée des bulletins de l\'employé', async () => {
    const rows = [
      {
        id: 'p1',
        employer_id: 'emp-1',
        employee_id: 'me',
        contract_id: 'c-1',
        year: 2026,
        month: 3,
        period_label: null,
        gross_pay: null,
        net_pay: null,
        total_hours: null,
        pas_rate: 0,
        is_exempt_patronal_ss: false,
        storage_path: 'emp-1/me/2026/03/bulletin.pdf',
        storage_url: null,
        generated_at: '2026-04-05T10:00:00Z',
        created_at: '2026-04-05T10:00:00Z',
      },
    ]
    const query = mockPayslipQuery(rows)
    mockFrom.mockReturnValue({ select: query.select })

    const result = await getPayslipsForEmployee('me')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
    expect(result[0].employeeId).toBe('me')
    expect(result[0].storagePath).toBe('emp-1/me/2026/03/bulletin.pdf')
    expect(query.eq).toHaveBeenCalledWith('employee_id', 'me')
  })

  it('retourne [] sur erreur', async () => {
    const query = mockPayslipQuery(null, { message: 'boom' })
    mockFrom.mockReturnValue({ select: query.select })

    const result = await getPayslipsForEmployee('me')
    expect(result).toEqual([])
  })

  it('retourne [] si data est null sans erreur', async () => {
    const query = mockPayslipQuery(null)
    mockFrom.mockReturnValue({ select: query.select })

    const result = await getPayslipsForEmployee('me')
    expect(result).toEqual([])
  })
})
