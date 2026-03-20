import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getAuxiliariesForEmployer,
  type AuxiliarySummary,
} from '@/services/auxiliaryService'
import {
  getCaregiver,
  getCaregiversForEmployer,
  removeCaregiverFromEmployer,
  type CaregiverWithProfile,
} from '@/services/caregiverService'
import { getAbsencesForEmployer } from '@/services/absenceService'
import { getContractsForEmployer } from '@/services/contractService'
import type { Contract } from '@/types'
import { logger } from '@/lib/logger'
import type { Caregiver } from '@/types'

export interface UseTeamPageReturn {
  // Auth
  profile: ReturnType<typeof useAuth>['profile']
  userRole: ReturnType<typeof useAuth>['userRole']
  isEmployer: boolean
  effectiveEmployerId: string | undefined
  currentCaregiver: Caregiver | null
  isLoadingCurrentCaregiver: boolean

  // Auxiliaires
  auxiliaries: AuxiliarySummary[]
  isLoadingAuxiliaries: boolean
  auxiliariesError: string | null
  auxiliaryFilter: 'all' | 'active' | 'inactive' | 'on_leave'
  setAuxiliaryFilter: (f: 'all' | 'active' | 'inactive' | 'on_leave') => void
  filteredAuxiliaries: AuxiliarySummary[]
  activeAuxCount: number
  inactiveAuxCount: number
  onLeaveAuxCount: number
  isNewContractOpen: boolean
  setIsNewContractOpen: (v: boolean) => void
  selectedAuxiliary: AuxiliarySummary | null
  setSelectedAuxiliary: (a: AuxiliarySummary | null) => void
  refreshAuxiliaries: () => void

  // Aidants
  caregivers: CaregiverWithProfile[]
  isLoadingCaregivers: boolean
  caregiversError: string | null
  isAddCaregiverOpen: boolean
  setIsAddCaregiverOpen: (v: boolean) => void
  isNewCaregiverContractOpen: boolean
  setIsNewCaregiverContractOpen: (v: boolean) => void
  selectedCaregiver: CaregiverWithProfile | null
  setSelectedCaregiver: (c: CaregiverWithProfile | null) => void
  caregiverToRemove: CaregiverWithProfile | null
  isRemoving: boolean
  removeError: string | null
  handleRemoveCaregiver: (c: CaregiverWithProfile) => void
  confirmRemoveCaregiver: () => Promise<void>
  cancelRemoveCaregiver: () => void
  refreshCaregivers: () => void

  // Contrats aidants
  caregiverContractMap: Record<string, Contract>

  // Tabs
  activeTab: string
  setActiveTab: (t: string) => void
}

export function useTeamPage(): UseTeamPageReturn {
  const { profile, userRole } = useAuth()

  // Auxiliaires state
  const [auxiliaries, setAuxiliaries] = useState<AuxiliarySummary[]>([])
  const [isLoadingAuxiliaries, setIsLoadingAuxiliaries] = useState(true)
  const [isNewContractOpen, setIsNewContractOpen] = useState(false)
  const [selectedAuxiliary, setSelectedAuxiliary] = useState<AuxiliarySummary | null>(null)
  const [auxiliaryFilter, setAuxiliaryFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all')
  const [auxiliariesError, setAuxiliariesError] = useState<string | null>(null)

  // Caregivers state
  const [caregivers, setCaregivers] = useState<CaregiverWithProfile[]>([])
  const [isLoadingCaregivers, setIsLoadingCaregivers] = useState(true)
  const [isAddCaregiverOpen, setIsAddCaregiverOpen] = useState(false)
  const [isNewCaregiverContractOpen, setIsNewCaregiverContractOpen] = useState(false)
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverWithProfile | null>(null)
  const [caregiversError, setCaregiversError] = useState<string | null>(null)
  const [caregiverToRemove, setCaregiverToRemove] = useState<CaregiverWithProfile | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  // Contrats aidants (map caregiverId → contract)
  const [caregiverContractMap, setCaregiverContractMap] = useState<Record<string, Contract>>({})

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('auxiliaries')

  // Caregiver data (pour les aidants avec canManageTeam)
  const [currentCaregiver, setCurrentCaregiver] = useState<Caregiver | null>(null)
  const [isLoadingCurrentCaregiver, setIsLoadingCurrentCaregiver] = useState(userRole === 'caregiver')

  const isEmployer = userRole === 'employer'
  const effectiveEmployerId = isEmployer ? profile?.id : currentCaregiver?.employerId

  // Charger les données de l'aidant connecté
  useEffect(() => {
    if (!profile?.id || userRole !== 'caregiver') {
      setIsLoadingCurrentCaregiver(false)
      return
    }

    const loadCaregiverData = async () => {
      try {
        const caregiverData = await getCaregiver(profile.id)
        setCurrentCaregiver(caregiverData)
        if (caregiverData?.permissions?.canManageTeam) {
          setActiveTab('caregivers')
        }
      } catch (error) {
        logger.error('Erreur chargement données aidant:', error)
      } finally {
        setIsLoadingCurrentCaregiver(false)
      }
    }

    loadCaregiverData()
  }, [profile?.id, userRole])

  // Charger les données de l'équipe
  useEffect(() => {
    if (!effectiveEmployerId) return

    let cancelled = false

    const loadData = async () => {
      setAuxiliariesError(null)
      setCaregiversError(null)

      const canViewAuxiliaries = isEmployer || currentCaregiver?.permissions?.canManageTeam
      const auxPromise = canViewAuxiliaries
        ? getAuxiliariesForEmployer(effectiveEmployerId)
        : Promise.resolve([])

      const [auxResult, caregiverResult, absencesResult, contractsResult] = await Promise.allSettled([
        auxPromise,
        getCaregiversForEmployer(effectiveEmployerId),
        getAbsencesForEmployer(effectiveEmployerId),
        getContractsForEmployer(effectiveEmployerId),
      ])

      if (cancelled) return

      if (auxResult.status === 'fulfilled') {
        let auxList = auxResult.value
        // Tag auxiliaries currently on leave
        if (absencesResult.status === 'fulfilled') {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const onLeaveIds = new Set(
            absencesResult.value
              .filter((a) => {
                if (a.status !== 'approved') return false
                const start = new Date(a.startDate)
                const end = new Date(a.endDate)
                start.setHours(0, 0, 0, 0)
                end.setHours(23, 59, 59, 999)
                return start <= today && end >= today
              })
              .map((a) => a.employeeId)
          )
          auxList = auxList.map((aux) => ({
            ...aux,
            isOnLeave: onLeaveIds.has(aux.id),
          }))
        }
        setAuxiliaries(auxList)
      } else {
        logger.error('Erreur chargement auxiliaires:', auxResult.reason)
        setAuxiliariesError('Impossible de charger les auxiliaires')
      }

      if (caregiverResult.status === 'fulfilled') {
        setCaregivers(caregiverResult.value)
      } else {
        logger.error('Erreur chargement aidants:', caregiverResult.reason)
        setCaregiversError('Impossible de charger les aidants familiaux')
      }

      // Mapper les contrats aidants par caregiverId
      if (contractsResult.status === 'fulfilled') {
        const map: Record<string, Contract> = {}
        for (const c of contractsResult.value) {
          if (c.caregiverId && c.contractCategory === 'caregiver_pch' && c.status === 'active') {
            map[c.caregiverId] = c
          }
        }
        setCaregiverContractMap(map)
      }

      setIsLoadingAuxiliaries(false)
      setIsLoadingCaregivers(false)
    }

    loadData()
    return () => { cancelled = true }
  }, [effectiveEmployerId, isEmployer, currentCaregiver?.permissions?.canManageTeam])

  const refreshAuxiliaries = () => {
    const canViewAuxiliaries = isEmployer || currentCaregiver?.permissions?.canManageTeam
    if (!effectiveEmployerId || !canViewAuxiliaries) return
    getAuxiliariesForEmployer(effectiveEmployerId)
      .then((data) => { setAuxiliariesError(null); setAuxiliaries(data) })
      .catch((err) => {
        logger.error('Erreur rafraîchissement auxiliaires:', err)
        setAuxiliariesError('Impossible de rafraîchir les auxiliaires')
      })
  }

  const refreshCaregivers = () => {
    if (!effectiveEmployerId) return
    getCaregiversForEmployer(effectiveEmployerId)
      .then((data) => { setCaregiversError(null); setCaregivers(data) })
      .catch((err) => {
        logger.error('Erreur rafraîchissement aidants:', err)
        setCaregiversError('Impossible de rafraîchir les aidants')
      })
  }

  const handleRemoveCaregiver = (caregiver: CaregiverWithProfile) => {
    setCaregiverToRemove(caregiver)
  }

  const cancelRemoveCaregiver = () => setCaregiverToRemove(null)

  const confirmRemoveCaregiver = async () => {
    if (!caregiverToRemove) return
    setIsRemoving(true)
    setRemoveError(null)
    try {
      await removeCaregiverFromEmployer(caregiverToRemove.profileId, caregiverToRemove.employerId)
      setCaregiverToRemove(null)
      refreshCaregivers()
    } catch (err) {
      logger.error('Erreur suppression aidant:', err)
      setRemoveError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      setCaregiverToRemove(null)
    } finally {
      setIsRemoving(false)
    }
  }

  // Computed
  const filteredAuxiliaries = auxiliaries.filter((aux) => {
    if (auxiliaryFilter === 'all') return true
    if (auxiliaryFilter === 'active') return aux.contractStatus === 'active' && !aux.isOnLeave
    if (auxiliaryFilter === 'on_leave') return aux.isOnLeave
    return aux.contractStatus !== 'active'
  })
  const onLeaveAuxCount = auxiliaries.filter((a) => a.isOnLeave).length
  const activeAuxCount = auxiliaries.filter((a) => a.contractStatus === 'active' && !a.isOnLeave).length
  const inactiveAuxCount = auxiliaries.filter((a) => a.contractStatus !== 'active').length

  return {
    profile,
    userRole,
    isEmployer,
    effectiveEmployerId,
    currentCaregiver,
    isLoadingCurrentCaregiver,
    auxiliaries,
    isLoadingAuxiliaries,
    auxiliariesError,
    auxiliaryFilter,
    setAuxiliaryFilter,
    filteredAuxiliaries,
    activeAuxCount,
    inactiveAuxCount,
    onLeaveAuxCount,
    isNewContractOpen,
    setIsNewContractOpen,
    selectedAuxiliary,
    setSelectedAuxiliary,
    refreshAuxiliaries,
    caregivers,
    isLoadingCaregivers,
    caregiversError,
    isAddCaregiverOpen,
    setIsAddCaregiverOpen,
    isNewCaregiverContractOpen,
    setIsNewCaregiverContractOpen,
    selectedCaregiver,
    setSelectedCaregiver,
    caregiverToRemove,
    isRemoving,
    removeError,
    handleRemoveCaregiver,
    confirmRemoveCaregiver,
    cancelRemoveCaregiver,
    refreshCaregivers,
    caregiverContractMap,
    activeTab,
    setActiveTab,
  }
}
