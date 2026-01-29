import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  validateShift,
} from './shiftService'

// Créer les mocks pour les méthodes chaînées
const mockSingle = vi.fn()
const mockEq = vi.fn()

// Mock du client Supabase avec structure chaînée complète
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mockEq,
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockEq,
      })),
      delete: vi.fn(() => ({
        eq: mockEq,
      })),
    })),
  },
}))

// Mock du service de notification
vi.mock('@/services/notificationService', () => ({
  getProfileName: vi.fn().mockResolvedValue('Jean Dupont'),
  createShiftCreatedNotification: vi.fn().mockResolvedValue(undefined),
  createShiftCancelledNotification: vi.fn().mockResolvedValue(undefined),
  createShiftModifiedNotification: vi.fn().mockResolvedValue(undefined),
}))

// Helper pour créer des données de shift mock
function createMockShiftDbData(overrides = {}) {
  return {
    id: 'shift-123',
    contract_id: 'contract-456',
    date: '2024-03-15',
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 60,
    tasks: ['Aide au lever', 'Préparation repas'],
    notes: 'RAS',
    status: 'planned',
    computed_pay: {
      basePay: 80,
      sundayMajoration: 0,
      holidayMajoration: 0,
      nightMajoration: 0,
      overtimeMajoration: 0,
      totalPay: 80,
    },
    validated_by_employer: false,
    validated_by_employee: false,
    created_at: '2024-03-01T10:00:00.000Z',
    updated_at: '2024-03-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('shiftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Configuration par défaut des mocks
    mockEq.mockReturnValue({
      single: mockSingle,
    })
  })

  describe('getShiftById', () => {
    it('devrait récupérer un shift par son ID', async () => {
      const mockShift = createMockShiftDbData()
      mockSingle.mockResolvedValue({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('shift-123')
      expect(result?.startTime).toBe('09:00')
      expect(result?.endTime).toBe('17:00')
    })

    it('devrait retourner null si le shift n\'existe pas', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await getShiftById('invalid-id')

      expect(result).toBeNull()
    })

    it('devrait mapper correctement le computed pay', async () => {
      const mockShift = createMockShiftDbData({
        computed_pay: {
          basePay: 100,
          sundayMajoration: 30,
          holidayMajoration: 0,
          nightMajoration: 20,
          overtimeMajoration: 25,
          totalPay: 175,
        },
      })
      mockSingle.mockResolvedValue({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.computedPay.basePay).toBe(100)
      expect(result?.computedPay.sundayMajoration).toBe(30)
      expect(result?.computedPay.totalPay).toBe(175)
    })

    it('devrait convertir snake_case en camelCase', async () => {
      const mockShift = createMockShiftDbData({
        contract_id: 'test-contract',
        break_duration: 45,
        start_time: '08:30',
        end_time: '16:30',
        validated_by_employer: true,
        validated_by_employee: false,
      })
      mockSingle.mockResolvedValue({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.contractId).toBe('test-contract')
      expect(result?.breakDuration).toBe(45)
      expect(result?.startTime).toBe('08:30')
      expect(result?.endTime).toBe('16:30')
      expect(result?.validatedByEmployer).toBe(true)
      expect(result?.validatedByEmployee).toBe(false)
    })

    it('devrait gérer les valeurs nulles/undefined', async () => {
      const mockShift = createMockShiftDbData({
        notes: null,
        tasks: null,
        break_duration: null,
        computed_pay: null,
      })
      mockSingle.mockResolvedValue({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.notes).toBeUndefined()
      expect(result?.tasks).toEqual([])
      expect(result?.breakDuration).toBe(0)
      expect(result?.computedPay.basePay).toBe(0)
    })

    it('devrait mapper correctement les dates', async () => {
      const mockShift = createMockShiftDbData({ date: '2024-03-15' })
      mockSingle.mockResolvedValue({ data: mockShift, error: null })

      const result = await getShiftById('shift-123')

      expect(result?.date).toBeInstanceOf(Date)
      expect(result?.date.toISOString()).toContain('2024-03-15')
    })
  })

  describe('createShift', () => {
    it('devrait créer un shift avec succès', async () => {
      const mockCreatedShift = createMockShiftDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedShift, error: null })
      mockEq.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { employee_id: 'emp-123', employer_id: 'employer-123' },
          error: null,
        }),
      })

      const result = await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        tasks: ['Aide au lever'],
        notes: 'Test',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('shift-123')
    })

    it('devrait lancer une erreur si la création échoue', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation' },
      })

      await expect(
        createShift('contract-456', {
          date: new Date('2024-03-15'),
          startTime: '09:00',
          endTime: '17:00',
        })
      ).rejects.toThrow('Constraint violation')
    })

    it('devrait utiliser les valeurs par défaut pour les champs optionnels', async () => {
      const mockCreatedShift = createMockShiftDbData({
        break_duration: 0,
        tasks: [],
        notes: null,
      })
      mockSingle.mockResolvedValue({ data: mockCreatedShift, error: null })
      mockEq.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await createShift('contract-456', {
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '17:00',
      })

      expect(result?.breakDuration).toBe(0)
      expect(result?.tasks).toEqual([])
    })
  })

  describe('updateShift', () => {
    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      })

      await expect(
        updateShift('shift-123', { status: 'completed' })
      ).rejects.toThrow('Update failed')
    })
  })

  describe('deleteShift', () => {
    it('devrait supprimer un shift avec succès', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(deleteShift('shift-123')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la suppression échoue', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Delete failed' },
      })

      await expect(deleteShift('shift-123')).rejects.toThrow('Delete failed')
    })
  })

  describe('validateShift', () => {
    it('devrait valider un shift côté employeur', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(validateShift('shift-123', 'employer')).resolves.not.toThrow()
    })

    it('devrait valider un shift côté employé', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(validateShift('shift-123', 'employee')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la validation échoue', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Validation failed' },
      })

      await expect(validateShift('shift-123', 'employer')).rejects.toThrow(
        'Validation failed'
      )
    })
  })
})
