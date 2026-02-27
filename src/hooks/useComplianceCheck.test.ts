import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ComplianceResult, ComputedPay } from '@/types'
import type { ShiftForValidation } from '@/lib/compliance'

// Mock compliance module
const mockValidateShift = vi.fn()
const mockQuickValidate = vi.fn()
const mockCalculateShiftPay = vi.fn()
const mockCalculateShiftDuration = vi.fn()

vi.mock('@/lib/compliance', () => ({
  validateShift: (...args: unknown[]) => mockValidateShift(...args),
  quickValidate: (...args: unknown[]) => mockQuickValidate(...args),
  calculateShiftPay: (...args: unknown[]) => mockCalculateShiftPay(...args),
  calculateShiftDuration: (...args: unknown[]) => mockCalculateShiftDuration(...args),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useComplianceCheck, useQuickValidation } from './useComplianceCheck'
import { logger } from '@/lib/logger'

// Helpers
function createShiftInput(overrides = {}) {
  return {
    contractId: 'contract-1',
    employeeId: 'employee-1',
    date: new Date('2025-06-15'),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 30,
    hasNightAction: false,
    ...overrides,
  }
}

function createContractInput(overrides = {}) {
  return {
    weeklyHours: 35,
    hourlyRate: 13.5,
    ...overrides,
  }
}

function createValidComplianceResult(): ComplianceResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
  }
}

function createInvalidComplianceResult(): ComplianceResult {
  return {
    valid: false,
    errors: [
      {
        code: 'MAX_DAILY_HOURS',
        message: 'Durée maximale journalière dépassée',
        rule: 'Convention IDCC 3239 Art. 40',
        blocking: true,
      },
    ],
    warnings: [
      {
        code: 'APPROACHING_MAX_WEEKLY',
        message: 'Proche du maximum hebdomadaire',
        rule: 'Convention IDCC 3239 Art. 41',
      },
    ],
  }
}

function createComputedPay(): ComputedPay {
  return {
    basePay: 108.0,
    sundayMajoration: 0,
    holidayMajoration: 0,
    nightMajoration: 0,
    overtimeMajoration: 0,
    totalPay: 108.0,
  }
}

describe('useComplianceCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockCalculateShiftDuration.mockReturnValue(450) // 7h30 en minutes
    mockValidateShift.mockReturnValue(createValidComplianceResult())
    mockCalculateShiftPay.mockReturnValue(createComputedPay())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait retourner les valeurs par défaut quand shift est null', async () => {
    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: null,
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    // Avancer le debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.complianceResult).toBeNull()
    expect(result.current.computedPay).toBeNull()
    expect(result.current.durationHours).toBe(0)
    expect(result.current.isValid).toBe(true)
    expect(result.current.hasErrors).toBe(false)
    expect(result.current.hasWarnings).toBe(false)
  })

  it('devrait valider un shift avec résultat complet', async () => {
    const shift = createShiftInput()
    const contract = createContractInput()

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift,
        contract,
        existingShifts: [],
      })
    )

    // Avancer le debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockValidateShift).toHaveBeenCalled()
    expect(mockCalculateShiftPay).toHaveBeenCalled()
    expect(result.current.complianceResult).toEqual(createValidComplianceResult())
    expect(result.current.computedPay).toEqual(createComputedPay())
    expect(result.current.isValid).toBe(true)
  })

  it('devrait calculer la durée correctement en heures', () => {
    mockCalculateShiftDuration.mockReturnValue(480) // 8h en minutes

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    expect(result.current.durationHours).toBe(8)
    expect(mockCalculateShiftDuration).toHaveBeenCalledWith('09:00', '17:00', 30)
  })

  it('devrait retourner durationHours = 0 si startTime ou endTime manquant', () => {
    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput({ startTime: '', endTime: '' }),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    expect(result.current.durationHours).toBe(0)
  })

  it('devrait respecter le délai de debounce', () => {
    const shift = createShiftInput()

    renderHook(() =>
      useComplianceCheck({
        shift,
        contract: createContractInput(),
        existingShifts: [],
        debounceMs: 500,
      })
    )

    // Avant le debounce
    expect(mockValidateShift).not.toHaveBeenCalled()

    // Pendant le debounce (avant la fin)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockValidateShift).not.toHaveBeenCalled()

    // Après le debounce
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockValidateShift).toHaveBeenCalledTimes(1)
  })

  it('devrait mettre à jour isValid, hasErrors et hasWarnings correctement', () => {
    mockValidateShift.mockReturnValue(createInvalidComplianceResult())

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.isValid).toBe(false)
    expect(result.current.hasErrors).toBe(true)
    expect(result.current.hasWarnings).toBe(true)
  })

  it('devrait revalider quand revalidate est appelé', () => {
    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    // Premier debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockValidateShift).toHaveBeenCalledTimes(1)

    // Appel manuel de revalidate
    act(() => {
      result.current.revalidate()
    })
    expect(mockValidateShift).toHaveBeenCalledTimes(2)
  })

  it('devrait gérer les erreurs de validation et logger l\'erreur', () => {
    mockValidateShift.mockImplementation(() => {
      throw new Error('Erreur interne validation')
    })

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(logger.error).toHaveBeenCalledWith(
      'Erreur validation conformité:',
      expect.any(Error)
    )
    expect(result.current.complianceResult).toEqual({
      valid: false,
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message: 'Erreur lors de la validation',
          rule: 'Validation système',
          blocking: false,
        },
      ],
      warnings: [],
    })
    expect(result.current.isValid).toBe(false)
    expect(result.current.hasErrors).toBe(true)
    expect(result.current.validationError).toBe('La validation de conformité a échoué')
  })

  it('devrait retourner validationError null en cas de succès', () => {
    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.validationError).toBeNull()
  })

  it('devrait mettre computedPay à null sans affecter complianceResult si calculateShiftPay échoue', () => {
    mockCalculateShiftPay.mockImplementation(() => {
      throw new Error('Erreur calcul paie')
    })

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(logger.error).toHaveBeenCalledWith('Erreur calcul paie:', expect.any(Error))
    expect(result.current.computedPay).toBeNull()
    expect(result.current.complianceResult).toEqual(createValidComplianceResult())
    expect(result.current.validationError).toBeNull()
  })

  it('devrait ne pas calculer la paie si contract est null', () => {
    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: null,
        existingShifts: [],
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockValidateShift).toHaveBeenCalled()
    expect(mockCalculateShiftPay).not.toHaveBeenCalled()
    expect(result.current.computedPay).toBeNull()
  })

  it('devrait passer les absences approuvées à validateShift', () => {
    const approvedAbsences = [
      {
        id: 'abs-1',
        employeeId: 'employee-1',
        absenceType: 'sick',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-12'),
        status: 'approved',
      },
    ]

    renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
        approvedAbsences,
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockValidateShift).toHaveBeenCalledWith(
      expect.any(Object),
      [],
      approvedAbsences
    )
  })

  it('devrait exclure le shift en cours d\'édition via editingShiftId', () => {
    renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
        editingShiftId: 'shift-edit-1',
      })
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Le shiftForValidation devrait inclure l'id
    expect(mockValidateShift).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shift-edit-1' }),
      [],
      []
    )
  })

  it('devrait retourner durationHours = 0 si calculateShiftDuration lance une erreur', () => {
    mockCalculateShiftDuration.mockImplementation(() => {
      throw new Error('Format invalide')
    })

    const { result } = renderHook(() =>
      useComplianceCheck({
        shift: createShiftInput(),
        contract: createContractInput(),
        existingShifts: [],
      })
    )

    expect(result.current.durationHours).toBe(0)
  })

  it('devrait réinitialiser le résultat quand le shift passe de valide à null', () => {
    const { result, rerender } = renderHook(
      (props: { shift: ReturnType<typeof createShiftInput> | null }) =>
        useComplianceCheck({
          shift: props.shift,
          contract: createContractInput(),
          existingShifts: [],
        }),
      { initialProps: { shift: createShiftInput() } }
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.complianceResult).not.toBeNull()

    // Passer le shift à null
    rerender({ shift: null })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.complianceResult).toBeNull()
    expect(result.current.computedPay).toBeNull()
  })
})

describe('useQuickValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner canCreate=true et blockingErrors vide quand shift est null', () => {
    const { result } = renderHook(() => useQuickValidation(null, []))

    expect(result.current.canCreate).toBe(true)
    expect(result.current.blockingErrors).toEqual([])
  })

  it('devrait appeler quickValidate avec le shift et les shifts existants', () => {
    const shift: ShiftForValidation = {
      contractId: 'contract-1',
      employeeId: 'employee-1',
      date: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 30,
    }
    const existingShifts: ShiftForValidation[] = [
      {
        id: 'shift-existing',
        contractId: 'contract-1',
        employeeId: 'employee-1',
        date: new Date('2025-06-15'),
        startTime: '08:00',
        endTime: '09:00',
        breakDuration: 0,
      },
    ]

    mockQuickValidate.mockReturnValue({ canCreate: true, blockingErrors: [] })

    const { result } = renderHook(() => useQuickValidation(shift, existingShifts))

    expect(mockQuickValidate).toHaveBeenCalledWith(shift, existingShifts)
    expect(result.current.canCreate).toBe(true)
  })

  it('devrait retourner les erreurs bloquantes quand la validation échoue', () => {
    const shift: ShiftForValidation = {
      contractId: 'contract-1',
      employeeId: 'employee-1',
      date: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '22:00',
      breakDuration: 0,
    }

    mockQuickValidate.mockReturnValue({
      canCreate: false,
      blockingErrors: ['Durée maximale journalière dépassée (13h > 10h)'],
    })

    const { result } = renderHook(() => useQuickValidation(shift, []))

    expect(result.current.canCreate).toBe(false)
    expect(result.current.blockingErrors).toEqual([
      'Durée maximale journalière dépassée (13h > 10h)',
    ])
  })
})
