import { useEffect, useRef } from 'react'
import { getUpcomingShiftsForEmployee } from '@/services/shiftService'
import {
  getAlreadyNotifiedShiftIds,
  getProfileName,
  createShiftReminderNotification,
} from '@/services/notificationService'
import { logger } from '@/lib/logger'

/**
 * Hook qui crée des rappels de notification pour les shifts des prochaines 24h.
 * S'exécute une seule fois au montage du Dashboard.
 * Vérifie si un rappel existe déjà pour chaque shift (via data->shiftId).
 */
export function useShiftReminders(userId: string | undefined, role: string | undefined) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || !role || hasRun.current) return
    if (role !== 'employee') return // Seuls les auxiliaires reçoivent des rappels

    hasRun.current = true

    async function checkAndCreateReminders() {
      try {
        const now = new Date()
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayStr = now.toISOString().split('T')[0]
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        // 1. Récupérer les shifts des prochaines 24h
        const shifts = await getUpcomingShiftsForEmployee(userId!, todayStr, tomorrowStr)
        if (shifts.length === 0) return

        // 2. Vérifier quels rappels existent déjà
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const alreadyNotifiedShiftIds = await getAlreadyNotifiedShiftIds(userId!, since)

        // 3. Créer les rappels manquants
        for (const shift of shifts) {
          if (alreadyNotifiedShiftIds.has(shift.id)) continue
          if (!shift.contract) continue

          try {
            const employerName = await getProfileName(shift.contract.employer_id)
            await createShiftReminderNotification(
              userId!,
              employerName,
              new Date(shift.date),
              shift.start_time,
              shift.id
            )
          } catch {
            // Silently skip individual failures
          }
        }
      } catch (err) {
        logger.error('Erreur vérification rappels shifts:', err)
      }
    }

    checkAndCreateReminders()
  }, [userId, role])
}
