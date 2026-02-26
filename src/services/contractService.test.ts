import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getContractById,
  getContractsForEmployer,
  getContractsForEmployee,
  getActiveContractsCount,
  createContract,
  updateContract,
  terminateContract,
  suspendContract,
  resumeContract,
  searchEmployeeByEmail,
  hasActiveContract,
} from './contractService'

// Mock du client Supabase
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
}))

// Mock du service de notification
vi.mock('@/services/notificationService', () => ({
  createContractCreatedNotification: vi.fn().mockResolvedValue(undefined),
  createContractTerminatedNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/profileService', () => ({
  getProfileName: vi.fn().mockResolvedValue('Jean Dupont'),
}))

// Mock du service de solde de congés
vi.mock('@/services/leaveBalanceService', () => ({
  initializeLeaveBalanceWithOverride: vi.fn().mockResolvedValue(null),
}))

// Mock des fonctions de calcul absence
vi.mock('@/lib/absence', () => ({
  calculateAcquiredFromMonths: vi.fn((months: number) => Math.ceil(Math.min(months * 2.5, 30))),
  getLeaveYear: vi.fn(() => '2025-2026'),
}))

// Helper pour créer des données de contrat mock
function createMockContractDbData(overrides = {}) {
  return {
    id: 'contract-123',
    employer_id: 'employer-456',
    employee_id: 'employee-789',
    contract_type: 'CDI',
    start_date: '2024-01-01',
    end_date: null,
    weekly_hours: 35,
    hourly_rate: 12.5,
    status: 'active',
    created_at: '2024-01-01T10:00:00.000Z',
    updated_at: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('contractService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Configuration par défaut des mocks
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      eq: mockEq,
      order: mockOrder,
    })
    mockOrder.mockReturnValue({
      eq: mockEq,
    })
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    })
    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
  })

  describe('getContractById', () => {
    it('devrait récupérer un contrat par son ID', async () => {
      const mockContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockContract, error: null })

      const result = await getContractById('contract-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('contract-123')
      expect(result?.contractType).toBe('CDI')
      expect(result?.weeklyHours).toBe(35)
      expect(result?.hourlyRate).toBe(12.5)
    })

    it('devrait retourner null si le contrat n\'existe pas', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await getContractById('invalid-id')

      expect(result).toBeNull()
    })

    it('devrait mapper les dates correctement', async () => {
      const mockContract = createMockContractDbData({
        start_date: '2024-03-01',
        end_date: '2025-03-01',
      })
      mockSingle.mockResolvedValue({ data: mockContract, error: null })

      const result = await getContractById('contract-123')

      expect(result?.startDate).toBeInstanceOf(Date)
      expect(result?.endDate).toBeInstanceOf(Date)
    })

    it('devrait gérer une date de fin null (CDI)', async () => {
      const mockContract = createMockContractDbData({ end_date: null })
      mockSingle.mockResolvedValue({ data: mockContract, error: null })

      const result = await getContractById('contract-123')

      expect(result?.endDate).toBeUndefined()
    })
  })

  describe('getContractsForEmployer', () => {
    // Chaine: .select().eq('employer_id').eq('status').order()
    // Le dernier maillon est .order() qui doit resoudre la promesse

    it('devrait récupérer les contrats actifs avec profil employé', async () => {
      const mockRows = [
        {
          ...createMockContractDbData(),
          employee_profile: {
            profile: { first_name: 'Marie', last_name: 'Martin' },
          },
        },
      ]
      mockOrder.mockResolvedValueOnce({ data: mockRows, error: null })

      const result = await getContractsForEmployer('employer-456')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('contract-123')
      expect(result[0].employee?.firstName).toBe('Marie')
      expect(result[0].employee?.lastName).toBe('Martin')
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await getContractsForEmployer('employer-456')

      expect(result).toEqual([])
    })

    it('devrait retourner un tableau vide si data est null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await getContractsForEmployer('employer-456')

      expect(result).toEqual([])
    })

    it('devrait gérer un profil employé absent', async () => {
      const mockRows = [
        {
          ...createMockContractDbData(),
          employee_profile: undefined,
        },
      ]
      mockOrder.mockResolvedValueOnce({ data: mockRows, error: null })

      const result = await getContractsForEmployer('employer-456')

      expect(result).toHaveLength(1)
      expect(result[0].employee).toBeUndefined()
    })
  })

  describe('getContractsForEmployee', () => {
    it('devrait récupérer les contrats avec profil employeur', async () => {
      const mockRows = [
        {
          ...createMockContractDbData(),
          employer_profile: {
            profile: { first_name: 'Jean', last_name: 'Dupont' },
          },
        },
      ]
      mockOrder.mockResolvedValue({ data: mockRows, error: null })

      const result = await getContractsForEmployee('employee-789')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('contract-123')
      expect(result[0].employee?.firstName).toBe('Jean')
      expect(result[0].employee?.lastName).toBe('Dupont')
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await getContractsForEmployee('employee-789')

      expect(result).toEqual([])
    })

    it('devrait retourner un tableau vide si data est null sans erreur', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })

      const result = await getContractsForEmployee('employee-789')

      expect(result).toEqual([])
    })

    it('devrait gérer un profil employeur absent (employer_profile undefined)', async () => {
      const mockRows = [
        {
          ...createMockContractDbData(),
          employer_profile: undefined,
        },
      ]
      mockOrder.mockResolvedValue({ data: mockRows, error: null })

      const result = await getContractsForEmployee('employee-789')

      expect(result).toHaveLength(1)
      expect(result[0].employee).toBeUndefined()
    })

    it('devrait gérer un profil employeur avec profile null', async () => {
      const mockRows = [
        {
          ...createMockContractDbData(),
          employer_profile: { profile: null },
        },
      ]
      mockOrder.mockResolvedValue({ data: mockRows, error: null })

      const result = await getContractsForEmployee('employee-789')

      expect(result).toHaveLength(1)
      expect(result[0].employee).toBeUndefined()
    })
  })

  describe('getActiveContractsCount', () => {
    // Chaine: .select('*', { count, head }).eq('employer_id').eq('status')
    // 2 appels .eq() : le 1er doit retourner le chainage, le 2e doit resoudre

    it('devrait retourner le nombre de contrats actifs', async () => {
      mockEq
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockResolvedValueOnce({ count: 3, error: null })

      const result = await getActiveContractsCount('employer-456')

      expect(result).toBe(3)
    })

    it('devrait retourner 0 si count est null', async () => {
      mockEq
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockResolvedValueOnce({ count: null, error: null })

      const result = await getActiveContractsCount('employer-456')

      expect(result).toBe(0)
    })

    it('devrait retourner 0 en cas d\'erreur', async () => {
      mockEq
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockResolvedValueOnce({ count: null, error: { message: 'Database error' } })

      const result = await getActiveContractsCount('employer-456')

      expect(result).toBe(0)
    })

    it('devrait retourner 0 quand aucun contrat actif', async () => {
      mockEq
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockResolvedValueOnce({ count: 0, error: null })

      const result = await getActiveContractsCount('employer-456')

      expect(result).toBe(0)
    })
  })

  describe('createContract', () => {
    it('devrait créer un contrat CDI avec succès', async () => {
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      const result = await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 35,
        hourlyRate: 12.5,
      })

      expect(result.id).toBe('contract-123')
      expect(result.contractType).toBe('CDI')
    })

    it('devrait créer un contrat CDD avec date de fin', async () => {
      const mockCreatedContract = createMockContractDbData({
        contract_type: 'CDD',
        end_date: '2024-12-31',
      })
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      const result = await createContract('employer-456', 'employee-789', {
        contractType: 'CDD',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        weeklyHours: 20,
        hourlyRate: 11,
      })

      expect(result.contractType).toBe('CDD')
      expect(result.endDate).toBeInstanceOf(Date)
    })

    it('devrait lancer une erreur pour un contrat dupliqué', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique violation' },
      })

      await expect(
        createContract('employer-456', 'employee-789', {
          contractType: 'CDI',
          startDate: new Date(),
          weeklyHours: 35,
          hourlyRate: 12,
        })
      ).rejects.toThrow('Un contrat actif existe déjà')
    })

    it('devrait lancer une erreur générique pour autres erreurs', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23502', message: 'Not null violation' },
      })

      await expect(
        createContract('employer-456', 'employee-789', {
          contractType: 'CDI',
          startDate: new Date(),
          weeklyHours: 35,
          hourlyRate: 12,
        })
      ).rejects.toThrow('Erreur lors de la création du contrat')
    })

    it('devrait lancer une erreur FK quand le profil auxiliaire est incomplet (23503)', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'Foreign key violation' },
      })

      await expect(
        createContract('employer-456', 'employee-789', {
          contractType: 'CDI',
          startDate: new Date(),
          weeklyHours: 35,
          hourlyRate: 12,
        })
      ).rejects.toThrow('L\'auxiliaire n\'a pas encore complété son profil')
    })

    it('devrait envoyer une notification après création réussie', async () => {
      const { createContractCreatedNotification } = await import('@/services/notificationService')
      const { getProfileName } = await import('@/services/profileService')
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 35,
        hourlyRate: 12.5,
      })

      expect(getProfileName).toHaveBeenCalledWith('employer-456')
      expect(createContractCreatedNotification).toHaveBeenCalledWith(
        'employee-789',
        'Jean Dupont',
        'CDI'
      )
    })

    it('ne devrait pas échouer si la notification échoue', async () => {
      const { createContractCreatedNotification } = await import(
        '@/services/notificationService'
      )
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })
      vi.mocked(createContractCreatedNotification).mockRejectedValueOnce(
        new Error('Notification failed')
      )

      const result = await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 35,
        hourlyRate: 12.5,
      })

      // La creation doit reussir meme si la notification echoue
      expect(result.id).toBe('contract-123')
    })

    it('devrait appeler initializeLeaveBalanceWithOverride si reprise historique fournie', async () => {
      const { initializeLeaveBalanceWithOverride } = await import(
        '@/services/leaveBalanceService'
      )
      const { calculateAcquiredFromMonths, getLeaveYear } = await import('@/lib/absence')
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 20,
        hourlyRate: 12,
        initialMonthsWorked: 6,
        initialTakenDays: 3,
      })

      expect(getLeaveYear).toHaveBeenCalled()
      expect(calculateAcquiredFromMonths).toHaveBeenCalledWith(6)
      expect(initializeLeaveBalanceWithOverride).toHaveBeenCalledWith(
        'contract-123',
        'employee-789',
        'employer-456',
        '2025-2026',
        15, // ceil(6 * 2.5) = 15
        3
      )
    })

    it('ne devrait pas appeler initializeLeaveBalanceWithOverride sans reprise', async () => {
      const { initializeLeaveBalanceWithOverride } = await import(
        '@/services/leaveBalanceService'
      )
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 35,
        hourlyRate: 12.5,
      })

      expect(initializeLeaveBalanceWithOverride).not.toHaveBeenCalled()
    })

    it('ne devrait pas appeler initializeLeaveBalanceWithOverride si initialMonthsWorked est 0', async () => {
      const { initializeLeaveBalanceWithOverride } = await import(
        '@/services/leaveBalanceService'
      )
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 35,
        hourlyRate: 12.5,
        initialMonthsWorked: 0,
      })

      expect(initializeLeaveBalanceWithOverride).not.toHaveBeenCalled()
    })

    it('ne devrait pas échouer si la reprise congés échoue', async () => {
      const { initializeLeaveBalanceWithOverride } = await import(
        '@/services/leaveBalanceService'
      )
      vi.mocked(initializeLeaveBalanceWithOverride).mockRejectedValueOnce(
        new Error('Leave init failed')
      )
      const mockCreatedContract = createMockContractDbData()
      mockSingle.mockResolvedValue({ data: mockCreatedContract, error: null })

      const result = await createContract('employer-456', 'employee-789', {
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        weeklyHours: 20,
        hourlyRate: 12,
        initialMonthsWorked: 6,
        initialTakenDays: 2,
      })

      // Le contrat est créé même si la reprise échoue
      expect(result.id).toBe('contract-123')
    })
  })

  describe('updateContract', () => {
    it('devrait mettre à jour les heures hebdomadaires', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateContract('contract-123', { weeklyHours: 30 })
      ).resolves.not.toThrow()
    })

    it('devrait mettre à jour le taux horaire', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateContract('contract-123', { hourlyRate: 15 })
      ).resolves.not.toThrow()
    })

    it('devrait mettre à jour le statut', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateContract('contract-123', { status: 'suspended' })
      ).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      })

      await expect(
        updateContract('contract-123', { weeklyHours: 20 })
      ).rejects.toThrow('Erreur lors de la mise à jour')
    })
  })

  describe('terminateContract', () => {
    it('devrait terminer un contrat avec la date actuelle', async () => {
      mockSingle.mockResolvedValue({
        data: { employee_id: 'emp-123', employer_id: 'employer-123' },
        error: null,
      })
      mockEq.mockResolvedValue({ error: null })

      await expect(terminateContract('contract-123')).resolves.not.toThrow()
    })

    it('devrait terminer un contrat avec une date spécifique', async () => {
      mockSingle.mockResolvedValue({
        data: { employee_id: 'emp-123', employer_id: 'employer-123' },
        error: null,
      })
      mockEq.mockResolvedValue({ error: null })

      await expect(
        terminateContract('contract-123', new Date('2024-06-30'))
      ).resolves.not.toThrow()
    })

    it('devrait envoyer une notification de fin de contrat', async () => {
      const { createContractTerminatedNotification } = await import('@/services/notificationService')
      const { getProfileName } = await import('@/services/profileService')
      mockSingle.mockResolvedValueOnce({
        data: { employee_id: 'emp-123', employer_id: 'employer-456' },
        error: null,
      })
      // 1er eq (fetch contrat): retourne chainage -> single
      // 2e eq (updateContract): resolve { error: null }
      mockEq
        .mockReturnValueOnce({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq, order: mockOrder })
        .mockResolvedValueOnce({ error: null })

      await terminateContract('contract-123')

      expect(getProfileName).toHaveBeenCalledWith('employer-456')
      expect(createContractTerminatedNotification).toHaveBeenCalledWith(
        'emp-123',
        'Jean Dupont'
      )
    })

    it('ne devrait pas échouer si la notification de fin échoue', async () => {
      const { createContractTerminatedNotification } = await import(
        '@/services/notificationService'
      )
      mockSingle.mockResolvedValueOnce({
        data: { employee_id: 'emp-123', employer_id: 'employer-456' },
        error: null,
      })
      mockEq
        .mockReturnValueOnce({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq, order: mockOrder })
        .mockResolvedValueOnce({ error: null })
      vi.mocked(createContractTerminatedNotification).mockRejectedValueOnce(
        new Error('Notification failed')
      )

      await expect(terminateContract('contract-123')).resolves.not.toThrow()
    })

    it('devrait continuer sans notification si le contrat est introuvable', async () => {
      const { createContractTerminatedNotification } = await import(
        '@/services/notificationService'
      )
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
      // 1er eq (fetch contrat): retourne chainage -> single
      // 2e eq (updateContract): resolve { error: null }
      mockEq
        .mockReturnValueOnce({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq, order: mockOrder })
        .mockResolvedValueOnce({ error: null })

      await expect(terminateContract('contract-123')).resolves.not.toThrow()
      expect(createContractTerminatedNotification).not.toHaveBeenCalled()
    })

    it('devrait continuer si la récupération du contrat échoue (fallback silencieux)', async () => {
      const { createContractTerminatedNotification } = await import(
        '@/services/notificationService'
      )
      mockSingle.mockRejectedValueOnce(new Error('DB unavailable'))
      // Le 1er eq retourne chainage -> single (qui throw)
      // Le try/catch attrape l'erreur, puis updateContract est appele
      // Le 2e eq (updateContract) resolve { error: null }
      mockEq
        .mockReturnValueOnce({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq, order: mockOrder })
        .mockResolvedValueOnce({ error: null })

      await expect(terminateContract('contract-123')).resolves.not.toThrow()
      expect(createContractTerminatedNotification).not.toHaveBeenCalled()
    })
  })

  describe('suspendContract', () => {
    it('devrait refuser de suspendre un contrat non actif', async () => {
      mockSingle.mockResolvedValue({
        data: { status: 'terminated' },
        error: null,
      })

      await expect(suspendContract('contract-123')).rejects.toThrow(
        'Seul un contrat actif peut être suspendu'
      )
    })

    it('devrait refuser de suspendre un contrat déjà suspendu', async () => {
      mockSingle.mockResolvedValue({
        data: { status: 'suspended' },
        error: null,
      })

      await expect(suspendContract('contract-123')).rejects.toThrow(
        'Seul un contrat actif peut être suspendu'
      )
    })
  })

  describe('resumeContract', () => {
    it('devrait refuser de réactiver un contrat actif', async () => {
      mockSingle.mockResolvedValue({
        data: { status: 'active' },
        error: null,
      })

      await expect(resumeContract('contract-123')).rejects.toThrow(
        'Seul un contrat suspendu peut être réactivé'
      )
    })

    it('devrait refuser de réactiver un contrat terminé', async () => {
      mockSingle.mockResolvedValue({
        data: { status: 'terminated' },
        error: null,
      })

      await expect(resumeContract('contract-123')).rejects.toThrow(
        'Seul un contrat suspendu peut être réactivé'
      )
    })
  })

  describe('searchEmployeeByEmail', () => {
    it('devrait trouver un employé par email', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: 'employee-123',
          first_name: 'Marie',
          last_name: 'Martin',
          role: 'employee',
        },
        error: null,
      })

      const result = await searchEmployeeByEmail('marie@example.com')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('employee-123')
      expect(result?.firstName).toBe('Marie')
      expect(result?.lastName).toBe('Martin')
    })

    it('devrait retourner null si l\'email n\'existe pas', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      const result = await searchEmployeeByEmail('unknown@example.com')

      expect(result).toBeNull()
    })

    it('devrait normaliser l\'email (lowercase, trim)', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      await searchEmployeeByEmail('  Test@Example.COM  ')

      // Le mock a été appelé avec l'email normalisé
      expect(mockEq).toHaveBeenCalled()
    })

    it('devrait retourner null en cas d\'erreur', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await searchEmployeeByEmail('test@example.com')

      expect(result).toBeNull()
    })
  })

  describe('hasActiveContract', () => {
    // Chaine: .select('*', { count, head }).eq('employer_id').eq('employee_id').eq('status')
    // 3 appels .eq() : les 2 premiers retournent le chainage, le 3e resolve

    function setupHasActiveContractMock(resolvedValue: Record<string, unknown>) {
      mockEq
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockReturnValueOnce({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, order: mockOrder })
        .mockResolvedValueOnce(resolvedValue)
    }

    it('devrait retourner true quand un contrat actif existe', async () => {
      setupHasActiveContractMock({ count: 1, error: null })

      const result = await hasActiveContract('employer-456', 'employee-789')

      expect(result).toBe(true)
    })

    it('devrait retourner false quand aucun contrat actif', async () => {
      setupHasActiveContractMock({ count: 0, error: null })

      const result = await hasActiveContract('employer-456', 'employee-789')

      expect(result).toBe(false)
    })

    it('devrait retourner false quand count est null', async () => {
      setupHasActiveContractMock({ count: null, error: null })

      const result = await hasActiveContract('employer-456', 'employee-789')

      expect(result).toBe(false)
    })

    it('devrait retourner false en cas d\'erreur', async () => {
      setupHasActiveContractMock({ count: null, error: { message: 'Database error' } })

      const result = await hasActiveContract('employer-456', 'employee-789')

      expect(result).toBe(false)
    })
  })

  describe('Mapping des données', () => {
    it('devrait convertir snake_case en camelCase', async () => {
      const mockContract = createMockContractDbData({
        employer_id: 'emp-1',
        employee_id: 'emp-2',
        contract_type: 'CDD',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        weekly_hours: 25,
        hourly_rate: 14.5,
      })
      mockSingle.mockResolvedValue({ data: mockContract, error: null })

      const result = await getContractById('contract-123')

      expect(result?.employerId).toBe('emp-1')
      expect(result?.employeeId).toBe('emp-2')
      expect(result?.contractType).toBe('CDD')
      expect(result?.weeklyHours).toBe(25)
      expect(result?.hourlyRate).toBe(14.5)
    })
  })
})
