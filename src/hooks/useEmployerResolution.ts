import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getActiveEmployerIdForEmployee } from '@/services/contractService'
import { getCaregiver, getCaregiverEmployerId } from '@/services/caregiverService'
import { logger } from '@/lib/logger'
import type { CaregiverPermissions } from '@/types'

export interface EmployerResolutionResult {
  resolvedEmployerId: string | null
  caregiverPermissions: CaregiverPermissions | null
  isResolving: boolean
  accessDenied: boolean
}

interface UseEmployerResolutionOptions {
  requiredCaregiverPermission?: keyof CaregiverPermissions
}

/**
 * Résout l'`employerId` de référence pour l'utilisateur connecté, selon son rôle.
 *
 * | Rôle       | Source de l'employerId                                    |
 * |------------|-----------------------------------------------------------|
 * | employer   | Son propre `profile.id`                                   |
 * | employee   | `contracts.employer_id` du contrat actif                  |
 * | caregiver  | `caregivers.employer_id` + vérification de la permission  |
 *
 * @param options.requiredCaregiverPermission
 *   Permission à vérifier pour un aidant. Si absente ou false → `accessDenied = true`.
 *   Ex : `'canViewLiaison'`, `'canViewPlanning'`.
 *
 * @returns
 * - `resolvedEmployerId` — id de l'employeur (null si non résolu)
 * - `caregiverPermissions` — permissions complètes (null si non aidant)
 * - `isResolving` — true pendant la résolution asynchrone
 * - `accessDenied` — true si l'utilisateur n'a pas accès (pas de contrat, permission manquante)
 *
 * @example
 * // Dans une page accessible aux 3 rôles
 * const { resolvedEmployerId, isResolving, accessDenied } = useEmployerResolution({
 *   requiredCaregiverPermission: 'canViewLiaison',
 * })
 *
 * if (isResolving) return <Spinner />
 * if (accessDenied) return <AccessDeniedMessage />
 */
export function useEmployerResolution(
  options: UseEmployerResolutionOptions = {}
): EmployerResolutionResult {
  const { profile, isInitialized } = useAuth()
  const { requiredCaregiverPermission } = options

  const [resolvedEmployerId, setResolvedEmployerId] = useState<string | null>(null)
  const [caregiverPermissions, setCaregiverPermissions] = useState<CaregiverPermissions | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    async function resolveEmployer() {
      if (!profile) {
        setResolvedEmployerId(null)
        return
      }

      if (profile.role === 'employer') {
        setResolvedEmployerId(profile.id)
        return
      }

      if (profile.role === 'employee') {
        setIsResolving(true)
        try {
          const employerId = await getActiveEmployerIdForEmployee(profile.id)
          if (employerId) {
            setResolvedEmployerId(employerId)
          } else {
            setAccessDenied(true)
          }
        } catch {
          setAccessDenied(true)
        } finally {
          setIsResolving(false)
        }
        return
      }

      if (profile.role === 'caregiver') {
        setIsResolving(true)
        try {
          const caregiver = await getCaregiver(profile.id)

          if (!caregiver) {
            setAccessDenied(true)
            return
          }

          setCaregiverPermissions(caregiver.permissions)

          if (requiredCaregiverPermission && !caregiver.permissions[requiredCaregiverPermission]) {
            setAccessDenied(true)
            return
          }

          const empId = await getCaregiverEmployerId(profile.id)
          setResolvedEmployerId(empId)
        } catch (error) {
          logger.error('Erreur résolution employeur pour aidant:', error)
          setAccessDenied(true)
        } finally {
          setIsResolving(false)
        }
      }
    }

    if (profile && isInitialized) {
      resolveEmployer()
    }
  }, [profile, isInitialized, requiredCaregiverPermission])

  return { resolvedEmployerId, caregiverPermissions, isResolving, accessDenied }
}
