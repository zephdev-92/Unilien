import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'
import { createContract, searchAuxiliaryByEmail, inviteEmployeeByEmail } from '@/services/auxiliaryService'
import {
  calculateAcquiredFromMonths,
  calculateDefaultMonthsWorked,
  getLeaveYear,
  getLeaveYearStartDate,
  getLeaveYearEndDate,
} from '@/lib/absence'
import { searchSchema, contractSchema } from '@/lib/validation/contractSchemas'
import type { SearchFormData, ContractFormData } from '@/lib/validation/contractSchemas'

interface UseNewContractFormOptions {
  employerId: string
  onSuccess: () => void
}

export function useNewContractForm({ employerId, onSuccess }: UseNewContractFormOptions) {
  const [step, setStep] = useState(0)
  const [foundEmployee, setFoundEmployee] = useState<{
    id: string
    firstName: string
    lastName: string
  } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Invitation flow
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [searchedEmail, setSearchedEmail] = useState('')

  const searchForm = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  })

  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractType: 'CDI',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      weeklyHours: 20,
      hourlyRate: 13,
    },
  })

  const watchContractType = contractForm.watch('contractType')
  const watchStartDate = contractForm.watch('startDate')
  const watchMonthsWorked = contractForm.watch('monthsWorked')
  const watchTakenDays = contractForm.watch('initialTakenDays')
  const watchWeeklyHours = contractForm.watch('weeklyHours')
  const watchHourlyRate = contractForm.watch('hourlyRate')

  const isRetroactive = useMemo(() => {
    if (!watchStartDate) return false
    const start = new Date(watchStartDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return start < today
  }, [watchStartDate])

  const leaveYearInfo = useMemo(() => {
    const now = new Date()
    const year = getLeaveYear(now)
    const start = getLeaveYearStartDate(year)
    const end = getLeaveYearEndDate(year)
    return {
      year,
      startLabel: format(start, 'dd/MM/yyyy'),
      endLabel: format(end, 'dd/MM/yyyy'),
    }
  }, [])

  const suggestedMonths = useMemo(() => {
    if (!isRetroactive || !watchStartDate) return 0
    return calculateDefaultMonthsWorked(new Date(watchStartDate))
  }, [isRetroactive, watchStartDate])

  const leavePreview = useMemo(() => {
    const months = watchMonthsWorked ?? suggestedMonths
    const acquired = calculateAcquiredFromMonths(months)
    const taken = watchTakenDays ?? 0
    return { acquired, taken, balance: acquired - taken }
  }, [watchMonthsWorked, watchTakenDays, suggestedMonths])

  const monthlyEstimate = useMemo(() => {
    return ((watchWeeklyHours || 0) * 4.33 * (watchHourlyRate || 0)).toFixed(2)
  }, [watchWeeklyHours, watchHourlyRate])

  const reset = () => {
    setStep(0)
    setFoundEmployee(null)
    setSearchError(null)
    setSubmitError(null)
    setShowInviteForm(false)
    setIsInviting(false)
    setInviteSuccess(false)
    setInviteError(null)
    setInviteFirstName('')
    setInviteLastName('')
    setSearchedEmail('')
    searchForm.reset()
    contractForm.reset()
  }

  const onSearch = async (data: SearchFormData) => {
    setIsSearching(true)
    setSearchError(null)
    setShowInviteForm(false)
    setInviteSuccess(false)
    setSearchedEmail(data.email)

    try {
      const employee = await searchAuxiliaryByEmail(data.email)

      if (!employee) {
        setSearchError(
          "Aucun auxiliaire trouve avec cette adresse email."
        )
        setShowInviteForm(true)
        return
      }

      setFoundEmployee(employee)
      setStep(1)
    } catch (error) {
      logger.error('Erreur recherche:', error)
      setSearchError('Une erreur est survenue lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }

  const onInvite = async () => {
    if (!inviteFirstName.trim() || !inviteLastName.trim() || !searchedEmail) {
      setInviteError('Veuillez renseigner le prenom et le nom.')
      return
    }

    setIsInviting(true)
    setInviteError(null)

    try {
      const { userId } = await inviteEmployeeByEmail(
        searchedEmail,
        inviteFirstName.trim(),
        inviteLastName.trim(),
        employerId,
      )

      setInviteSuccess(true)
      setFoundEmployee({
        id: userId,
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
      })
    } catch (error) {
      logger.error('Erreur invitation:', error)
      setInviteError(error instanceof Error ? error.message : "Erreur lors de l'envoi de l'invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const onSubmitContract = async (data: ContractFormData) => {
    if (!foundEmployee) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createContract(employerId, foundEmployee.id, {
        contractType: data.contractType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        weeklyHours: data.weeklyHours,
        hourlyRate: data.hourlyRate,
        initialMonthsWorked: isRetroactive
          ? (data.monthsWorked ?? suggestedMonths)
          : undefined,
        initialTakenDays: isRetroactive ? (data.initialTakenDays ?? 0) : undefined,
      })

      onSuccess()
    } catch (error) {
      logger.error('Erreur creation contrat:', error)
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    // State
    step,
    setStep,
    foundEmployee,
    setFoundEmployee,
    isSearching,
    isSubmitting,
    searchError,
    submitError,
    // Invitation
    showInviteForm,
    isInviting,
    inviteSuccess,
    inviteError,
    inviteFirstName,
    setInviteFirstName,
    inviteLastName,
    setInviteLastName,
    searchedEmail,
    onInvite,
    // Forms
    searchForm,
    contractForm,
    // Watched values
    watchContractType,
    // Computed
    isRetroactive,
    leaveYearInfo,
    suggestedMonths,
    leavePreview,
    monthlyEstimate,
    // Handlers
    reset,
    onSearch,
    onSubmitContract,
  }
}
